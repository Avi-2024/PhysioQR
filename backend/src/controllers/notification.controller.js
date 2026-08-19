const Notification = require('../models/Notification.model');
const notificationService = require('../services/notification.service');
const { buildSort, paginateModel } = require('../utils/queryHelpers');
const asyncHandler = require('../utils/asyncHandler');

const CHANNELS = ['in_app', 'email', 'sms', 'whatsapp'];

// Builds a recipient-scoped notification filter for the authenticated user.
const getRecipientFilter = (req) => {
  const filter = {};
  if (req.user.role === 'patient') filter.patient = req.user._id;
  else if (req.user.role === 'doctor') filter.doctor = req.user.profileRef || req.user._id;
  else if (req.user.role === 'agent') filter.agent = req.user.profileRef || req.user._id;
  else if (req.user.role === 'admin') filter.$or = [{ recipientType: 'admin' }, { adminUser: req.user._id }];
  return filter;
};

// Adds query filters allowed for notification listing.
const buildNotificationFilter = (req) => {
  const filter = req.user.role === 'admin' && req.query.all === 'true' ? {} : getRecipientFilter(req);
  if (req.query.channel) filter.channel = req.query.channel;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.type) filter.type = req.query.type;
  if (req.query.isRead !== undefined) filter.isRead = req.query.isRead === 'true';
  return filter;
};

// Validates requested notification channels.
const normalizeChannels = (payload) => {
  const channels = Array.isArray(payload.channels) && payload.channels.length
    ? payload.channels
    : [payload.channel || 'in_app'];

  const invalid = channels.find((channel) => !CHANNELS.includes(channel));
  if (invalid) {
    const error = new Error(`channel must be one of: ${CHANNELS.join(', ')}`);
    error.status = 400;
    throw error;
  }

  return [...new Set(channels)];
};

// GET /api/notifications
const getNotifications = asyncHandler(async (req, res) => {
  const result = await paginateModel({
    model: Notification,
    filter: buildNotificationFilter(req),
    query: req.query,
    sort: buildSort(req.query.sortBy, req.query.sortOrder, ['createdAt', 'sentAt', 'status', 'channel']),
    populate: [
      { path: 'patient', select: 'patientId fullName mobile email' },
      { path: 'doctor', select: 'doctorId fullName mobile email' },
      { path: 'agent', select: 'agentId fullName mobile email' },
      { path: 'adminUser', select: 'email mobile role' },
    ],
  });
  res.json(result);
});

// PUT /api/notifications/:id/read
const markRead = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id, ...getRecipientFilter(req), channel: 'in_app' };
  const notification = await Notification.findOneAndUpdate(filter, { isRead: true }, { new: true });
  if (!notification) return res.status(404).json({ message: 'Notification not found' });
  res.json({ message: 'Marked as read', notification });
});

// PUT /api/notifications/read-all
const markAllRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { ...getRecipientFilter(req), channel: 'in_app', isRead: false },
    { isRead: true }
  );
  res.json({ message: 'Notifications marked as read', modifiedCount: result.modifiedCount });
});

// POST /api/notifications
const createNotification = asyncHandler(async (req, res) => {
  const channels = normalizeChannels(req.body);
  const notifications = await notificationService.createNotificationsForChannels(
    {
      recipientType: req.body.recipientType,
      patient: req.body.patient,
      doctor: req.body.doctor,
      agent: req.body.agent,
      adminUser: req.body.adminUser,
      type: req.body.type || 'ticket_updated',
      title: req.body.title,
      message: req.body.message,
      recipientContact: req.body.recipientContact,
      metadata: req.body.metadata,
    },
    channels,
    { deliverNow: req.body.deliverNow !== false }
  );

  res.status(201).json({ notifications });
});

// POST /api/notifications/:id/deliver
const deliverNotification = asyncHandler(async (req, res) => {
  const notification = await notificationService.deliverNotification(req.params.id);
  res.json({ message: 'Notification delivery attempted', notification });
});

// POST /api/notifications/process-pending
const processPendingNotifications = asyncHandler(async (req, res) => {
  const notifications = await notificationService.processPendingNotifications({
    limit: req.body.limit,
    includeFailed: Boolean(req.body.includeFailed),
  });
  res.json({ processed: notifications.length, notifications });
});

module.exports = {
  getNotifications,
  markRead,
  markAllRead,
  createNotification,
  deliverNotification,
  processPendingNotifications,
};
