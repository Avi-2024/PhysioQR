const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const Notification = require('../models/Notification.model');
const asyncHandler = require('../utils/asyncHandler');

router.use(protect);

// GET /api/notifications — User gets their own in-app notifications
router.get('/', asyncHandler(async (req, res) => {
  const role = req.user.role;
  const filter = { channel: 'in_app' };

  if (role === 'patient') filter.patient = req.user._id;
  else if (role === 'doctor') filter.doctor = req.user._id;
  else if (role === 'agent') filter.agent = req.user._id;
  else if (role === 'admin') filter.recipientType = 'admin';

  const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(50);
  res.json(notifications);
}));

// PUT /api/notifications/:id/read — Mark as read
router.put('/:id/read', asyncHandler(async (req, res) => {
  const notification = await Notification.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
  if (!notification) return res.status(404).json({ message: 'Notification not found' });
  res.json({ message: 'Marked as read' });
}));

// Admin sends a manual notification
router.post('/', authorize('admin'), asyncHandler(async (req, res) => {
  const notification = await Notification.create(req.body);
  res.status(201).json(notification);
}));

module.exports = router;
