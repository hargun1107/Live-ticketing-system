-- =====================================================================
-- LIVE TICKETING SYSTEM - SEED DATA
-- Run AFTER schema.sql:  mysql -u root -p ticketing_system < seed.sql
-- Passwords below are bcrypt hashes of "password123" (10 rounds).
-- =====================================================================
USE ticketing_system;

-- -------------------------------------------------------------------
-- USERS  (1 admin + 6 regular users)
-- -------------------------------------------------------------------
INSERT INTO users (full_name, email, password_hash, phone, role) VALUES
('System Admin',   'admin@ticketing.com',  '$2b$10$CwTycUXWue0Thq9StjUM0uJ8Q7z8n7q1P8N3z2E4A8Kk3n1S9j1S6', '9000000000', 'ADMIN'),
('Aditi Sharma',   'aditi@example.com',    '$2b$10$CwTycUXWue0Thq9StjUM0uJ8Q7z8n7q1P8N3z2E4A8Kk3n1S9j1S6', '9876543210', 'USER'),
('Rohan Mehta',    'rohan@example.com',    '$2b$10$CwTycUXWue0Thq9StjUM0uJ8Q7z8n7q1P8N3z2E4A8Kk3n1S9j1S6', '9876543211', 'USER'),
('Sara Khan',      'sara@example.com',     '$2b$10$CwTycUXWue0Thq9StjUM0uJ8Q7z8n7q1P8N3z2E4A8Kk3n1S9j1S6', '9876543212', 'USER'),
('Vikram Nair',    'vikram@example.com',   '$2b$10$CwTycUXWue0Thq9StjUM0uJ8Q7z8n7q1P8N3z2E4A8Kk3n1S9j1S6', '9876543213', 'USER'),
('Priya Iyer',     'priya@example.com',    '$2b$10$CwTycUXWue0Thq9StjUM0uJ8Q7z8n7q1P8N3z2E4A8Kk3n1S9j1S6', '9876543214', 'USER'),
('Karan Verma',    'karan@example.com',    '$2b$10$CwTycUXWue0Thq9StjUM0uJ8Q7z8n7q1P8N3z2E4A8Kk3n1S9j1S6', '9876543215', 'USER');

-- -------------------------------------------------------------------
-- VENUES
-- -------------------------------------------------------------------
INSERT INTO venues (name, address, city, state, capacity) VALUES
('Palace Grounds Arena',      '1 Palace Rd',        'Bengaluru', 'Karnataka',    5000),
('Jawaharlal Nehru Stadium',  'Pragati Vihar',       'New Delhi', 'Delhi',        8000),
('Prithvi Theatre',           'Juhu Church Rd',      'Mumbai',    'Maharashtra',   200),
('Phoenix Convention Center', 'Whitefield Main Rd',  'Bengaluru', 'Karnataka',    1200),
('YMCA Grounds',              'Nungambakkam High Rd','Chennai',   'Tamil Nadu',   3000);

-- -------------------------------------------------------------------
-- EVENTS
-- -------------------------------------------------------------------
INSERT INTO events (title, description, category, venue_id, event_date, start_time, end_time, base_price, status, created_by) VALUES
('Indie Music Fest 2026',        'A night of independent artists and bands from across the country.', 'MUSIC',      1, '2026-11-14', '18:00:00', '23:00:00',  999.00, 'UPCOMING', 1),
('Stand-Up Comedy Night',        'An evening of laughter with top touring comedians.',                 'COMEDY',     3, '2026-10-05', '19:30:00', '21:30:00',  499.00, 'UPCOMING', 1),
('Bengaluru Premier League Final','The season finale cricket match between the top two teams.',        'SPORTS',     2, '2026-12-01', '15:00:00', '19:00:00', 1499.00, 'UPCOMING', 1),
('Hamlet - A Modern Retelling',  'A contemporary staging of Shakespeare\'s classic tragedy.',           'THEATRE',    3, '2026-10-20', '19:00:00', '21:15:00',  699.00, 'UPCOMING', 1),
('TechConnect Summit 2026',      'A conference on emerging technology, AI, and product design.',       'CONFERENCE', 4, '2026-11-02', '09:00:00', '17:00:00', 1999.00, 'UPCOMING', 1),
('Classical Rhythms Concert',    'An evening of Carnatic and Hindustani classical fusion.',            'MUSIC',      5, '2026-10-25', '18:30:00', '20:30:00',  349.00, 'UPCOMING', 1),
('Retro Rock Revival',           'Tribute night for 90s and 2000s rock anthems.',                      'MUSIC',      1, '2026-09-01', '19:00:00', '22:00:00',  799.00, 'COMPLETED', 1);

