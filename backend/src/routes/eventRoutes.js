const express = require('express');
const router = express.Router();
const { getAllEvents, getEventById, createEvent, updateEvent, deleteEvent } = require('../controllers/eventController');
const { getSeatsForEvent, addSeats } = require('../controllers/seatController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', getAllEvents);
router.get('/:id', getEventById);
router.get('/:id/seats', getSeatsForEvent);

router.post('/', authenticate, authorize('ADMIN'), createEvent);
router.put('/:id', authenticate, authorize('ADMIN'), updateEvent);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteEvent);
router.post('/:id/seats', authenticate, authorize('ADMIN'), addSeats);

module.exports = router;
