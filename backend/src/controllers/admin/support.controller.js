const mongoose = require('mongoose');
const SupportTicket = require('../../models/SupportTicket.model');
const { getPagination } = require('../../utils/queryHelpers');
const asyncHandler = require('../../utils/asyncHandler');

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildFilter = (query = {}) => {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.category) filter.category = query.category;
  if (query.userType) filter.userType = query.userType;
  const search = String(query.search || '').trim();
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ ticketId: rx }, { subject: rx }, { description: rx }];
  }
  return filter;
};

const getSupportTickets = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = buildFilter(req.query);
  const [items, total, summaryRows] = await Promise.all([
    SupportTicket.find(filter)
      .populate('patient', 'patientId fullName mobile email')
      .populate('doctor', 'doctorId fullName clinicName mobile email')
      .populate('agent', 'agentId fullName mobile email')
      .populate('assignedTo', 'email mobile role')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    SupportTicket.countDocuments(filter),
    SupportTicket.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  const byStatus = Object.fromEntries(summaryRows.map((row) => [row._id, row.count]));
  res.json({
    items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    summary: {
      total: summaryRows.reduce((sum, row) => sum + row.count, 0),
      open: byStatus.open || 0,
      inProgress: byStatus.in_progress || 0,
      waitingForUser: byStatus.waiting_for_user || 0,
      resolved: byStatus.resolved || 0,
      closed: byStatus.closed || 0,
      reopened: byStatus.reopened || 0,
    },
  });
});

const getSupportTicketById = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid support ticket id' });
  const ticket = await SupportTicket.findById(req.params.id)
    .populate('patient', 'patientId fullName mobile email')
    .populate('doctor', 'doctorId fullName clinicName mobile email')
    .populate('agent', 'agentId fullName mobile email')
    .populate('assignedTo', 'email mobile role')
    .populate('messages.sender', 'email mobile role')
    .lean();
  if (!ticket) return res.status(404).json({ message: 'Support ticket not found' });
  res.json({ ticket });
});

module.exports = { getSupportTickets, getSupportTicketById };
