const { pool } = require('../config/db');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

// GET /api/events/:id/seats
const getSeatsForEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [event] = await pool.query('SELECT event_id FROM events WHERE event_id = ?', [id]);
  if (event.length === 0) throw new ApiError(404, 'Event not found.');

  await pool.query(
    `UPDATE seats
     SET status = 'AVAILABLE',
         locked_by = NULL,
         hold_expires_at = NULL
     WHERE event_id = ?
       AND status = 'LOCKED'
       AND hold_expires_at <= NOW()`,
    [id]
  );

  const [seats] = await pool.query(
    `SELECT seat_id, seat_row, seat_number, seat_class, price, status,
            locked_by, hold_expires_at
     FROM seats
     WHERE event_id = ?
     ORDER BY seat_row, seat_number`,
    [id]
  );

  res.json({ success: true, count: seats.length, data: seats });
});

// POST /api/events/:id/seats  (ADMIN) -- add extra seats to an event
const addSeats = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { seats } = req.body; // [{ row, number, seatClass, price }, ...]

  if (!Array.isArray(seats) || seats.length === 0) {
    throw new ApiError(400, 'Provide a non-empty seats array.');
  }

  const values = seats.map((s) => [id, s.row, s.number, s.seatClass || 'GENERAL', s.price, 'AVAILABLE']);
  await pool.query(
    `INSERT INTO seats (event_id, seat_row, seat_number, seat_class, price, status) VALUES ?`,
    [values]
  );

  res.status(201).json({ success: true, message: `${seats.length} seat(s) added.` });
});

// GET /api/admin/seats/:seatId -- lookup (used by admin seat management)
const updateSeat = asyncHandler(async (req, res) => {
  const { seatId } = req.params;
  const { price, seatClass, status } = req.body;

  const [result] = await pool.query(
    `UPDATE seats SET price = COALESCE(?, price), seat_class = COALESCE(?, seat_class),
     status = COALESCE(?, status) WHERE seat_id = ?`,
    [price, seatClass, status, seatId]
  );

  if (result.affectedRows === 0) throw new ApiError(404, 'Seat not found.');
  res.json({ success: true, message: 'Seat updated.' });
});

module.exports = { getSeatsForEvent, addSeats, updateSeat };
