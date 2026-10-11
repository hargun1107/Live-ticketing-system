
const { pool } = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const {
  generateBookingRef,
  generateTicketCode,
  generateTransactionRef,
} = require('../utils/idGenerator');

async function createBooking({ userId, eventId, seatIds, paymentMethod }) {
  if (!Array.isArray(seatIds) || seatIds.length === 0) {
    throw new ApiError(400, 'At least one seat must be selected.');
  }

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

    const [seats] = await connection.query(
      `SELECT seat_id, price, status, locked_by, hold_expires_at
       FROM seats
       WHERE seat_id IN (${placeholders}) AND event_id = ?
       ORDER BY seat_id
       FOR UPDATE`,
      [...uniqueSeatIds, eventId]
    );

    if (seats.length !== uniqueSeatIds.length) {
      throw new ApiError(
        400,
        'One or more selected seats do not exist for this event.'
      );
    }

    // Check hold ownership and expiry using the database clock.
    const [holdCheck] = await connection.query(
      `SELECT seat_id
       FROM seats
       WHERE seat_id IN (${placeholders})
         AND event_id = ?
         AND status = 'LOCKED'
         AND locked_by = ?
         AND hold_expires_at > NOW()`,
      [...uniqueSeatIds, eventId, userId]
    );

    if (holdCheck.length !== uniqueSeatIds.length) {
      throw new ApiError(
        409,
        'Your seat hold is missing or has expired. Please select your seats again.'
      );
    }

    const totalAmount = seats.reduce(
      (sum, seat) => sum + Number(seat.price),
      0
    );

    const bookingRef = generateBookingRef();

    const [bookingResult] = await connection.query(
      `INSERT INTO bookings
         (booking_ref, user_id, event_id, total_amount, status)
       VALUES (?, ?, ?, ?, 'CONFIRMED')`,
      [bookingRef, userId, eventId, totalAmount]
    );

    const bookingId = bookingResult.insertId;

    const bookingSeatValues = seats.map((seat) => [
      bookingId,
      seat.seat_id,
      seat.price,
    ]);

    await connection.query(
      `INSERT INTO booking_seats (booking_id, seat_id, price)
       VALUES ?`,
      [bookingSeatValues]
    );

    await connection.query(
      `UPDATE seats
       SET status = 'BOOKED',
           locked_by = NULL,
           hold_expires_at = NULL
       WHERE seat_id IN (${placeholders})
         AND event_id = ?
         AND status = 'LOCKED'
         AND locked_by = ?`,
      [...uniqueSeatIds, eventId, userId]
    );

    const ticketValues = seats.map((seat) => [
      generateTicketCode(bookingId, seat.seat_id),
      bookingId,
      seat.seat_id,
      eventId,
    ]);

    await connection.query(
      `INSERT INTO tickets (ticket_code, booking_id, seat_id, event_id)
       VALUES ?`,
      [ticketValues]
    );

    await connection.query(
      `INSERT INTO payments
         (booking_id, amount, method, status, transaction_ref)
       VALUES (?, ?, ?, 'SUCCESS', ?)`,
      [
        bookingId,
        totalAmount,
        paymentMethod || 'CARD',
        generateTransactionRef(),
      ]
    );

    await connection.commit();

    return {
      bookingId,
      bookingRef,
      totalAmount,
      seatCount: seats.length,
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

async function cancelBooking({ bookingId, userId, isAdmin }) {
  const [rows] = await pool.query(
    'SELECT * FROM bookings WHERE booking_id = ?',
    [bookingId]
  );

  if (rows.length === 0) {
    throw new ApiError(404, 'Booking not found.');
  }

  const booking = rows[0];

  if (!isAdmin && Number(booking.user_id) !== Number(userId)) {
    throw new ApiError(403, 'You can only cancel your own bookings.');
  }

  if (booking.status === 'CANCELLED') {
    throw new ApiError(400, 'Booking is already cancelled.');
  }

  const [eventRows] = await pool.query(
    'SELECT event_date FROM events WHERE event_id = ?',
    [booking.event_id]
  );

  if (
    eventRows.length &&
    new Date(eventRows[0].event_date) < new Date()
  ) {
    throw new ApiError(
      400,
      'Cannot cancel a booking for an event that has already occurred.'
    );
  }

  await pool.query(
    `UPDATE bookings
     SET status = 'CANCELLED', cancelled_at = NOW()
     WHERE booking_id = ?`,
    [bookingId]
  );

  return { bookingId, status: 'CANCELLED' };
}

module.exports = { createBooking, cancelBooking };
