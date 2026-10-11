# Architecture

## Overview

The Live Ticketing System is a three-tier application:

```
┌─────────────────┐      REST/JSON       ┌──────────────────┐      SQL       ┌──────────────┐
│   React (Vite)   │ ───────────────────> │  Express.js API   │ ─────────────> │    MySQL     │
│   Frontend       │ <─────────────────── │  Backend          │ <───────────── │   Database   │
└─────────────────┘                      └──────────────────┘                └──────────────┘
```

- **Frontend**: React + Vite SPA. Talks only to the backend's REST API — never to the database directly.
- **Backend**: Express.js REST API. Owns all business logic, authentication, and database access.
- **Database**: MySQL. Owns data integrity via constraints, and the seat-booking concurrency guarantee via transactions + row locks.

## Backend layering

```
routes/        -> defines URL -> controller mapping, applies auth middleware
controllers/   -> parses request, calls services/DB, shapes the response
services/      -> business logic that spans multiple queries (e.g. bookingService)
middleware/    -> authenticate, authorize, centralized error handling
config/        -> database connection pool
utils/         -> small stateless helpers (hashing, ID generation)
```

Controllers talk to the database directly for simple CRUD (single-table
reads/writes). Anything that needs a transaction or multi-step logic
(booking creation, cancellation) is pulled into `services/bookingService.js`
so the transactional logic lives in exactly one place.

## Authentication flow

1. `POST /api/auth/register` or `/login` returns a JWT signed with `JWT_SECRET`.
2. The frontend stores the JWT in `localStorage` and attaches it as
   `Authorization: Bearer <token>` on every request (see `frontend/src/services/api.js`).
3. `middleware/auth.js#authenticate` verifies the token and attaches
   `{ userId, role, email }` to `req.user`.
4. `middleware/auth.js#authorize('ADMIN')` restricts a route to a role.

Authentication logic is not duplicated anywhere else — every protected
route goes through the same two middleware functions.

## The seat-booking concurrency problem

The hardest requirement in this project is: **two users must never be
able to successfully book the same seat.**

This is solved with a **row-level lock inside a database transaction**,
implemented in `backend/src/services/bookingService.js#createBooking`:

1. Open a dedicated connection from the pool and `BEGIN TRANSACTION`.
2. `SELECT ... FOR UPDATE` on exactly the seat rows the user wants to
   buy. In InnoDB this takes an exclusive lock on those rows. If another
   transaction already holds the lock (because it's mid-booking on the
   same seat), this query **blocks** until that transaction commits or
   rolls back.
3. Once the lock is acquired, re-check every seat's `status` column.
   If any seat is no longer `'AVAILABLE'` (because the transaction we
   just waited on booked it), `ROLLBACK` and return a 409 error.
4. Otherwise, insert the booking, `booking_seats`, `tickets`, and
   `payments` rows, flip the seats to `'BOOKED'`, and `COMMIT`.
5. Any unexpected error triggers a `ROLLBACK` in the `catch` block, so
   the database is never left in a half-updated state.

The same pattern is also implemented purely in SQL as the stored
procedure `sp_create_booking` in `database/schema.sql`, for a
viva-friendly demonstration that doesn't depend on the Node.js layer.

A `UNIQUE` constraint on `booking_seats.seat_id` is a second, independent
safety net: even if the application-level lock were somehow bypassed,
the database itself refuses to let the same seat be inserted into
`booking_seats` twice.

## Cancellation flow

Cancelling a booking only needs to update `bookings.status`. The
`trg_bookings_cancel_release_seats` trigger (in `schema.sql`) then
automatically:
- flips the booking's seats back to `'AVAILABLE'`
- marks the booking's tickets `'CANCELLED'`

This keeps seat availability consistent no matter which part of the
application changes a booking's status, instead of relying on every
caller to remember to also update seats and tickets.

## Frontend structure

```
src/
  components/   -> reusable, mostly presentational pieces (Navbar, SeatMap, Modal...)
  pages/        -> one file per route, composes components + API calls
  pages/admin/  -> admin-only pages, gated by ProtectedRoute adminOnly
  context/      -> AuthContext (current user, login/register/logout)
  services/     -> api.js, the single axios client + endpoint functions
```

State is kept simple on purpose: React's built-in `useState`/`useEffect`
plus one context (`AuthContext`) is enough for a project this size —
no Redux/Zustand needed, which keeps it easy to explain and extend.
