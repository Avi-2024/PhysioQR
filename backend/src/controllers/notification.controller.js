const Notification = require('../models/Notification.model');
const asyncHandler = require('../utils/asyncHandler');

const getRecipientFilter = (req) => {
  const filter = { channel: 'in_app' };
  if (req.user.role === 'patient') filter.patient = req.user._id;
  else if (req.user.role === 'doctor') filter.doctor = req.user.profileRef || req.user._id;
  else if (req.user.role === 'agent') filter.agent = req.user.profileRef || req.user._id;
  else if (req.user.role === 'admin') filter.recipientType = 'admin';
  return filter;
};

const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find(getRecipientFilter(req))
    .sort({ createdAt: -1 })
    .limit(Number(req.query.limit || 50));
  res.json(notifications);
});

const markRead = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id, ...getRecipientFilter(req) };
  const notification = await Notification.findOneAndUpdate(filter, { isRead: true }, { new: true });
  if (!notification) return res.status(404).json({ message: 'Notification not found' });
  res.json({ message: 'Marked as read', notification });
});

const createNotification = asyncHandler(async (req, res) => {
  res.status(201).json(await Notification.create(req.body));
});

module.exports = {
  getNotifications,
  markRead,
  createNotification,
};
