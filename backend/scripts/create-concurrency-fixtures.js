const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const DATABASE_NAME = 'ticketing_system_concurrency_test';

const TABLES = [
  'users',
  'venues',
  'events',
  'seats',
  'bookings',
  'booking_seats',
  'tickets',
  'payments',
];

const TEST_USERS = [
  {
    fullName: 'Concurrency User A',
    email: 'concurrency-a@test.invalid',
  },
  {
    fullName: 'Concurrency User B',
    email: 'concurrency-b@test.invalid',
  },
];

const SEAT_DEFINITIONS = [
  ['R', 1],
  ['R', 2],
  ['R', 3],
  ['B', 1],
  ['D', 1],
  ['D', 2],
  ['A', 1],
  ['E', 1],
];

function seatKey(seatRow, seatNumber) {
  return `${seatRow}:${seatNumber}`;
}

async function createFixtures() {
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST || 'localhost',
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: DATABASE_NAME,
  });

  let transactionStarted = false;

  try {
    const [[databaseRow]] = await connection.query(
      'SELECT DATABASE() AS databaseName'
    );

    if (
      typeof databaseRow.databaseName !== 'string' ||
      databaseRow.databaseName !== DATABASE_NAME
    ) {
      throw new Error(
        `Refusing to insert: expected database ${DATABASE_NAME}, ` +
        `selected ${databaseRow.databaseName}`
      );
    }

    const initialCounts = {};

    for (const table of TABLES) {
      const [[row]] = await connection.query(
        `SELECT COUNT(*) AS count FROM \`${table}\``
      );

      initialCounts[table] = Number(row.count);

      if (initialCounts[table] !== 0) {
        throw new Error(
          `Refusing to insert: ${table} contains ` +
          `${initialCounts[table]} row(s).`
        );
      }
    }

    const passwordHash = await bcrypt.hash(
      'ConcurrencyTestOnly-2026',
      10
    );

    await connection.beginTransaction();
    transactionStarted = true;

    await connection.query(
      `INSERT INTO users
         (full_name, email, password_hash, phone, role)
       VALUES
         (?, ?, ?, NULL, 'USER'),
         (?, ?, ?, NULL, 'USER')`,
      [
        TEST_USERS[0].fullName,
        TEST_USERS[0].email,
        passwordHash,
        TEST_USERS[1].fullName,
        TEST_USERS[1].email,
        passwordHash,
      ]
    );

    const userIds = {};

    for (const testUser of TEST_USERS) {
      const [userRows] = await connection.query(
        `SELECT user_id, email, role
         FROM users
         WHERE email = ?`,
        [testUser.email]
      );

      if (userRows.length !== 1) {
        throw new Error(
          `Expected exactly one user for ${testUser.email}, ` +
          `found ${userRows.length}.`
        );
      }

      if (userRows[0].email !== testUser.email) {
        throw new Error(
          `Returned user email does not match ${testUser.email}.`
        );
      }

      if (userRows[0].role !== 'USER') {
        throw new Error(
          `Expected ${testUser.email} to have role USER, ` +
          `found ${userRows[0].role}.`
        );
      }

      userIds[testUser.email] = Number(userRows[0].user_id);
    }

    if (
      !Number.isInteger(userIds[TEST_USERS[0].email]) ||
      !Number.isInteger(userIds[TEST_USERS[1].email])
    ) {
      throw new Error('Both test users must have valid numeric IDs.');
    }

    if (
      userIds[TEST_USERS[0].email] === userIds[TEST_USERS[1].email]
    ) {
      throw new Error('The two test users must have different IDs.');
    }

    const userAId = userIds[TEST_USERS[0].email];
    const userBId = userIds[TEST_USERS[1].email];

    const [venueResult] = await connection.query(
      `INSERT INTO venues
         (name, address, city, state, capacity)
       VALUES (?, ?, ?, ?, ?)`,
      [
        'Concurrency Test Venue',
        '1 Isolation Lane',
        'Test City',
        'Test State',
        8,
      ]
    );

    const venueId = Number(venueResult.insertId);

    const [venueRows] = await connection.query(
      `SELECT venue_id
       FROM venues
       WHERE venue_id = ?`,
      [venueId]
    );

    if (venueRows.length !== 1) {
      throw new Error(
        `Expected exactly one venue for captured ID ${venueId}, ` +
        `found ${venueRows.length}.`
      );
    }

    if (Number(venueRows[0].venue_id) !== venueId) {
      throw new Error(
        `Retrieved venue ID does not match captured ID ${venueId}.`
      );
    }

    const [eventResult] = await connection.query(
      `INSERT INTO events
         (title, description, category, venue_id, event_date,
          start_time, end_time, base_price, status, created_by)
       VALUES (?, ?, 'OTHER', ?, DATE_ADD(CURDATE(), INTERVAL 30 DAY),
               '18:00:00', '21:00:00', ?, 'UPCOMING', ?)`,
      [
        'Concurrency Control Test Event',
        'Dedicated DBMS concurrency test event',
        venueId,
        100.00,
        userAId,
      ]
    );

    const eventId = Number(eventResult.insertId);

    const [eventRows] = await connection.query(
      `SELECT event_id, venue_id, status
       FROM events
       WHERE event_id = ?`,
      [eventId]
    );

    if (eventRows.length !== 1) {
      throw new Error(
        `Expected exactly one event for captured ID ${eventId}, ` +
        `found ${eventRows.length}.`
      );
    }

    const event = eventRows[0];

    if (Number(event.event_id) !== eventId) {
      throw new Error(
        `Retrieved event ID does not match captured ID ${eventId}.`
      );
    }

    if (Number(event.venue_id) !== venueId) {
      throw new Error(
        `Event ${eventId} does not reference venue ${venueId}.`
      );
    }

    if (event.status !== 'UPCOMING') {
      throw new Error(
        `Expected event ${eventId} to have status UPCOMING, ` +
        `found ${event.status}.`
      );
    }

    await connection.query(
      `INSERT INTO seats
         (event_id, seat_row, seat_number, seat_class, price, status)
       VALUES ?`,
      [
        SEAT_DEFINITIONS.map(([seatRow, seatNumber]) => [
          eventId,
          seatRow,
          seatNumber,
          'GENERAL',
          100.00,
          'AVAILABLE',
        ]),
      ]
    );

    const seatConditions = SEAT_DEFINITIONS
      .map(() => '(seat_row = ? AND seat_number = ?)')
      .join(' OR ');

    const seatParameters = SEAT_DEFINITIONS.flat();

    const [seatRows] = await connection.query(
      `SELECT seat_id, event_id, seat_row, seat_number, status, price
       FROM seats
       WHERE event_id = ?
         AND (${seatConditions})
       ORDER BY seat_row, seat_number`,
      [eventId, ...seatParameters]
    );

    if (seatRows.length !== SEAT_DEFINITIONS.length) {
      throw new Error(
        `Expected exactly ${SEAT_DEFINITIONS.length} seats, ` +
        `found ${seatRows.length}.`
      );
    }

    const expectedSeatKeys = new Set(
      SEAT_DEFINITIONS.map(([seatRow, seatNumber]) =>
        seatKey(seatRow, seatNumber)
      )
    );

    const seatIds = {};

    for (const seat of seatRows) {
      const key = seatKey(seat.seat_row, seat.seat_number);

      if (!expectedSeatKeys.has(key)) {
        throw new Error(`Unexpected fixture seat returned: ${key}`);
      }

      if (Number(seat.event_id) !== eventId) {
        throw new Error(`Fixture seat ${key} belongs to another event.`);
      }

      if (seat.status !== 'AVAILABLE') {
        throw new Error(`Fixture seat ${key} is not AVAILABLE.`);
      }

      if (Number(seat.price) !== 100.00) {
        throw new Error(
          `Expected fixture seat ${key} to have price 100.00, ` +
          `found ${seat.price}.`
        );
      }

      if (Object.prototype.hasOwnProperty.call(seatIds, key)) {
        throw new Error(`Duplicate fixture seat returned: ${key}`);
      }

      seatIds[key] = Number(seat.seat_id);
    }

    for (const [seatRow, seatNumber] of SEAT_DEFINITIONS) {
      const key = seatKey(seatRow, seatNumber);

      if (!Object.prototype.hasOwnProperty.call(seatIds, key)) {
        throw new Error(`Missing expected fixture seat: ${key}`);
      }

      if (!Number.isInteger(seatIds[key])) {
        throw new Error(`Fixture seat ${key} has an invalid seat ID.`);
      }
    }

    if (Object.keys(seatIds).length !== SEAT_DEFINITIONS.length) {
      throw new Error(
        `Expected ${SEAT_DEFINITIONS.length} unique seat IDs, ` +
        `found ${Object.keys(seatIds).length}.`
      );
    }

    await connection.commit();
    transactionStarted = false;

    return {
      databaseName: DATABASE_NAME,
      initialCounts,
      insertedIds: {
        userAId,
        userBId,
        venueId,
        eventId,
        seatIds,
      },
    };
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        error.rollbackError = rollbackError.message;
      }
    }

    throw error;
  } finally {
    await connection.end();
  }
}

createFixtures()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
