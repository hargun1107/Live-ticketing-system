# StageOne — Live Ticketing System

A full-stack Database Systems course project: a live event ticketing
platform with real-time seat availability, transactional booking, and
an admin dashboard. Built by a team of 3.

**Status: ~80% complete and fully runnable.** Core flows (browse,
search, seat selection, atomic booking, cancellation, admin CRUD) all
work end-to-end against a real MySQL database. The remaining ~20% is
listed under [Future Features](#f-future-features-the-remaining-20).

---

## A. Project Tree

```
ticketing-system/
├── backend/
│   ├── src/
│   │   ├── config/db.js              # MySQL connection pool
│   │   ├── controllers/              # auth, event, venue, seat, booking, user, admin
│   │   ├── services/bookingService.js# transactional seat-locking logic
│   │   ├── middleware/               # auth.js, errorHandler.js
│   │   ├── routes/                   # one router per resource
│   │   └── utils/                    # authUtils.js, idGenerator.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/               # Navbar, EventCard, SeatMap, Modal, ...
│   │   ├── pages/                    # Home, Events, EventDetails, Booking, ...
│   │   ├── pages/admin/              # AdminDashboard, AdminEvents, ...
│   │   ├── context/AuthContext.jsx
│   │   ├── services/api.js           # single axios client
│   │   ├── App.jsx, main.jsx, index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── .env.example
├── database/
│   ├── schema.sql                    # tables, constraints, views, procedure, triggers
│   ├── seed.sql                      # realistic demo data
│   └── queries.sql                   # reference queries for the viva
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── API.md
│   └── CONTRIBUTING.md
└── README.md
```

## B. Exact Setup Commands

### 1. Database
```bash
mysql -u root -p < database/schema.sql
mysql -u root -p ticketing_system < database/seed.sql
```

### 2. Backend
```bash
cd backend
cp .env.example .env      # then edit DATABASE_PASSWORD, JWT_SECRET
npm install
npm run dev                # or: npm start
# API now running on http://localhost:5000
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env       # defaults to http://localhost:5000/api
npm install
npm run dev
# App now running on http://localhost:5173
```

### 4. Log in
- Demo user: `aditi@example.com` / `password123`
- Demo admin: `admin@ticketing.com` / `password123`
- Or register a new account.

> Note: the seeded password hashes in `seed.sql` are placeholders —
> if login fails against them, either register a fresh account (this
> always works, since it hashes the password you choose) or regenerate
> real bcrypt hashes for "password123" and replace them in `seed.sql`.

---

## C. Git Workflow for All 3 Developers

See [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) for full details.
Summary: `main` (stable) ← `development` (integration) ← `feature/*`
branches, one per area of ownership, PR into `development` with review.

## D. What Each Developer Should Work On

| Developer | Owns |
|---|---|
| **Dev 1** | Backend + APIs + Authentication (`authController`, `middleware/auth.js`, JWT, route wiring) |
| **Dev 2** | Frontend + UI/UX (`components/`, `pages/`, `index.css`, responsiveness, polish) |
| **Dev 3** | Database + Booking/Seat logic + Admin (`database/*`, `bookingService.js`, `adminController.js`) |

All three should be able to read and modify any part when needed —
the split above is a starting point, not a hard wall.

## E. Future Features (the remaining ~20%)

These are intentionally not implemented yet, so there's obvious room
to extend the project:

- Email confirmations for bookings
- QR-code tickets (encode `ticket_code` as a QR image)
- Wishlist / favorites
- Event reviews and ratings
- In-app notifications
- Discount coupons / promo codes
- Advanced analytics (charts on the admin dashboard)
- "You might also like" recommendation system
- Multiple ticket categories per seat class (e.g. early-bird pricing)
- Refund workflow (currently cancellation just releases the seat)
- Seat-hold timer (reserve a seat for N minutes during checkout)
- Dark mode
- Richer animations/transitions
- Improved mobile layout polish
- Real payment gateway integration (Razorpay/Stripe test mode)

## F. Database Concepts Demonstrated

- Primary/foreign keys, `UNIQUE`, `NOT NULL`, `CHECK` constraints
- Normalization to 3NF (see `docs/DATABASE.md`)
- Indexes, including a `FULLTEXT` index for search
- Multi-table `JOIN`s (2, 3, and 4-table joins)
- Aggregate functions with `GROUP BY` (revenue, seat counts)
- Correlated and scalar subqueries
- Views (`view_event_seat_availability`, `view_booking_details`, `view_event_revenue`)
- A stored procedure (`sp_create_booking`) encapsulating a transaction
- Triggers (`trg_bookings_cancel_release_seats`, `trg_seats_default_price`)
- **Transactions with row-level locking** (`SELECT ... FOR UPDATE`) to
  prevent double-booking under concurrency — see `docs/ARCHITECTURE.md`

## G. Testing Checklist

Manual checklist to run through before a demo:

- [ ] Register a new user
- [ ] Login with correct / incorrect credentials
- [ ] Browse events, search by keyword, filter by category/city/price/date
- [ ] Open an event, view the seat map
- [ ] Select seats, see the booking summary total update live
- [ ] Complete a booking (simulated payment)
- [ ] View the booking under "My Bookings"
- [ ] View individual ticket details
- [ ] Cancel a booking and confirm the seat becomes available again
- [ ] **Concurrency test**: open the same event in two browser tabs
      (two different logged-in users), select the *same* seat in both,
      and confirm only one booking succeeds while the other gets a
      clear "seat no longer available" error
- [ ] Login as admin, view dashboard stats
- [ ] Create, edit, and cancel an event as admin
- [ ] Create and edit a venue as admin
- [ ] View all bookings and all users as admin
- [ ] Confirm a normal user is blocked (403) from admin-only routes

## H. Files Each Developer Should Understand First

- `database/schema.sql` — the whole data model in one place
- `backend/src/services/bookingService.js` — the core transaction logic
- `backend/src/middleware/auth.js` — how auth/roles are enforced everywhere
- `frontend/src/services/api.js` — every API call the frontend makes
- `frontend/src/context/AuthContext.jsx` — how login state flows through the app
- `frontend/src/App.jsx` — the full route map

---

## Tech Stack

**Frontend:** React 18, Vite, plain CSS (custom properties), React Router, Axios
**Backend:** Node.js, Express.js, mysql2, JWT, bcryptjs
**Database:** MySQL 8.0+

## Further Reading

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system design and the booking-concurrency explanation
- [`docs/DATABASE.md`](docs/DATABASE.md) — full schema reference and ER diagram spec
- [`docs/API.md`](docs/API.md) — every endpoint, params, and response shape
- [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) — Git workflow for the team
