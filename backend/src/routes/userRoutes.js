const express = require('express');
const router = express.Router();
const { getUserById, updateUser, getUserBookings } = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.get('/:id/bookings', getUserBookings);

module.exports = router;
