const express = require('express');
const router = express.Router();
const { getStats, getAllUsers, getAllBookings } = require('../controllers/adminController');
const { updateSeat } = require('../controllers/seatController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('ADMIN'));

router.get('/stats', getStats);
router.get('/users', getAllUsers);
router.get('/bookings', getAllBookings);
router.put('/seats/:seatId', updateSeat);

module.exports = router;
