const express = require('express');
const router = express.Router();
const { createBooking, getMyBookings, getBookingById, cancelBooking } = require('../controllers/bookingController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.post('/', createBooking);
router.get('/', getMyBookings);
router.get('/:id', getBookingById);
router.delete('/:id', cancelBooking);

module.exports = router;
