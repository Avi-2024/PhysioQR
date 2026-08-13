const SupportTicket = require('../models/SupportTicket.model');
const { writeAuditLog } = require('../utils/auditLogger');
const asyncHandler = require('../utils/asyncHandler');

const userReference = (req) => {
  if (req.user.role === 'patient') return { userType: 'patient', patient: req.user._id };
  if (req.user.role === 'doctor') return { userType: 'doctor', doctor: req.user.profileRef || undefined };
  if (req.user.role === 'agent') return { userType: 'agent', agent: req.user.profileRef || undefined };
  return {};
};

const createTicket = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.create({
    ...req.body,
    ...userReference(req),
  });
  res.status(201).json(ticket);
});

const getTickets = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role !== 'admin') Object.assign(filter, userReference(req));
  if (req.query.status) filter.status = req.query.status;
  if (req.query.category) filter.category = req.query.category;

  const tickets = await SupportTicket.find(filter)
    .populate('patient', 'patientId fullName mobile')
    .populate('doctor', 'doctorId fullName clinicName')
    .populate('agent', 'agentId fullName')
    .sort({ createdAt: -1 });

  res.json(tickets);
});

const updateTicket = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

  if (req.user.role !== 'admin') {
    const ref = userReference(req);
    const ownsTicket =
      (ref.patient && ticket.patient?.toString() === ref.patient.toString()) ||
      (ref.doctor && ticket.doctor?.toString() === ref.doctor.toString()) ||
      (ref.agent && ticket.agent?.toString() === ref.agent.toString());
    if (!ownsTicket) return res.status(403).json({ message: 'Access denied' });
  }

  const previousValue = ticket.toObject();
  Object.assign(ticket, req.body);
  await ticket.save();

  if (req.user.role === 'admin') {
    await writeAuditLog({
      req,
      action: 'support_ticket_updated',
      module: 'SupportTicket',
      recordId: ticket._id,
      previousValue,
      newValue: req.body,
    });
  }

  res.json(ticket);
});

module.exports = {
  createTicket,
  getTickets,
  updateTicket,
};
