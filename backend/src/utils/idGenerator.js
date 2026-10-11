// Generates human-friendly unique references for bookings and tickets.
// Not cryptographically significant -- just needs to look/behave like
// a real booking reference for demo purposes.

function generateBookingRef() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BKG-${timestamp}-${random}`;
}

function generateTicketCode(bookingId, seatId) {
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `TKT-${bookingId}-${seatId}-${random}`;
}

function generateTransactionRef() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `PAY-${timestamp}-${random}`;
}

module.exports = { generateBookingRef, generateTicketCode, generateTransactionRef };
