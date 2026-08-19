const SupportTicket = require('../models/SupportTicket.model');
const notificationService = require('../services/notification.service');
const { writeAuditLog } = require('../utils/auditLogger');
const { buildSearchFilter, buildSort, paginateModel } = require('../utils/queryHelpers');
const asyncHandler = require('../utils/asyncHandler');

const SUPPORT_STATUSES = ['open', 'in_progress', 'waiting_for_user', 'resolved', 'closed', 'reopened'];
const SUPPORT_PRIORITIES = ['low', 'medium', 'high'];

// Returns the profile reference for the authenticated requester.
const userReference = (req) => {
  if (req.user.role === 'patient') return { userType: 'patient', patient: req.user._id };
  if (req.user.role === 'doctor') return { userType: 'doctor', doctor: req.user.profileRef };
  if (req.user.role === 'agent') return { userType: 'agent', agent: req.user.profileRef };
  return {};
};

// Checks whether the authenticated requester owns a ticket.
const ownsTicket = (ticket, req) => {
  const ref = userReference(req);
  return Boolean(
    (ref.patient && ticket.patient?.toString() === ref.patient.toString()) ||
    (ref.doctor && ticket.doctor?.toString() === ref.doctor.toString()) ||
    (ref.agent && ticket.agent?.toString() === ref.agent.toString())
  );
};

// Validates support ticket status values.
const assertValidStatus = (status) => {
  if (status && !SUPPORT_STATUSES.includes(status)) {
    const error = new Error(`status must be one of: ${SUPPORT_STATUSES.join(', ')}`);
    error.status = 400;
    throw error;
  }
};

// Validates support ticket priority values.
const assertValidPriority = (priority) => {
  if (priority && !SUPPORT_PRIORITIES.includes(priority)) {
    const error = new Error(`priority must be one of: ${SUPPORT_PRIORITIES.join(', ')}`);
    error.status = 400;
    throw error;
  }
};

// Creates an in-app notification related to a support ticket.
const createSupportNotification = async ({ ticket, recipientType, type, title, message }) => {
  const notification = {
    recipientType,
    type,
    channel: 'in_app',
    title,
    message,
  };

  if (recipientType === 'patient') notification.patient = ticket.patient;
  if (recipientType === 'doctor') notification.doctor = ticket.doctor;
  if (recipientType === 'agent') notification.agent = ticket.agent;

  await notificationService.createNotification(notification);
};

// Builds a filter scoped to the requester and query params.
const buildTicketFilter = (req) => {
  const filter = {};
  if (req.user.role !== 'admin') Object.assign(filter, userReference(req));
  if (req.query.status) filter.status = req.query.status;
  if (req.query.category) filter.category = req.query.category;
  if (req.query.priority) filter.priority = req.query.priority;
  if (req.query.userType && req.user.role === 'admin') filter.userType = req.query.userType;
  if (req.query.search) Object.assign(filter, buildSearchFilter(req.query.search, ['ticketId', 'subject', 'description']));
  return filter;
};

// Loads a ticket and enforces requester access.
const getAccessibleTicket = async (req) => {
  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) {
    const error = new Error('Ticket not found');
    error.status = 404;
    throw error;
  }
  if (req.user.role !== 'admin' && !ownsTicket(ticket, req)) {
    const error = new Error('Access denied');
    error.status = 403;
    throw error;
  }
  return ticket;
};

// POST /api/support
const createTicket = asyncHandler(async (req, res) => {
  if (req.user.role === 'admin') {
    return res.status(400).json({ message: 'Admin cannot create requester tickets from this endpoint' });
  }

  assertValidPriority(req.body.priority);
  const reference = userReference(req);
  if (!reference.patient && !reference.doctor && !reference.agent) {
    return res.status(400).json({ message: 'Requester profile is not linked to this account' });
  }

  const ticket = await SupportTicket.create({
    category: req.body.category,
    subject: req.body.subject,
    description: req.body.description,
    attachment: req.body.attachment,
    priority: req.body.priority || 'medium',
    ...reference,
    messages: req.body.description ? [{
      senderRole: req.user.role,
      sender: req.user.role === 'patient' ? undefined : req.user._id,
      message: req.body.description,
      attachment: req.body.attachment,
    }] : [],
  });

  await createSupportNotification({
    ticket,
    recipientType: 'admin',
    type: 'support_ticket_created',
    title: 'New support ticket',
    message: `${ticket.ticketId} was created for ${ticket.category}.`,
  });

  res.status(201).json(ticket);
});

