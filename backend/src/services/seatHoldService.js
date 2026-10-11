
const { pool } = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');

const HOLD_DURATION_MINUTES = 5;

/**
 * Temporarily holds seats for a user.
 * The database transaction prevents conflicting hold requests
 * from succeeding for the same seat.
 */
async function createSeatHold({ userId, eventId, seatIds }) {
  if (!Array.isArray(seatIds) || seatIds.length === 0) {
    throw new ApiError(400, 'At least one seat must be selected.');
  }

  // Duplicate IDs could otherwise cause misleading validation results.
  const uniqueSeatIds = [...new Set(seatIds.map(Number))];

  if (
    uniqueSeatIds.some((id) => !Number.isInteger(id) || id <= 0) ||
    uniqueSeatIds.length !== seatIds.length
  ) {
    throw new ApiError(400, 'Seat selection contains invalid or duplicate IDs.');
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const placeholders = uniqueSeatIds.map(() => '?').join(',');

    // Lock rows while checking and updating their status.
    const [seats] = await connection.query(
      `SELECT seat_id, status, locked_by, hold_expires_at
       FROM seats
       WHERE seat_id IN (${placeholders}) AND event_id = ?
       ORDER BY seat_id
       FOR UPDATE`,
      [...uniqueSeatIds, eventId]
    );

    if (seats.length !== uniqueSeatIds.length) {
      throw new ApiError(400, 'One or more selected seats do not exist for this event.');
    }

    // Use the database clock to identify expired holds consistently.
    await connection.query(
      `UPDATE seats
       SET status = 'AVAILABLE', locked_by = NULL, hold_expires_at = NULL
       WHERE seat_id IN (${placeholders})
         AND status = 'LOCKED'
         AND hold_expires_at <= NOW()`,
      uniqueSeatIds
    );

    const [currentSeats] = await connection.query(
      `SELECT seat_id, status, locked_by, hold_expires_at
       FROM seats
       WHERE seat_id IN (${placeholders}) AND event_id = ?
       ORDER BY seat_id`,
      [...uniqueSeatIds, eventId]
    );

    const unavailable = currentSeats.filter((seat) => {
      if (seat.status === 'AVAILABLE') return false;

      // A user may renew their own still-valid hold.
      if (
        seat.status === 'LOCKED' &&
        Number(seat.locked_by) === Number(userId) &&
        seat.hold_expires_at &&
        new Date(seat.hold_expires_at).getTime() > Date.now()
      ) {
        return false;
      }

      return true;
    });

    if (unavailable.length > 0) {
      throw new ApiError(
        409,
        `Seat(s) ${unavailable.map((seat) => seat.seat_id).join(', ')} are unavailable. Please choose different seats.`
      );
    }

    await connection.query(
      `UPDATE seats
       SET status = 'LOCKED',
           locked_by = ?,
           hold_expires_at = DATE_ADD(NOW(), INTERVAL ${HOLD_DURATION_MINUTES} MINUTE)
       WHERE seat_id IN (${placeholders}) AND event_id = ?`,
      [userId, ...uniqueSeatIds, eventId]
    );

    const [holdRows] = await connection.query(
      `SELECT MIN(hold_expires_at) AS expiresAt
       FROM seats
       WHERE seat_id IN (${placeholders}) AND event_id = ?
         AND status = 'LOCKED' AND locked_by = ?`,
      [...uniqueSeatIds, eventId, userId]
    );

    await connection.commit();

    return {
      eventId: Number(eventId),
      seatIds: uniqueSeatIds,
      expiresAt: holdRows[0].expiresAt,
      durationMinutes: HOLD_DURATION_MINUTES,
    };
  } catch (err) {
    try {
      await connection.rollback();
    } catch (_) {}
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Releases only holds belonging to this user.
 */
async function releaseSeatHold({ userId, seatIds }) {
  if (!Array.isArray(seatIds) || seatIds.length === 0) {
    return { releasedCount: 0 };
  }

  const uniqueSeatIds = [...new Set(seatIds.map(Number))];

  if (uniqueSeatIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new ApiError(400, 'Invalid seat IDs.');
  }

  const placeholders = uniqueSeatIds.map(() => '?').join(',');

  const [result] = await pool.query(
    `UPDATE seats
     SET status = 'AVAILABLE', locked_by = NULL, hold_expires_at = NULL
     WHERE seat_id IN (${placeholders})
       AND status = 'LOCKED'
       AND locked_by = ?`,
    [...uniqueSeatIds, userId]
  );

  return { releasedCount: result.affectedRows };
}

module.exports = {
  createSeatHold,
  releaseSeatHold,
  HOLD_DURATION_MINUTES,
};
