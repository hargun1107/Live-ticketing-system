const { pool } = require('../config/db');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

// GET /api/events
// Supports: ?search=&category=&city=&minPrice=&maxPrice=&date=&status=
const getAllEvents = asyncHandler(async (req, res) => {
  const { search, category, city, minPrice, maxPrice, date, status } = req.query;

  let query = `
    SELECT e.event_id, e.title, e.description, e.category, e.event_date, e.start_time,
           e.end_time, e.base_price, e.status, e.banner_url,
           v.venue_id, v.name AS venue_name, v.city, v.state,
           COALESCE(a.available_seats, 0) AS available_seats,
           COALESCE(a.total_seats, 0) AS total_seats
    FROM events e
    JOIN venues v ON v.venue_id = e.venue_id
    LEFT JOIN view_event_seat_availability a ON a.event_id = e.event_id
    WHERE 1 = 1
  `;
  const params = [];

  if (search) {
    query += ' AND (e.title LIKE ? OR e.description LIKE ? OR v.name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (category) {
    query += ' AND e.category = ?';
    params.push(category);
  }
  if (city) {
    query += ' AND v.city = ?';
    params.push(city);
  }
  if (minPrice) {
    query += ' AND e.base_price >= ?';
    params.push(Number(minPrice));
  }
  if (maxPrice) {
    query += ' AND e.base_price <= ?';
    params.push(Number(maxPrice));
  }
  if (date) {
    query += ' AND e.event_date = ?';
    params.push(date);
  }
  if (status) {
    query += ' AND e.status = ?';
    params.push(status);
  } else {
    query += " AND e.status != 'CANCELLED'";
  }

  query += ' ORDER BY e.event_date ASC';

  const [events] = await pool.query(query, params);
  res.json({ success: true, count: events.length, data: events });
});

// GET /api/events/:id
const getEventById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [events] = await pool.query(
    `SELECT e.*, v.name AS venue_name, v.address, v.city, v.state, v.capacity
     FROM events e
     JOIN venues v ON v.venue_id = e.venue_id
     WHERE e.event_id = ?`,
    [id]
  );

  if (events.length === 0) {
    throw new ApiError(404, 'Event not found.');
  }

  const [seatStats] = await pool.query(
    `SELECT status, COUNT(*) AS count FROM seats WHERE event_id = ? GROUP BY status`,
    [id]
  );

  res.json({ success: true, data: { ...events[0], seatStats } });
});

// POST /api/events  (ADMIN)
const createEvent = asyncHandler(async (req, res) => {
  const {
    title, description, category, venueId, eventDate,
    startTime, endTime, basePrice, bannerUrl, generateSeats,
  } = req.body;

  if (!title || !venueId || !eventDate || !startTime || !basePrice) {
    throw new ApiError(400, 'title, venueId, eventDate, startTime and basePrice are required.');
  }

  const [result] = await pool.query(
    `INSERT INTO events (title, description, category, venue_id, event_date, start_time, end_time, base_price, banner_url, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, description || null, category || 'OTHER', venueId, eventDate, startTime, endTime || null, basePrice, bannerUrl || null, req.user.userId]
  );

  const eventId = result.insertId;

  // Optionally auto-generate an 8-row x 10-seat layout (VIP/PREMIUM/GENERAL)
  if (generateSeats !== false) {
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const seatValues = [];
    rows.forEach((row, idx) => {
      const seatClass = idx < 2 ? 'VIP' : idx < 4 ? 'PREMIUM' : 'GENERAL';
      const multiplier = idx < 2 ? 2.5 : idx < 4 ? 1.5 : 1;
      for (let n = 1; n <= 10; n++) {
        seatValues.push([eventId, row, n, seatClass, Number(basePrice) * multiplier, 'AVAILABLE']);
      }
    });
    await pool.query(
      `INSERT INTO seats (event_id, seat_row, seat_number, seat_class, price, status) VALUES ?`,
      [seatValues]
    );
  }

  res.status(201).json({ success: true, message: 'Event created.', data: { eventId } });
});

// PUT /api/events/:id  (ADMIN)
const updateEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const fields = ['title', 'description', 'category', 'venue_id', 'event_date', 'start_time', 'end_time', 'base_price', 'status', 'banner_url'];
  const bodyKeyMap = {
    venue_id: 'venueId', event_date: 'eventDate', start_time: 'startTime',
    end_time: 'endTime', base_price: 'basePrice', banner_url: 'bannerUrl',
  };

  const updates = [];
  const params = [];
  fields.forEach((field) => {
    const bodyKey = bodyKeyMap[field] || field;
    if (req.body[bodyKey] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(req.body[bodyKey]);
    }
  });

  if (updates.length === 0) {
    throw new ApiError(400, 'No valid fields provided to update.');
  }

  params.push(id);
  const [result] = await pool.query(`UPDATE events SET ${updates.join(', ')} WHERE event_id = ?`, params);

  if (result.affectedRows === 0) {
    throw new ApiError(404, 'Event not found.');
  }

  res.json({ success: true, message: 'Event updated.' });
});

// DELETE /api/events/:id  (ADMIN) -- soft delete via status = CANCELLED
const deleteEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [result] = await pool.query(`UPDATE events SET status = 'CANCELLED' WHERE event_id = ?`, [id]);

  if (result.affectedRows === 0) {
    throw new ApiError(404, 'Event not found.');
  }

  res.json({ success: true, message: 'Event cancelled.' });
});

module.exports = { getAllEvents, getEventById, createEvent, updateEvent, deleteEvent };