// GET /api/support
const getTickets = asyncHandler(async (req, res) => {
  assertValidStatus(req.query.status);
  assertValidPriority(req.query.priority);

  const result = await paginateModel({
    model: SupportTicket,
    filter: buildTicketFilter(req),
    query: req.query,
    sort: buildSort(req.query.sortBy, req.query.sortOrder, ['createdAt', 'updatedAt', 'priority', 'status']),
    populate: [
      { path: 'patient', select: 'patientId fullName mobile' },
      { path: 'doctor', select: 'doctorId fullName clinicName' },
      { path: 'agent', select: 'agentId fullName' },
      { path: 'assignedTo', select: 'email mobile role' },
    ],
  });

  res.json(result);
});

// GET /api/support/:id
const getTicketById = asyncHandler(async (req, res) => {
  const ticket = await getAccessibleTicket(req);
  await ticket.populate([
    { path: 'patient', select: 'patientId fullName mobile' },
    { path: 'doctor', select: 'doctorId fullName clinicName' },
    { path: 'agent', select: 'agentId fullName' },
    { path: 'assignedTo', select: 'email mobile role' },
  ]);
  res.json(ticket);
});

// PATCH /api/support/:id/status
const updateTicketStatus = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Only Admin can update ticket status' });

  const { status, priority, assignedTo, adminResponse, resolutionNotes } = req.body;
  assertValidStatus(status);
  assertValidPriority(priority);

  const ticket = await getAccessibleTicket(req);
  const previousValue = ticket.toObject();

  if (status) {
    ticket.status = status;
    if (status === 'closed') ticket.closedAt = new Date();
    if (status === 'reopened') ticket.closedAt = null;
  }
  if (priority) ticket.priority = priority;
  if (assignedTo !== undefined) ticket.assignedTo = assignedTo || undefined;
  if (adminResponse) {
    ticket.adminResponse = adminResponse;
    ticket.lastResponseAt = new Date();
    ticket.messages.push({
      senderRole: 'admin',
      sender: req.user._id,
      message: adminResponse,
    });
  }
  if (resolutionNotes !== undefined) ticket.resolutionNotes = resolutionNotes;

  await ticket.save();

  await createSupportNotification({
    ticket,
    recipientType: ticket.userType,
    type: 'ticket_updated',
    title: 'Support ticket updated',
    message: `${ticket.ticketId} status is ${ticket.status}.`,
  });

  await writeAuditLog({
    req,
    action: 'support_ticket_status_updated',
    module: 'SupportTicket',
    recordId: ticket._id,
    previousValue,
    newValue: req.body,
  });

  res.json(ticket);
});

// POST /api/support/:id/messages
const addTicketMessage = asyncHandler(async (req, res) => {
  const ticket = await getAccessibleTicket(req);
  const message = String(req.body.message || '').trim();
  if (!message) return res.status(400).json({ message: 'message is required' });

  if (req.user.role !== 'admin' && ['resolved', 'closed'].includes(ticket.status)) {
    ticket.status = 'reopened';
    ticket.closedAt = null;
  }

  ticket.messages.push({
    senderRole: req.user.role,
    sender: req.user.role === 'patient' ? undefined : req.user._id,
    message,
    attachment: req.body.attachment,
    isInternal: req.user.role === 'admin' && Boolean(req.body.isInternal),
  });
  ticket.lastResponseAt = new Date();
  await ticket.save();

  if (req.user.role === 'admin') {
    await createSupportNotification({
      ticket,
      recipientType: ticket.userType,
      type: 'ticket_updated',
      title: 'Support reply received',
      message: `${ticket.ticketId} has a new support reply.`,
    });
  } else {
    await createSupportNotification({
      ticket,
      recipientType: 'admin',
      type: 'support_ticket_created',
      title: 'Support ticket message',
      message: `${ticket.ticketId} has a new requester message.`,
    });
  }

  res.status(201).json(ticket);
});

// PUT /api/support/:id
const updateTicket = asyncHandler(async (req, res) => {
  if (req.user.role === 'admin') {
    return res.status(400).json({ message: 'Use PATCH /api/support/:id/status for Admin ticket updates' });
  }

  const ticket = await getAccessibleTicket(req);
  if (!['open', 'reopened', 'waiting_for_user'].includes(ticket.status)) {
    return res.status(400).json({ message: `Cannot edit a ticket with status: ${ticket.status}` });
  }

  const allowedFields = ['subject', 'description', 'attachment'];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) ticket[field] = req.body[field];
  });
  await ticket.save();

  res.json(ticket);
});

module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  updateTicketStatus,
  addTicketMessage,
};
