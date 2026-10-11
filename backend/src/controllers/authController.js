const { pool } = require('../config/db');
const { hashPassword, comparePassword, generateToken } = require('../utils/authUtils');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { fullName, email, password, phone } = req.body;

  if (!fullName || !email || !password) {
    throw new ApiError(400, 'fullName, email and password are required.');
  }
  if (password.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters.');
  }

  const [existing] = await pool.query('SELECT user_id FROM users WHERE email = ?', [email]);
  if (existing.length > 0) {
    throw new ApiError(409, 'An account with this email already exists.');
  }

  const passwordHash = await hashPassword(password);

  const [result] = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, 'USER')`,
    [fullName, email, passwordHash, phone || null]
  );

  const user = {
    user_id: result.insertId,
    full_name: fullName,
    email,
    role: 'USER',
  };

  const token = generateToken(user);

  res.status(201).json({
    success: true,
    message: 'Registration successful.',
    data: { user, token },
  });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required.');
  }

  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  if (rows.length === 0) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  const user = rows[0];
  const isMatch = await comparePassword(password, user.password_hash);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  const token = generateToken(user);
  delete user.password_hash;

  res.json({
    success: true,
    message: 'Login successful.',
    data: { user, token },
  });
});

// POST /api/auth/logout
// Stateless JWT -- logout is handled client-side by discarding the
// token. This endpoint exists for a consistent API surface and so
// the frontend has something to call/await.
const logout = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully.' });
});

// GET /api/auth/me
const getCurrentUser = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    'SELECT user_id, full_name, email, phone, role, created_at FROM users WHERE user_id = ?',
    [req.user.userId]
  );
  if (rows.length === 0) {
    throw new ApiError(404, 'User not found.');
  }
  res.json({ success: true, data: rows[0] });
});

module.exports = { register, login, logout, getCurrentUser };
