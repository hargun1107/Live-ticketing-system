# API Documentation

Base URL (local dev): `http://localhost:5000/api`

All request/response bodies are JSON. Protected routes require:

```
Authorization: Bearer <token>
```

Every response follows the shape:
```json
{ "success": true, "data": { ... } }
{ "success": false, "message": "..." }
```

---

## Auth

### POST /auth/register
Body: `{ "fullName", "email", "password", "phone"? }`
Returns: `{ user, token }` — 201

### POST /auth/login
Body: `{ "email", "password" }`
Returns: `{ user, token }` — 200

### POST /auth/logout
No body required. Stateless JWT — the frontend discards the token.

### GET /auth/me  (auth required)
Returns the current user's profile.

---

## Events

### GET /events
Query params (all optional): `search, category, city, minPrice, maxPrice, date, status`
Returns an array of events with venue + live seat-availability counts.

### GET /events/:id
Returns full event details + seat status breakdown.

### GET /events/:id/seats
Returns the full seat map for an event: `seat_id, seat_row, seat_number, seat_class, price, status`.

### POST /events  (ADMIN)
Body: `{ title, description?, category?, venueId, eventDate, startTime, endTime?, basePrice, bannerUrl?, generateSeats? }`
Creates an event. Unless `generateSeats: false`, an 8-row × 10-seat map (VIP/PREMIUM/GENERAL) is auto-generated.

### PUT /events/:id  (ADMIN)
Partial update — send only the fields you want to change.

### DELETE /events/:id  (ADMIN)
Soft-deletes by setting `status = 'CANCELLED'`.

### POST /events/:id/seats  (ADMIN)
Body: `{ seats: [{ row, number, seatClass?, price }, ...] }` — add extra seats to an event.

---

## Venues

### GET /venues, GET /venues/:id
Public.

### POST /venues, PUT /venues/:id, DELETE /venues/:id  (ADMIN)
Body: `{ name, address, city, state?, capacity }`

---

## Bookings  (all require auth)

### POST /bookings
Body: `{ eventId, seatIds: [1,2,3], paymentMethod? }`
Runs the atomic seat-locking transaction described in `docs/ARCHITECTURE.md`.
Returns `{ bookingId, bookingRef, totalAmount, seatCount }` — 201.
Returns **409** if any seat was booked by someone else in the meantime.

### GET /bookings
Current user's bookings (from `view_booking_details`).

### GET /bookings/:id
Full booking detail including seats, tickets, and payment. Owner or ADMIN only.

### DELETE /bookings/:id
Cancels a booking (owner or ADMIN). Triggers automatic seat release via the DB trigger.

---

## Users  (auth required)

### GET /users/:id, PUT /users/:id
Self or ADMIN only.

### GET /users/:id/bookings
Self or ADMIN only.

---

## Admin  (ADMIN role required)

### GET /admin/stats
Dashboard numbers: total users/events/bookings/tickets sold, revenue,
available seats, upcoming events, and top 5 events by revenue.

### GET /admin/users
All users.

### GET /admin/bookings
All bookings, optional `?status=CONFIRMED|CANCELLED|PENDING|FAILED`.

### PUT /admin/seats/:seatId
Body: `{ price?, seatClass?, status? }` — manual seat correction tool.

---

## Error codes used

| Code | Meaning |
|---|---|
| 400 | Bad request / validation failure |
| 401 | Missing/invalid/expired token |
| 403 | Authenticated but not authorized for this resource |
| 404 | Resource not found |
| 409 | Conflict — duplicate email, or seat no longer available |
| 500 | Unexpected server/database error |
