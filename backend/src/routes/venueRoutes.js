const express = require('express');
const router = express.Router();
const { getAllVenues, getVenueById, createVenue, updateVenue, deleteVenue } = require('../controllers/venueController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', getAllVenues);
router.get('/:id', getVenueById);
router.post('/', authenticate, authorize('ADMIN'), createVenue);
router.put('/:id', authenticate, authorize('ADMIN'), updateVenue);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteVenue);

module.exports = router;
