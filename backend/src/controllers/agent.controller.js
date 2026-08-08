const Agent = require('../models/Agent.model');
const Doctor = require('../models/Doctor.model');
const ClinicVisit = require('../models/ClinicVisit.model');
const Patient = require('../models/Patient.model');
const { Payment } = require('../models/Payment.model');
const { writeAuditLog } = require('../utils/auditLogger');
const asyncHandler = require('../utils/asyncHandler');

// POST /api/agents — Admin creates an agent
const createAgent = asyncHandler(async (req, res) => {
  const agent = await Agent.create(req.body);
  await writeAuditLog({ req, action: 'agent_created', module: 'Agent', recordId: agent._id, newValue: { fullName: agent.fullName } });
  res.status(201).json(agent);
});

// GET /api/agents — Admin gets all agents
const getAllAgents = asyncHandler(async (req, res) => {
  const agents = await Agent.find().sort({ createdAt: -1 });
  res.json(agents);
});

// GET /api/agents/:id
const getAgentById = asyncHandler(async (req, res) => {
  const agent = await Agent.findById(req.params.id);
  if (!agent) return res.status(404).json({ message: 'Agent not found' });
  res.json(agent);
});

// PUT /api/agents/:id
const updateAgent = asyncHandler(async (req, res) => {
  const agent = await Agent.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!agent) return res.status(404).json({ message: 'Agent not found' });
  res.json(agent);
});

// GET /api/agents/me/dashboard — SRS §4.3 Agent Dashboard stats
const getMyDashboard = asyncHandler(async (req, res) => {
  const agent = await Agent.findOne({ user: req.user._id });
  if (!agent) return res.status(404).json({ message: 'Agent profile not found' });

  const [totalDoctors, pendingApproval, approved, rejected] = await Promise.all([
    Doctor.countDocuments({ agent: agent._id }),
    Doctor.countDocuments({ agent: agent._id, status: 'submitted' }),
    Doctor.countDocuments({ agent: agent._id, status: 'approved' }),
    Doctor.countDocuments({ agent: agent._id, status: 'rejected' }),
  ]);

  const agentDoctorIds = (await Doctor.find({ agent: agent._id }, '_id')).map(d => d._id);
  const totalPatients = await Patient.countDocuments({ referringDoctor: { $in: agentDoctorIds } });
  const totalPaidPatients = await Payment.countDocuments({ doctor: { $in: agentDoctorIds }, status: 'successful' });

  const revenueResult = await Payment.aggregate([
    { $match: { doctor: { $in: agentDoctorIds }, status: 'successful' } },
    { $group: { _id: null, total: { $sum: '$paidAmount' } } },
  ]);

  const pendingFollowUps = await ClinicVisit.countDocuments({
    agent: agent._id,
    outcome: 'follow_up_required',
    followUpDate: { $lte: new Date() },
  });

  res.json({
    totalDoctors,
    pendingApproval,
    approved,
    rejected,
    totalPatients,
    totalPaidPatients,
    revenueGenerated: revenueResult[0]?.total || 0,
    pendingFollowUps,
  });
});

// GET /api/agents/me/doctors — Agent sees only their own doctors (SRS §3.2)
const getMyDoctors = asyncHandler(async (req, res) => {
  const agent = await Agent.findOne({ user: req.user._id });
  if (!agent) return res.status(404).json({ message: 'Agent profile not found' });
  // SRS §3.2 — Agents must not see bank details
  const doctors = await Doctor.find({ agent: agent._id })
    .select('-bankAccountNumber -ifscCode -upiId -panNumber');
  res.json(doctors);
});

// POST /api/agents/me/visits — Agent records a clinic visit (SRS §4.4)
const addClinicVisit = asyncHandler(async (req, res) => {
  const agent = await Agent.findOne({ user: req.user._id });
  if (!agent) return res.status(404).json({ message: 'Agent profile not found' });
  const visit = await ClinicVisit.create({ ...req.body, agent: agent._id });
  res.status(201).json(visit);
});

// GET /api/agents/me/visits — Agent views their clinic visits
const getMyVisits = asyncHandler(async (req, res) => {
  const agent = await Agent.findOne({ user: req.user._id });
  if (!agent) return res.status(404).json({ message: 'Agent profile not found' });
  const visits = await ClinicVisit.find({ agent: agent._id })
    .populate('doctor', 'fullName clinicName')
    .sort({ visitDate: -1 });
  res.json(visits);
});

module.exports = {
  createAgent, getAllAgents, getAgentById, updateAgent,
  getMyDashboard, getMyDoctors, addClinicVisit, getMyVisits,
};
