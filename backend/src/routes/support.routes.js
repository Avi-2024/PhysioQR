const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const SupportTicket = require('../models/SupportTicket.model');
const asyncHandler = require('../utils/asyncHandler');

router.use(protect);

// Anyone creates a ticket
router.post('/', asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.create(req.body);
  res.status(201).json(ticket);
}));

// Admin views all tickets
router.get('/', authorize('admin'), asyncHandler(async (req, res) => {
  const tickets = await SupportTicket.find().sort({ createdAt: -1 });
  res.json(tickets);
}));

// Admin responds to a ticket
router.put('/:id', authorize('admin'), asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(ticket);
}));

module.exports = router;
