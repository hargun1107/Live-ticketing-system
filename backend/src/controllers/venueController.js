const { pool } = require('../config/db');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

const getAllVenues = asyncHandler(async (req, res) => {
  const [venues] = await pool.query('SELECT * FROM venues ORDER BY name');
  res.json({ success: true, count: venues.length, data: venues });
});

const getVenueById = asyncHandler(async (req, res) => {
  const [venues] = await pool.query('SELECT * FROM venues WHERE venue_id = ?', [req.params.id]);
  if (venues.length === 0) throw new ApiError(404, 'Venue not found.');
  res.json({ success: true, data: venues[0] });
});

const createVenue = asyncHandler(async (req, res) => {
  const { name, address, city, state, capacity } = req.body;
  if (!name || !address || !city || !capacity) {
    throw new ApiError(400, 'name, address, city and capacity are required.');
  }
  const [result] = await pool.query(
    'INSERT INTO venues (name, address, city, state, capacity) VALUES (?, ?, ?, ?, ?)',
    [name, address, city, state || null, capacity]
  );
  res.status(201).json({ success: true, message: 'Venue created.', data: { venueId: result.insertId } });
});

const updateVenue = asyncHandler(async (req, res) => {
  const { name, address, city, state, capacity } = req.body;
  const [result] = await pool.query(
    `UPDATE venues SET name = COALESCE(?, name), address = COALESCE(?, address),
     city = COALESCE(?, city), state = COALESCE(?, state), capacity = COALESCE(?, capacity)
     WHERE venue_id = ?`,
    [name, address, city, state, capacity, req.params.id]
  );
  if (result.affectedRows === 0) throw new ApiError(404, 'Venue not found.');
  res.json({ success: true, message: 'Venue updated.' });
});

const deleteVenue = asyncHandler(async (req, res) => {
  const [result] = await pool.query('DELETE FROM venues WHERE venue_id = ?', [req.params.id]);
  if (result.affectedRows === 0) throw new ApiError(404, 'Venue not found.');
  res.json({ success: true, message: 'Venue deleted.' });
});

module.exports = { getAllVenues, getVenueById, createVenue, updateVenue, deleteVenue };
