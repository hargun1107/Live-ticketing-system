const { pool } = require('../config/db');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const bookingService = require('../services/bookingService');

// POST /api/bookings
const createBooking = asyncHandler(async (req, res) => {
  const { eventId, seatIds, paymentMethod } = req.body;

  if (!eventId || !seatIds) {
    throw new ApiError(400, 'eventId and seatIds are required.');
  }

  const result = await bookingService.createBooking({
    userId: req.user.userId,
    eventId,
    seatIds,
    paymentMethod,
  });

  res.status(201).json({ success: true, message: 'Booking confirmed.', data: result });
});

// GET /api/bookings  (current user's bookings)
const getMyBookings = asyncHandler(async (req, res) => {
  const [bookings] = await pool.query(
    `SELECT * FROM view_booking_details WHERE user_id = ? ORDER BY booked_at DESC`,
    [req.user.userId]
  );
  res.json({ success: true, count: bookings.length, data: bookings });
});

// GET /api/bookings/:id
const getBookingById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [bookings] = await pool.query('SELECT * FROM view_booking_details WHERE booking_id = ?', [id]);
  if (bookings.length === 0) throw new ApiError(404, 'Booking not found.');

  const booking = bookings[0];
  if (req.user.role !== 'ADMIN' && booking.user_id !== req.user.userId) {
    throw new ApiError(403, 'You do not have access to this booking.');
  }

  const [seats] = await pool.query(
    `SELECT s.seat_row, s.seat_number, s.seat_class, bs.price, t.ticket_code, t.status AS ticket_status
     FROM booking_seats bs
     JOIN seats s ON s.seat_id = bs.seat_id
     LEFT JOIN tickets t ON t.seat_id = bs.seat_id AND t.booking_id = bs.booking_id
     WHERE bs.booking_id = ?`,
    [id]
  );

  const [payment] = await pool.query('SELECT * FROM payments WHERE booking_id = ?', [id]);

  res.json({ success: true, data: { ...booking, seats, payment: payment[0] || null } });
});

// DELETE /api/bookings/:id  (cancel)
const cancelBooking = asyncHandler(async (req, res) => {
  const result = await bookingService.cancelBooking({
    bookingId: req.params.id,
    userId: req.user.userId,
    isAdmin: req.user.role === 'ADMIN',
  });
  res.json({ success: true, message: 'Booking cancelled.', data: result });
});

module.exports = { createBooking, getMyBookings, getBookingById, cancelBooking };
