-- =====================================================================
-- LIVE TICKETING SYSTEM - DATABASE SCHEMA
-- Database Systems Course Project
-- =====================================================================
-- Engine: MySQL 8.0+
-- Run:  mysql -u root -p < schema.sql
-- =====================================================================

DROP DATABASE IF EXISTS ticketing_system;
CREATE DATABASE ticketing_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ticketing_system;

-- =====================================================================
-- TABLE: users
-- Stores both regular users and admins (role-based).
-- =====================================================================
CREATE TABLE users (
    user_id         INT AUTO_INCREMENT PRIMARY KEY,
    full_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    phone           VARCHAR(20),
    role            ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_email_format CHECK (email LIKE '%_@_%._%')
) ENGINE=InnoDB;

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- =====================================================================
-- TABLE: venues
-- =====================================================================
CREATE TABLE venues (
    venue_id        INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    address         VARCHAR(255) NOT NULL,
    city            VARCHAR(100) NOT NULL,
    state           VARCHAR(100),
    capacity        INT NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_capacity CHECK (capacity > 0)
) ENGINE=InnoDB;

CREATE INDEX idx_venues_city ON venues(city);

-- =====================================================================
-- TABLE: events
-- =====================================================================
CREATE TABLE events (
    event_id        INT AUTO_INCREMENT PRIMARY KEY,
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    category        ENUM('MUSIC', 'SPORTS', 'THEATRE', 'COMEDY', 'CONFERENCE', 'OTHER') NOT NULL DEFAULT 'OTHER',
    venue_id        INT NOT NULL,
    event_date      DATE NOT NULL,
    start_time      TIME NOT NULL,
    end_time        TIME,
    base_price      DECIMAL(10,2) NOT NULL,
    status          ENUM('UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'UPCOMING',
    banner_url      VARCHAR(500),
    created_by      INT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_events_venue FOREIGN KEY (venue_id) REFERENCES venues(venue_id) ON DELETE RESTRICT,
    CONSTRAINT fk_events_creator FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT chk_base_price CHECK (base_price >= 0)
) ENGINE=InnoDB;

CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_venue ON events(venue_id);
CREATE FULLTEXT INDEX idx_events_search ON events(title, description);

-- =====================================================================
-- TABLE: seats
-- Every seat belongs to one event (seat layout is generated per event
-- from the venue capacity). Status is the single source of truth for
-- availability and is what the booking transaction locks on.
-- =====================================================================
CREATE TABLE seats (
    seat_id         INT AUTO_INCREMENT PRIMARY KEY,
    event_id        INT NOT NULL,
    seat_row        VARCHAR(5) NOT NULL,
    seat_number     INT NOT NULL,
    seat_class      ENUM('GENERAL', 'PREMIUM', 'VIP') NOT NULL DEFAULT 'GENERAL',
    price           DECIMAL(10,2) NOT NULL,
    status          ENUM('AVAILABLE', 'LOCKED', 'BOOKED') NOT NULL DEFAULT 'AVAILABLE',
    locked_by       INT NULL,
    hold_expires_at DATETIME NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_seats_event FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    CONSTRAINT fk_seats_locked_by FOREIGN KEY (locked_by) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT uq_seat_per_event UNIQUE (event_id, seat_row, seat_number),
    CONSTRAINT chk_seat_price CHECK (price >= 0)
) ENGINE=InnoDB;

CREATE INDEX idx_seats_event_status ON seats(event_id, status);

-- =====================================================================
-- TABLE: bookings
-- One booking = one checkout transaction, can contain multiple seats.
-- =====================================================================
CREATE TABLE bookings (
    booking_id      INT AUTO_INCREMENT PRIMARY KEY,
    booking_ref     VARCHAR(20) NOT NULL UNIQUE,
    user_id         INT NOT NULL,
    event_id        INT NOT NULL,
    total_amount    DECIMAL(10,2) NOT NULL,
    status          ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    booked_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cancelled_at    TIMESTAMP NULL,
    CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_bookings_event FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE RESTRICT,
    CONSTRAINT chk_total_amount CHECK (total_amount >= 0)
) ENGINE=InnoDB;

CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_event ON bookings(event_id);
CREATE INDEX idx_bookings_status ON bookings(status);

-- =====================================================================
-- TABLE: booking_seats  (junction: which seats belong to which booking)
-- =====================================================================
CREATE TABLE booking_seats (
    booking_seat_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id      INT NOT NULL,
    seat_id         INT NOT NULL,
    price           DECIMAL(10,2) NOT NULL,
    CONSTRAINT fk_bs_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
    CONSTRAINT fk_bs_seat FOREIGN KEY (seat_id) REFERENCES seats(seat_id) ON DELETE RESTRICT,
    CONSTRAINT uq_booking_seat_pair UNIQUE (booking_id, seat_id)
) ENGINE=InnoDB;

-- Note: a seat may appear in multiple historical bookings over time after
-- cancellation, but only once within any individual booking. The current
-- seat status and booking transaction prevent overlapping active bookings.

-- =====================================================================
-- TABLE: tickets
-- One ticket is generated per booked seat.
-- =====================================================================
CREATE TABLE tickets (
    ticket_id       INT AUTO_INCREMENT PRIMARY KEY,
    ticket_code     VARCHAR(30) NOT NULL UNIQUE,
    booking_id      INT NOT NULL,
    seat_id         INT NOT NULL,
    event_id        INT NOT NULL,
    issued_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status          ENUM('VALID', 'CANCELLED', 'USED') NOT NULL DEFAULT 'VALID',
    CONSTRAINT fk_tickets_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
    CONSTRAINT fk_tickets_seat FOREIGN KEY (seat_id) REFERENCES seats(seat_id) ON DELETE RESTRICT,
    CONSTRAINT fk_tickets_event FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX idx_tickets_booking ON tickets(booking_id);

-- =====================================================================
-- TABLE: payments
-- Simulated payment record; no real card data is ever stored.
-- =====================================================================
CREATE TABLE payments (
    payment_id      INT AUTO_INCREMENT PRIMARY KEY,
    booking_id      INT NOT NULL,
    amount          DECIMAL(10,2) NOT NULL,
    method          ENUM('CARD', 'UPI', 'NETBANKING', 'WALLET') NOT NULL,
    status          ENUM('SUCCESS', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'SUCCESS',
    transaction_ref VARCHAR(50) NOT NULL UNIQUE,
    paid_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
    CONSTRAINT chk_payment_amount CHECK (amount >= 0)
) ENGINE=InnoDB;

CREATE INDEX idx_payments_booking ON payments(booking_id);

-- =====================================================================
-- VIEWS
-- =====================================================================

-- View: available seat counts per event (used on event listing/details)
CREATE OR REPLACE VIEW view_event_seat_availability AS
SELECT
    e.event_id,
    e.title,
    e.event_date,
    COUNT(s.seat_id)                                   AS total_seats,
    SUM(CASE WHEN s.status = 'AVAILABLE' THEN 1 ELSE 0 END) AS available_seats,
    SUM(CASE WHEN s.status = 'BOOKED' THEN 1 ELSE 0 END)    AS booked_seats
FROM events e
LEFT JOIN seats s ON s.event_id = e.event_id
GROUP BY e.event_id, e.title, e.event_date;

-- View: booking details joined for easy display (my-bookings page, admin)
CREATE OR REPLACE VIEW view_booking_details AS
SELECT
    b.booking_id,
    b.booking_ref,
    b.user_id,
    u.full_name       AS user_name,
    u.email           AS user_email,
    b.event_id,
    e.title           AS event_title,
    e.event_date,
    e.start_time,
    v.name            AS venue_name,
    v.city            AS venue_city,
    b.total_amount,
    b.status,
    b.booked_at
FROM bookings b
JOIN users u  ON u.user_id = b.user_id
JOIN events e ON e.event_id = b.event_id
JOIN venues v ON v.venue_id = e.venue_id;

-- View: admin revenue / stats summary per event
CREATE OR REPLACE VIEW view_event_revenue AS
SELECT
    e.event_id,
    e.title,
    COUNT(DISTINCT b.booking_id)                                        AS total_bookings,
    COALESCE(SUM(CASE WHEN b.status = 'CONFIRMED' THEN b.total_amount END), 0) AS revenue
FROM events e
LEFT JOIN bookings b ON b.event_id = e.event_id
GROUP BY e.event_id, e.title;

-- =====================================================================
-- STORED PROCEDURE: sp_create_booking
-- Encapsulates the core "sell N seats atomically" logic so it can be
-- called from the app layer OR directly in a viva demo.
-- Uses SELECT ... FOR UPDATE inside a transaction to lock the specific
-- seat rows so two concurrent callers cannot both succeed on the same
-- seat (classic lost-update / race-condition prevention).
-- =====================================================================
DELIMITER $$

CREATE PROCEDURE sp_create_booking(
    IN  p_user_id     INT,
    IN  p_event_id    INT,
    IN  p_seat_ids    VARCHAR(500),   -- comma-separated seat IDs, e.g. '12,13,14'
    IN  p_booking_ref VARCHAR(20),
    OUT p_booking_id  INT,
    OUT p_status_msg  VARCHAR(100)
)
BEGIN
    DECLARE v_unavailable_count INT DEFAULT 0;
    DECLARE v_total DECIMAL(10,2) DEFAULT 0;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_status_msg = 'ERROR: transaction rolled back';
        SET p_booking_id = NULL;
    END;

    START TRANSACTION;

    -- Lock the candidate seat rows for update so no other transaction
    -- can read/modify them until this one commits or rolls back.
    SELECT COUNT(*) INTO v_unavailable_count
    FROM seats
    WHERE FIND_IN_SET(seat_id, p_seat_ids)
      AND event_id = p_event_id
      AND status <> 'AVAILABLE'
    FOR UPDATE;

    IF v_unavailable_count > 0 THEN
        ROLLBACK;
        SET p_status_msg = 'FAILED: one or more seats no longer available';
        SET p_booking_id = NULL;
    ELSE
        SELECT COALESCE(SUM(price), 0) INTO v_total
        FROM seats
        WHERE FIND_IN_SET(seat_id, p_seat_ids) AND event_id = p_event_id
        FOR UPDATE;

        INSERT INTO bookings (booking_ref, user_id, event_id, total_amount, status)
        VALUES (p_booking_ref, p_user_id, p_event_id, v_total, 'CONFIRMED');

        SET p_booking_id = LAST_INSERT_ID();

        INSERT INTO booking_seats (booking_id, seat_id, price)
        SELECT p_booking_id, seat_id, price
        FROM seats
        WHERE FIND_IN_SET(seat_id, p_seat_ids) AND event_id = p_event_id;

        UPDATE seats
        SET status = 'BOOKED'
        WHERE FIND_IN_SET(seat_id, p_seat_ids) AND event_id = p_event_id;

        COMMIT;
        SET p_status_msg = 'SUCCESS';
    END IF;
END$$

DELIMITER ;

-- =====================================================================
-- TRIGGER: trg_bookings_cancel_release_seats
-- When a booking is cancelled, automatically free up its seats and
-- mark its tickets cancelled -- keeps availability consistent without
-- relying on the application to remember every side effect.
-- =====================================================================
DELIMITER $$

CREATE TRIGGER trg_bookings_cancel_release_seats
AFTER UPDATE ON bookings
FOR EACH ROW
BEGIN
    IF NEW.status = 'CANCELLED' AND OLD.status <> 'CANCELLED' THEN
        UPDATE seats s
        JOIN booking_seats bs ON bs.seat_id = s.seat_id
        SET s.status = 'AVAILABLE'
        WHERE bs.booking_id = NEW.booking_id;

        UPDATE tickets
        SET status = 'CANCELLED'
        WHERE booking_id = NEW.booking_id;
    END IF;
END$$

DELIMITER ;

-- =====================================================================
-- TRIGGER: trg_events_default_seat_price
-- (Kept intentionally simple/illustrative) Ensures a seat's price is
-- never inserted as 0 by accident -- falls back to the event's base
-- price when a null/zero is supplied.
-- =====================================================================
DELIMITER $$

CREATE TRIGGER trg_seats_default_price
BEFORE INSERT ON seats
FOR EACH ROW
BEGIN
    IF NEW.price IS NULL OR NEW.price = 0 THEN
        SET NEW.price = (SELECT base_price FROM events WHERE event_id = NEW.event_id);
    END IF;
END$$

DELIMITER ;
