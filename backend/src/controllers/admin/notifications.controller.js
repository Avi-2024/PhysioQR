const mongoose = require('mongoose');
const Notification = require('../../models/Notification.model');
const Patient = require('../../models/Patient.model');
const Doctor = require('../../models/Doctor.model');
const Agent = require('../../models/Agent.model');
const User = require('../../models/User.model');
const { getPagination } = require('../../utils/queryHelpers');
const asyncHandler = require('../../utils/asyncHandler');

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getAdminNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.channel) filter.channel = req.query.channel;
  if (req.query.recipientType) filter.recipientType = req.query.recipientType;
  if (req.query.type) filter.type = req.query.type;
  const search = String(req.query.search || '').trim();
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [
      { title: rx }, { message: rx }, { recipientContact: rx },
      { providerMessageId: rx }, { failureReason: rx }, { type: rx },
    ];
  }

  const [items, total, summaryRows] = await Promise.all([
    Notification.find(filter)
      .populate('patient', 'patientId fullName mobile email')
      .populate('doctor', 'doctorId fullName mobile email clinicName')
      .populate('agent', 'agentId fullName mobile email')
      .populate('adminUser', 'email mobile role')
      .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);
  const byStatus = Object.fromEntries(summaryRows.map((row) => [row._id, row.count]));
  const totalAll = summaryRows.reduce((sum, row) => sum + row.count, 0);
  res.json({
    items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    summary: {
      total: totalAll,
      pending: byStatus.pending || 0,
      sent: byStatus.sent || 0,
      failed: byStatus.failed || 0,
    },
  });
});

const getAdminNotificationById = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid notification id' });
  const notification = await Notification.findById(req.params.id)
    .populate('patient', 'patientId fullName mobile email')
    .populate('doctor', 'doctorId fullName mobile email clinicName')
    .populate('agent', 'agentId fullName mobile email')
    .populate('adminUser', 'email mobile role')
    .lean();
  if (!notification) return res.status(404).json({ message: 'Notification not found' });
  res.json(notification);
});

const searchNotificationRecipients = asyncHandler(async (req, res) => {
  const recipientType = String(req.query.recipientType || 'patient');
  const search = String(req.query.search || '').trim();
  const rx = new RegExp(escapeRegex(search), 'i');
  let items = [];
  if (recipientType === 'patient') {
    items = await Patient.find(search ? { $or: [{ patientId: rx }, { fullName: rx }, { mobile: rx }, { email: rx }] } : {})
      .select('patientId fullName mobile email').sort({ createdAt: -1 }).limit(20).lean();
  } else if (recipientType === 'doctor') {
    items = await Doctor.find(search ? { $or: [{ doctorId: rx }, { fullName: rx }, { mobile: rx }, { email: rx }, { clinicName: rx }] } : {})
      .select('doctorId fullName mobile email clinicName').sort({ createdAt: -1 }).limit(20).lean();
  } else if (recipientType === 'agent') {
    items = await Agent.find(search ? { $or: [{ agentId: rx }, { fullName: rx }, { mobile: rx }, { email: rx }] } : {})
      .select('agentId fullName mobile email').sort({ createdAt: -1 }).limit(20).lean();
  } else if (recipientType === 'admin') {
    items = await User.find({ role: 'admin', ...(search ? { $or: [{ email: rx }, { mobile: rx }] } : {}) })
      .select('email mobile role').sort({ createdAt: -1 }).limit(20).lean();
  } else return res.status(400).json({ message: 'Unsupported recipient type' });
  res.json({ items });
});

module.exports = { getAdminNotifications, getAdminNotificationById, searchNotificationRecipients };