
const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const {
  createSeatHold,
  releaseSeatHold,
} = require('../services/seatHoldService');

const { asyncHandler, ApiError } = require('../middleware/errorHandler');

router.use(authenticate);

// POST /api/seat-holds — create or renew a temporary seat hold
router.post('/', asyncHandler(async (req, res) => {
  const { eventId, seatIds } = req.body;

  if (!eventId || !seatIds) {
    throw new ApiError(400, 'eventId and seatIds are required.');
  }

  const result = await createSeatHold({
    userId: req.user.userId,
    eventId,
    seatIds,
  });

  res.status(201).json({
    success: true,
    message: 'Seats held temporarily.',
    data: result,
  });
}));

// DELETE /api/seat-holds — release the current user's holds
router.delete('/', asyncHandler(async (req, res) => {
  const { seatIds } = req.body;

  const result = await releaseSeatHold({
    userId: req.user.userId,
    seatIds,
  });

  res.json({
    success: true,
    message: 'Seat hold released.',
    data: result,
  });
}));

module.exports = router;
