const { pool } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/admin/stats
const getStats = asyncHandler(async (req, res) => {
  const [[userCount]] = await pool.query(`SELECT COUNT(*) AS count FROM users WHERE role = 'USER'`);
  const [[eventCount]] = await pool.query(`SELECT COUNT(*) AS count FROM events WHERE status != 'CANCELLED'`);
  const [[bookingCount]] = await pool.query(`SELECT COUNT(*) AS count FROM bookings WHERE status = 'CONFIRMED'`);
  const [[ticketCount]] = await pool.query(`SELECT COUNT(*) AS count FROM tickets WHERE status = 'VALID'`);
  const [[revenue]] = await pool.query(`SELECT COALESCE(SUM(total_amount), 0) AS total FROM bookings WHERE status = 'CONFIRMED'`);
  const [[availableSeats]] = await pool.query(`SELECT COUNT(*) AS count FROM seats WHERE status = 'AVAILABLE'`);
  const [[upcomingEvents]] = await pool.query(`SELECT COUNT(*) AS count FROM events WHERE status = 'UPCOMING' AND event_date >= CURDATE()`);

  const [topEvents] = await pool.query(
    `SELECT * FROM view_event_revenue ORDER BY revenue DESC LIMIT 5`
  );

  res.json({
    success: true,
    data: {
      totalUsers: userCount.count,
      totalEvents: eventCount.count,
      totalBookings: bookingCount.count,
      totalTicketsSold: ticketCount.count,
      totalRevenue: revenue.total,
      availableSeats: availableSeats.count,
      upcomingEvents: upcomingEvents.count,
      topEvents,
    },
  });
});

// GET /api/admin/users
const getAllUsers = asyncHandler(async (req, res) => {
  const [users] = await pool.query(
    `SELECT user_id, full_name, email, phone, role, created_at FROM users ORDER BY created_at DESC`
  );
  res.json({ success: true, count: users.length, data: users });
});

// GET /api/admin/bookings
const getAllBookings = asyncHandler(async (req, res) => {
  const { status } = req.query;
  let query = 'SELECT * FROM view_booking_details';
  const params = [];
  if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }
  query += ' ORDER BY booked_at DESC';
  const [bookings] = await pool.query(query, params);
  res.json({ success: true, count: bookings.length, data: bookings });
});

module.exports = { getStats, getAllUsers, getAllBookings };
