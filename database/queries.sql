-- =====================================================================
-- LIVE TICKETING SYSTEM - REFERENCE QUERIES
-- A catalogue of queries demonstrating JOINs, aggregates, subqueries,
-- views, and transactions. Useful during the viva to show DBMS
-- concepts on top of the live application.
-- =====================================================================
USE ticketing_system;

-- 1. INNER JOIN: list upcoming events with venue details
SELECT e.event_id, e.title, e.event_date, v.name AS venue, v.city
FROM events e
JOIN venues v ON v.venue_id = e.venue_id
WHERE e.status = 'UPCOMING'
ORDER BY e.event_date;

-- 2. MULTI-TABLE JOIN: full booking receipt (booking -> seats -> event -> venue -> user)
SELECT
    b.booking_ref, u.full_name, e.title, v.name AS venue,
    s.seat_row, s.seat_number, bs.price, b.status
FROM bookings b
JOIN users u          ON u.user_id = b.user_id
JOIN events e          ON e.event_id = b.event_id
JOIN venues v          ON v.venue_id = e.venue_id
JOIN booking_seats bs  ON bs.booking_id = b.booking_id
JOIN seats s           ON s.seat_id = bs.seat_id
WHERE b.booking_id = 1;

-- 3. AGGREGATE + GROUP BY: total revenue and tickets sold per event
SELECT
    e.event_id, e.title,
    COUNT(bs.booking_seat_id) AS tickets_sold,
    COALESCE(SUM(bs.price), 0) AS revenue
FROM events e
LEFT JOIN bookings b       ON b.event_id = e.event_id AND b.status = 'CONFIRMED'
LEFT JOIN booking_seats bs ON bs.booking_id = b.booking_id
GROUP BY e.event_id, e.title
ORDER BY revenue DESC;

-- 4. AGGREGATE: seat availability breakdown per event (also see the view)
SELECT event_id,
       SUM(status = 'AVAILABLE') AS available,
       SUM(status = 'BOOKED')    AS booked,
       COUNT(*)                  AS total
FROM seats
GROUP BY event_id;

-- 5. SUBQUERY (correlated): users who have never made a booking
SELECT u.user_id, u.full_name, u.email
FROM users u
WHERE u.role = 'USER'
  AND NOT EXISTS (
      SELECT 1 FROM bookings b WHERE b.user_id = u.user_id
  );

-- 6. SUBQUERY (scalar): events priced above the average base price
SELECT title, base_price
FROM events
WHERE base_price > (SELECT AVG(base_price) FROM events);

-- 7. SUBQUERY in FROM: top spending customers
SELECT user_id, full_name, total_spent FROM (
    SELECT u.user_id, u.full_name, SUM(b.total_amount) AS total_spent
    FROM users u
    JOIN bookings b ON b.user_id = u.user_id AND b.status = 'CONFIRMED'
    GROUP BY u.user_id, u.full_name
) AS spend_summary
ORDER BY total_spent DESC
LIMIT 5;

-- 8. FULLTEXT SEARCH: search events by keyword
SELECT event_id, title, description
FROM events
WHERE MATCH(title, description) AGAINST('music rock' IN NATURAL LANGUAGE MODE);

-- 9. FILTERING: events by category, date range, and price range (mirrors API filter endpoint)
SELECT event_id, title, category, event_date, base_price
FROM events
WHERE category = 'MUSIC'
  AND event_date BETWEEN '2026-01-01' AND '2026-12-31'
  AND base_price BETWEEN 0 AND 1000
  AND status = 'UPCOMING';

-- 10. USING THE VIEWS
SELECT * FROM view_event_seat_availability ORDER BY event_date;
SELECT * FROM view_booking_details WHERE user_id = 2;
SELECT * FROM view_event_revenue ORDER BY revenue DESC;

-- 11. TRANSACTION DEMO (manual form -- same logic as sp_create_booking)
-- Run these statements together as one transaction to book seats 5 and 6
-- for event 1. This is the pattern used by backend/src/services/bookingService.js
START TRANSACTION;

SELECT seat_id, status FROM seats
WHERE seat_id IN (5, 6)
FOR UPDATE;                          -- locks rows so no concurrent booking can interleave

-- Application checks all rows returned above have status = 'AVAILABLE'.
-- If any is not, it should ROLLBACK and return "seat no longer available".

INSERT INTO bookings (booking_ref, user_id, event_id, total_amount, status)
VALUES ('BKG-TEST-0001', 2, 1, 1998.00, 'CONFIRMED');

INSERT INTO booking_seats (booking_id, seat_id, price)
VALUES (LAST_INSERT_ID(), 5, 999.00), (LAST_INSERT_ID(), 6, 999.00);

UPDATE seats SET status = 'BOOKED' WHERE seat_id IN (5, 6);

COMMIT;   -- or ROLLBACK; on any failure

-- 12. STORED PROCEDURE CALL (the same booking flow, encapsulated)
CALL sp_create_booking(2, 1, '7,8', 'BKG-TEST-0002', @booking_id, @status_msg);
SELECT @booking_id, @status_msg;

-- 13. CANCELLATION (fires trg_bookings_cancel_release_seats)
UPDATE bookings SET status = 'CANCELLED', cancelled_at = NOW() WHERE booking_id = 1;
SELECT seat_id, status FROM seats WHERE seat_id IN (
    SELECT seat_id FROM booking_seats WHERE booking_id = 1
);  -- should show AVAILABLE again

-- 14. INDEX USAGE CHECK (for viva explanation of query plans)
EXPLAIN SELECT * FROM seats WHERE event_id = 1 AND status = 'AVAILABLE';
EXPLAIN SELECT * FROM events WHERE category = 'MUSIC' AND event_date > CURDATE();
