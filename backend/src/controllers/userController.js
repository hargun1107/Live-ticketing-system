const { pool } = require('../config/db');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

// GET /api/users/:id  (self or admin)
const getUserById = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN' && Number(req.params.id) !== req.user.userId) {
    throw new ApiError(403, 'You can only view your own profile.');
  }

  const [rows] = await pool.query(
    'SELECT user_id, full_name, email, phone, role, created_at FROM users WHERE user_id = ?',
    [req.params.id]
  );
  if (rows.length === 0) throw new ApiError(404, 'User not found.');
  res.json({ success: true, data: rows[0] });
});

// PUT /api/users/:id  (self or admin) -- update profile
const updateUser = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN' && Number(req.params.id) !== req.user.userId) {
    throw new ApiError(403, 'You can only update your own profile.');
  }

  const { fullName, phone } = req.body;
  const [result] = await pool.query(
    'UPDATE users SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone) WHERE user_id = ?',
    [fullName, phone, req.params.id]
  );
  if (result.affectedRows === 0) throw new ApiError(404, 'User not found.');
  res.json({ success: true, message: 'Profile updated.' });
});

// GET /api/users/:id/bookings
const getUserBookings = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN' && Number(req.params.id) !== req.user.userId) {
    throw new ApiError(403, 'You can only view your own bookings.');
  }
  const [bookings] = await pool.query(
    'SELECT * FROM view_booking_details WHERE user_id = ? ORDER BY booked_at DESC',
    [req.params.id]
  );
  res.json({ success: true, count: bookings.length, data: bookings });
});

module.exports = { getUserById, updateUser, getUserBookings };