-- -------------------------------------------------------------------
-- SEATS
-- Generates a small but realistic seat map per event:
--   Rows A-B = VIP, Rows C-D = PREMIUM, Rows E-H = GENERAL
-- Kept intentionally compact (not full venue capacity) so the seat
-- map renders cleanly during a demo.
-- -------------------------------------------------------------------
DELIMITER $$
CREATE PROCEDURE sp_seed_generate_seats(IN p_event_id INT, IN p_base_price DECIMAL(10,2))
BEGIN
    DECLARE r INT DEFAULT 0;
    DECLARE n INT DEFAULT 0;
    DECLARE row_letter VARCHAR(2);
    DECLARE seat_class VARCHAR(10);
    DECLARE seat_price DECIMAL(10,2);

    WHILE r < 8 DO
        SET row_letter = CHAR(65 + r);
        IF r < 2 THEN
            SET seat_class = 'VIP';
            SET seat_price = p_base_price * 2.5;
        ELSEIF r < 4 THEN
            SET seat_class = 'PREMIUM';
            SET seat_price = p_base_price * 1.5;
        ELSE
            SET seat_class = 'GENERAL';
            SET seat_price = p_base_price;
        END IF;

        SET n = 1;
        WHILE n <= 10 DO
            INSERT INTO seats (event_id, seat_row, seat_number, seat_class, price, status)
            VALUES (p_event_id, row_letter, n, seat_class, seat_price, 'AVAILABLE');
            SET n = n + 1;
        END WHILE;
        SET r = r + 1;
    END WHILE;
END$$
DELIMITER ;

CALL sp_seed_generate_seats(1,  999.00);
CALL sp_seed_generate_seats(2,  499.00);
CALL sp_seed_generate_seats(3, 1499.00);
CALL sp_seed_generate_seats(4,  699.00);
CALL sp_seed_generate_seats(5, 1999.00);
CALL sp_seed_generate_seats(6,  349.00);
CALL sp_seed_generate_seats(7,  799.00);

DROP PROCEDURE sp_seed_generate_seats;

-- -------------------------------------------------------------------
-- SAMPLE BOOKINGS (to populate "my bookings" / admin views immediately)
-- Book a few seats for event 1 and event 2 for demo users.
-- -------------------------------------------------------------------

-- Booking 1: Aditi books 2 seats for Indie Music Fest
SET @seat1 = (SELECT seat_id FROM seats WHERE event_id = 1 AND seat_row = 'E' AND seat_number = 1);
SET @seat2 = (SELECT seat_id FROM seats WHERE event_id = 1 AND seat_row = 'E' AND seat_number = 2);

INSERT INTO bookings (booking_ref, user_id, event_id, total_amount, status)
VALUES ('BKG-DEMO-0001', 2, 1, 1998.00, 'CONFIRMED');
SET @b1 = LAST_INSERT_ID();

INSERT INTO booking_seats (booking_id, seat_id, price) VALUES
(@b1, @seat1, 999.00),
(@b1, @seat2, 999.00);

UPDATE seats SET status = 'BOOKED' WHERE seat_id IN (@seat1, @seat2);

INSERT INTO tickets (ticket_code, booking_id, seat_id, event_id) VALUES
(CONCAT('TKT-', @b1, '-', @seat1), @b1, @seat1, 1),
(CONCAT('TKT-', @b1, '-', @seat2), @b1, @seat2, 1);

INSERT INTO payments (booking_id, amount, method, status, transaction_ref)
VALUES (@b1, 1998.00, 'UPI', 'SUCCESS', CONCAT('PAY-', @b1, '-DEMO'));

-- Booking 2: Rohan books 1 VIP seat for Stand-Up Comedy Night
SET @seat3 = (SELECT seat_id FROM seats WHERE event_id = 2 AND seat_row = 'A' AND seat_number = 1);

INSERT INTO bookings (booking_ref, user_id, event_id, total_amount, status)
VALUES ('BKG-DEMO-0002', 3, 2, 1247.50, 'CONFIRMED');
SET @b2 = LAST_INSERT_ID();

INSERT INTO booking_seats (booking_id, seat_id, price) VALUES (@b2, @seat3, 1247.50);

UPDATE seats SET status = 'BOOKED' WHERE seat_id = @seat3;

INSERT INTO tickets (ticket_code, booking_id, seat_id, event_id) VALUES
(CONCAT('TKT-', @b2, '-', @seat3), @b2, @seat3, 2);

INSERT INTO payments (booking_id, amount, method, status, transaction_ref)
VALUES (@b2, 1247.50, 'CARD', 'SUCCESS', CONCAT('PAY-', @b2, '-DEMO'));

-- Booking 3: Sara books then cancels a seat for Hamlet (demonstrates the cancel trigger)
SET @seat4 = (SELECT seat_id FROM seats WHERE event_id = 4 AND seat_row = 'F' AND seat_number = 5);

INSERT INTO bookings (booking_ref, user_id, event_id, total_amount, status)
VALUES ('BKG-DEMO-0003', 4, 4, 699.00, 'CONFIRMED');
SET @b3 = LAST_INSERT_ID();

INSERT INTO booking_seats (booking_id, seat_id, price) VALUES (@b3, @seat4, 699.00);
UPDATE seats SET status = 'BOOKED' WHERE seat_id = @seat4;
INSERT INTO tickets (ticket_code, booking_id, seat_id, event_id) VALUES
(CONCAT('TKT-', @b3, '-', @seat4), @b3, @seat4, 4);
INSERT INTO payments (booking_id, amount, method, status, transaction_ref)
VALUES (@b3, 699.00, 'NETBANKING', 'SUCCESS', CONCAT('PAY-', @b3, '-DEMO'));

-- Now cancel it -- trigger trg_bookings_cancel_release_seats will free the seat
UPDATE bookings SET status = 'CANCELLED', cancelled_at = NOW() WHERE booking_id = @b3;
