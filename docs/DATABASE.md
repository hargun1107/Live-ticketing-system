# Database Documentation

Database: `ticketing_system` (MySQL 8.0+, InnoDB, utf8mb4)

## ER Diagram (textual specification)

Import this into [dbdiagram.io](https://dbdiagram.io) or draw.io if you want a rendered diagram.

```
users ||--o{ bookings        : "places"
users ||--o{ events          : "created_by (admin)"
venues ||--o{ events         : "hosts"
events ||--o{ seats          : "has"
events ||--o{ bookings       : "sold via"
bookings ||--o{ booking_seats: "contains"
seats ||--o| booking_seats   : "sold as"
bookings ||--o{ tickets      : "issues"
seats ||--o| tickets         : "identified by"
bookings ||--|| payments     : "paid via"
```

Cardinality summary:
- One **user** can place many **bookings** (1:N)
- One **venue** hosts many **events** (1:N)
- One **event** has many **seats** (1:N) and many **bookings** (1:N)
- One **booking** contains many **seats** via `booking_seats` (M:N between bookings and seats, resolved by the junction table)
- One **seat** appears in at most one `booking_seats` row at a time (enforced by `UNIQUE(seat_id)`)
- One **booking** has many **tickets** (1:N, one ticket per seat)
- One **booking** has exactly one **payment** (1:1 for this project's scope)

## Tables

### users
| Column | Type | Constraints |
|---|---|---|
| user_id | INT | PK, AUTO_INCREMENT |
| full_name | VARCHAR(100) | NOT NULL |
| email | VARCHAR(150) | NOT NULL, UNIQUE |
| password_hash | VARCHAR(255) | NOT NULL (bcrypt) |
| phone | VARCHAR(20) | |
| role | ENUM('USER','ADMIN') | NOT NULL, DEFAULT 'USER' |
| created_at / updated_at | TIMESTAMP | auto-managed |

### venues
| Column | Type | Constraints |
|---|---|---|
| venue_id | INT | PK, AUTO_INCREMENT |
| name, address, city, state | VARCHAR | name/address/city NOT NULL |
| capacity | INT | NOT NULL, CHECK > 0 |

### events
| Column | Type | Constraints |
|---|---|---|
| event_id | INT | PK, AUTO_INCREMENT |
| title | VARCHAR(200) | NOT NULL |
| category | ENUM(...) | NOT NULL, DEFAULT 'OTHER' |
| venue_id | INT | FK -> venues, RESTRICT on delete |
| event_date | DATE | NOT NULL |
| start_time / end_time | TIME | start NOT NULL |
| base_price | DECIMAL(10,2) | CHECK >= 0 |
| status | ENUM(...) | DEFAULT 'UPCOMING' |
| created_by | INT | FK -> users, SET NULL on delete |

### seats
| Column | Type | Constraints |
|---|---|---|
| seat_id | INT | PK, AUTO_INCREMENT |
| event_id | INT | FK -> events, CASCADE on delete |
| seat_row, seat_number | VARCHAR/INT | UNIQUE together with event_id |
| seat_class | ENUM('GENERAL','PREMIUM','VIP') | |
| price | DECIMAL(10,2) | CHECK >= 0 |
| status | ENUM('AVAILABLE','LOCKED','BOOKED') | DEFAULT 'AVAILABLE' |

### bookings
| Column | Type | Constraints |
|---|---|---|
| booking_id | INT | PK |
| booking_ref | VARCHAR(20) | UNIQUE |
| user_id, event_id | INT | FKs |
| total_amount | DECIMAL(10,2) | CHECK >= 0 |
| status | ENUM('PENDING','CONFIRMED','CANCELLED','FAILED') | |

### booking_seats (junction table)
| Column | Type | Constraints |
|---|---|---|
| booking_seat_id | INT | PK |
| booking_id | INT | FK -> bookings, CASCADE |
| seat_id | INT | FK -> seats, RESTRICT, **UNIQUE** |
| price | DECIMAL(10,2) | price at time of booking |

The `UNIQUE(seat_id)` constraint is what makes it *impossible* for the
same seat to belong to two different bookings, independent of any
application-level logic.

### tickets
One row per booked seat; `ticket_code` is unique and used to look up
an individual ticket in `/tickets/:id`.

### payments
One row per booking; stores only a simulated `transaction_ref`,
`method`, and `amount` — **no real card data is ever stored**.

## Normalization

The schema is in **3NF**:
- 1NF: every column holds a single atomic value (no comma-separated lists).
- 2NF: every non-key column depends on the *whole* primary key (all
  tables use a single-column surrogate key, so partial dependency is
  not possible).
- 3NF: no transitive dependencies -- e.g. `venue city` is not repeated
  in `events`, it's looked up via `venue_id`; seat `price` in
  `booking_seats` is a deliberate, documented exception (it records
  the price *at the time of purchase*, which must be preserved even if
  the seat's current price changes later -- a classic "historical
  snapshot" column, not a normalization violation).

## Views

- `view_event_seat_availability` — total/available/booked seat counts per event.
- `view_booking_details` — booking joined with user, event, and venue for display.
- `view_event_revenue` — bookings and revenue aggregated per event.

## Stored procedure

- `sp_create_booking(user_id, event_id, seat_ids, booking_ref, OUT booking_id, OUT status_msg)` —
  SQL-only implementation of the atomic booking flow, usable directly
  in a `mysql` shell for a viva demo without going through the API.

## Triggers

- `trg_bookings_cancel_release_seats` — on a booking's status changing
  to `CANCELLED`, frees its seats and cancels its tickets.
- `trg_seats_default_price` — defends against an accidental `price = 0`
  insert by falling back to the event's `base_price`.

## Indexes

Indexes are placed on every foreign key and on columns used in
`WHERE`/`ORDER BY` in the API's hot paths: `events(category, event_date,
status, venue_id)`, `seats(event_id, status)`, `bookings(user_id,
event_id, status)`. A `FULLTEXT` index on `events(title, description)`
backs the search endpoint.
