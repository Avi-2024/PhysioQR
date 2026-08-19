const Agent = require('../models/Agent.model');
const User = require('../models/User.model');
const Doctor = require('../models/Doctor.model');
const ClinicVisit = require('../models/ClinicVisit.model');
const Patient = require('../models/Patient.model');
const { Payment } = require('../models/Payment.model');
const notificationService = require('../services/notification.service');
const { writeAuditLog } = require('../utils/auditLogger');
const { buildSearchFilter, buildSort, paginateModel } = require('../utils/queryHelpers');
const asyncHandler = require('../utils/asyncHandler');

const VISIT_OUTCOMES = ['doctor_registered', 'interested', 'follow_up_required', 'not_interested', 'call_later', 'clinic_closed', 'incorrect_location'];
const INTEREST_LEVELS = ['very_interested', 'interested', 'neutral', 'not_interested'];
const FOLLOW_UP_STATUSES = ['not_required', 'scheduled', 'completed', 'missed', 'cancelled'];

// Loads the agent profile for the authenticated Agent user.
const getCurrentAgent = async (req) => {
  const agent = await Agent.findOne({ user: req.user._id });
  if (!agent) {
    const error = new Error('Agent profile not found');
    error.status = 404;
    throw error;
  }
  return agent;
};

// Validates enum fields used by clinic visit workflows.
const assertAllowedValue = (field, value, allowedValues) => {
  if (value !== undefined && value !== null && value !== '' && !allowedValues.includes(value)) {
    const error = new Error(`${field} must be one of: ${allowedValues.join(', ')}`);
    error.status = 400;
    throw error;
  }
};

// Returns the default follow-up status based on outcome and date.
const resolveFollowUpStatus = ({ outcome, followUpDate, followUpStatus }) => {
  if (followUpStatus) return followUpStatus;
  if (outcome === 'follow_up_required' || followUpDate) return 'scheduled';
  return 'not_required';
};

// Verifies that an agent can attach a registered doctor to a clinic visit.
const validateDoctorForAgent = async ({ doctorId, agentId }) => {
  if (!doctorId) return null;
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    const error = new Error('Doctor not found');
    error.status = 404;
    throw error;
  }
  if (doctor.agent?.toString() !== agentId.toString()) {
    const error = new Error('Agent cannot create visits for another agent doctor');
    error.status = 403;
    throw error;
  }
  return doctor;
};

// Builds a clinic visit filter for Admin or current Agent.
const buildVisitFilter = (req, agentId) => {
  const filter = {};
  if (agentId) filter.agent = agentId;
  if (req.query.agentId && req.user.role === 'admin') filter.agent = req.query.agentId;
  if (req.query.doctorId) filter.doctor = req.query.doctorId;
  if (req.query.outcome) filter.outcome = req.query.outcome;
  if (req.query.followUpStatus) filter.followUpStatus = req.query.followUpStatus;
  if (req.query.fromDate || req.query.toDate) {
    filter.visitDate = {};
    if (req.query.fromDate) filter.visitDate.$gte = new Date(req.query.fromDate);
    if (req.query.toDate) filter.visitDate.$lte = new Date(req.query.toDate);
  }
  if (req.query.search) {
    Object.assign(filter, buildSearchFilter(req.query.search, ['doctorName', 'clinicName', 'clinicLocation', 'discussionDetails']));
  }
  return filter;
};

// Sends an in-app notification to the assigned agent for a scheduled follow-up.
const createFollowUpNotification = async (visit) => {
  if (!visit.followUpDate || visit.followUpStatus !== 'scheduled') return;
  await notificationService.createNotification({
    recipientType: 'agent',
    agent: visit.agent,
    type: 'clinic_visit_reminder',
    channel: 'in_app',
    title: 'Clinic follow-up scheduled',
    message: `Follow-up scheduled for ${visit.clinicName || visit.doctorName || visit._id} on ${visit.followUpDate.toISOString().slice(0, 10)}.`,
  });
};

// POST /api/agents - Admin creates an agent.
const createAgent = asyncHandler(async (req, res) => {
  const { email, mobile, password, user, ...agentPayload } = req.body;

  let loginUser = user ? await User.findById(user) : null;
  const generatedPassword = password || `Agent@${Math.floor(100000 + Math.random() * 900000)}`;

  if (!loginUser) {
    const existing = await User.findOne({
      $or: [
        ...(email ? [{ email: email.trim().toLowerCase() }] : []),
        ...(mobile ? [{ mobile: mobile.trim() }] : []),
      ],
    });
    if (existing) return res.status(409).json({ message: 'A user with this email or mobile already exists' });

    loginUser = await User.create({
      role: 'agent',
      email: email?.trim().toLowerCase(),
      mobile: mobile?.trim(),
      password: generatedPassword,
      status: 'active',
    });
  }

  const agent = await Agent.create({
    ...agentPayload,
    user: loginUser._id,
    email: email || loginUser.email,
    mobile: mobile || loginUser.mobile,
  });

  loginUser.profileRef = agent._id;
  loginUser.profileModel = 'Agent';
  await loginUser.save();

  await writeAuditLog({ req, action: 'agent_created', module: 'Agent', recordId: agent._id, newValue: { fullName: agent.fullName, user: loginUser._id } });
  res.status(201).json({
    agent,
    user: { id: loginUser._id, email: loginUser.email, mobile: loginUser.mobile, role: loginUser.role },
    temporaryPassword: password ? undefined : generatedPassword,
  });
});

// GET /api/agents - Admin gets all agents.
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
  if (agent.user && (req.body.status || req.body.email || req.body.mobile)) {
    await User.findByIdAndUpdate(agent.user, {
      ...(req.body.status ? { status: req.body.status === 'suspended' ? 'suspended' : req.body.status === 'inactive' ? 'inactive' : 'active' } : {}),
      ...(req.body.email ? { email: req.body.email.trim().toLowerCase() } : {}),
      ...(req.body.mobile ? { mobile: req.body.mobile.trim() } : {}),
    });
  }
  res.json(agent);
});

// DELETE /api/agents/:id - Admin terminates an agent without deleting history.
const deleteAgent = asyncHandler(async (req, res) => {
  const agent = await Agent.findById(req.params.id);
  if (!agent) return res.status(404).json({ message: 'Agent not found' });

  const previousValue = { status: agent.status };
  agent.status = 'terminated';
  await agent.save();

  if (agent.user) {
    await User.findByIdAndUpdate(agent.user, {
      status: 'terminated',
      $inc: { tokenVersion: 1 },
    });
  }

  await writeAuditLog({
    req,
    action: 'agent_terminated',
    module: 'Agent',
    recordId: agent._id,
    previousValue,
    newValue: { status: agent.status },
  });

  res.json({ message: 'Agent terminated', agent });
});

// GET /api/agents/me/dashboard - Agent dashboard stats.
const getMyDashboard = asyncHandler(async (req, res) => {
  const agent = await getCurrentAgent(req);

  const [totalDoctors, pendingApproval, approved, rejected, recentVisits] = await Promise.all([
    Doctor.countDocuments({ agent: agent._id }),
    Doctor.countDocuments({ agent: agent._id, status: 'submitted' }),
    Doctor.countDocuments({ agent: agent._id, status: 'approved' }),
    Doctor.countDocuments({ agent: agent._id, status: 'rejected' }),
    ClinicVisit.find({ agent: agent._id })
      .populate('doctor', 'doctorId fullName clinicName')
      .sort({ visitDate: -1, createdAt: -1 })
      .limit(5),
  ]);

  const agentDoctorIds = (await Doctor.find({ agent: agent._id }, '_id')).map((doctor) => doctor._id);
  const totalPatients = await Patient.countDocuments({ referringDoctor: { $in: agentDoctorIds } });
  const totalPaidPatients = await Payment.countDocuments({ doctor: { $in: agentDoctorIds }, status: 'successful' });

  const revenueResult = await Payment.aggregate([
    { $match: { doctor: { $in: agentDoctorIds }, status: 'successful' } },
    { $group: { _id: null, total: { $sum: '$paidAmount' } } },
  ]);

  const now = new Date();
  const pendingFollowUps = await ClinicVisit.countDocuments({
    agent: agent._id,
    followUpStatus: 'scheduled',
    followUpDate: { $lte: now },
  });

  const upcomingFollowUps = await ClinicVisit.countDocuments({
    agent: agent._id,
    followUpStatus: 'scheduled',
    followUpDate: { $gt: now },
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
    upcomingFollowUps,
    recentVisits,
  });
});

// GET /api/agents/me/doctors - Agent sees only their own doctors.
const getMyDoctors = asyncHandler(async (req, res) => {
  const agent = await getCurrentAgent(req);
  const doctors = await Doctor.find({ agent: agent._id })
    .select('-bankAccountNumber -ifscCode -upiId -panNumber');
  res.json(doctors);
});

// POST /api/agents/me/visits - Agent records a clinic visit.
const addClinicVisit = asyncHandler(async (req, res) => {
  const agent = await getCurrentAgent(req);
  assertAllowedValue('outcome', req.body.outcome, VISIT_OUTCOMES);
  assertAllowedValue('doctorInterestLevel', req.body.doctorInterestLevel, INTEREST_LEVELS);
  assertAllowedValue('followUpStatus', req.body.followUpStatus, FOLLOW_UP_STATUSES);

  await validateDoctorForAgent({ doctorId: req.body.doctor, agentId: agent._id });
  const followUpStatus = resolveFollowUpStatus(req.body);

  const visit = await ClinicVisit.create({
    ...req.body,
    agent: agent._id,
    followUpStatus,
    createdBy: req.user._id,
    updatedBy: req.user._id,
  });

  await createFollowUpNotification(visit);
  res.status(201).json(visit);
});

// GET /api/agents/me/visits - Agent views their clinic visits.
const getMyVisits = asyncHandler(async (req, res) => {
  const agent = await getCurrentAgent(req);
  const result = await paginateModel({
    model: ClinicVisit,
    filter: buildVisitFilter(req, agent._id),
    query: req.query,
    sort: buildSort(req.query.sortBy, req.query.sortOrder, ['visitDate', 'followUpDate', 'createdAt', 'outcome']),
    populate: [
      { path: 'doctor', select: 'doctorId fullName clinicName' },
      { path: 'agent', select: 'agentId fullName' },
    ],
  });
  res.json(result);
});

// GET /api/agents/me/follow-ups - Agent views due and upcoming follow-ups.
const getMyFollowUps = asyncHandler(async (req, res) => {
  const agent = await getCurrentAgent(req);
  const filter = {
    agent: agent._id,
    followUpStatus: req.query.followUpStatus || 'scheduled',
  };
  if (req.query.due === 'true') filter.followUpDate = { $lte: new Date() };

  const result = await paginateModel({
    model: ClinicVisit,
    filter,
    query: req.query,
    sort: { followUpDate: 1, createdAt: -1 },
    populate: [{ path: 'doctor', select: 'doctorId fullName clinicName' }],
  });
  res.json(result);
});

// GET /api/agents/me/visits/:visitId - Agent views one clinic visit.
const getMyVisitById = asyncHandler(async (req, res) => {
  const agent = await getCurrentAgent(req);
  const visit = await ClinicVisit.findOne({ _id: req.params.visitId, agent: agent._id })
    .populate('doctor', 'doctorId fullName clinicName')
    .populate('agent', 'agentId fullName');
  if (!visit) return res.status(404).json({ message: 'Clinic visit not found' });
  res.json(visit);
});

// PATCH /api/agents/me/visits/:visitId - Agent updates their clinic visit.
const updateMyVisit = asyncHandler(async (req, res) => {
  const agent = await getCurrentAgent(req);
  assertAllowedValue('outcome', req.body.outcome, VISIT_OUTCOMES);
  assertAllowedValue('doctorInterestLevel', req.body.doctorInterestLevel, INTEREST_LEVELS);
  assertAllowedValue('followUpStatus', req.body.followUpStatus, FOLLOW_UP_STATUSES);

  if (req.body.doctor) {
    await validateDoctorForAgent({ doctorId: req.body.doctor, agentId: agent._id });
  }

  const visit = await ClinicVisit.findOne({ _id: req.params.visitId, agent: agent._id });
  if (!visit) return res.status(404).json({ message: 'Clinic visit not found' });

  const previousValue = visit.toObject();
  const allowedFields = [
    'doctor', 'doctorName', 'clinicName', 'visitDate', 'visitTime', 'clinicLocation',
    'discussionDetails', 'doctorInterestLevel', 'documentsCollected', 'followUpDate',
    'followUpNotes', 'followUpStatus', 'nextAction', 'outcome', 'photo', 'attachment',
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) visit[field] = req.body[field];
  });
  if (req.body.outcome || req.body.followUpDate) {
    visit.followUpStatus = resolveFollowUpStatus({
      outcome: visit.outcome,
      followUpDate: visit.followUpDate,
      followUpStatus: req.body.followUpStatus,
    });
  }
  visit.updatedBy = req.user._id;
  await visit.save();

  await createFollowUpNotification(visit);
  await writeAuditLog({
    req,
    action: 'clinic_visit_updated',
    module: 'ClinicVisit',
    recordId: visit._id,
    previousValue,
    newValue: visit,
  });

  res.json(visit);
});

// PATCH /api/agents/me/visits/:visitId/follow-up - Agent completes or cancels a follow-up.
const updateMyFollowUp = asyncHandler(async (req, res) => {
  const agent = await getCurrentAgent(req);
  assertAllowedValue('followUpStatus', req.body.followUpStatus, ['completed', 'missed', 'cancelled', 'scheduled']);

  const visit = await ClinicVisit.findOne({ _id: req.params.visitId, agent: agent._id });
  if (!visit) return res.status(404).json({ message: 'Clinic visit not found' });

  const previousValue = visit.toObject();
  visit.followUpStatus = req.body.followUpStatus;
  visit.followUpCompletedNote = req.body.note || visit.followUpCompletedNote;
  visit.nextAction = req.body.nextAction || visit.nextAction;
  visit.updatedBy = req.user._id;
  if (req.body.followUpDate) visit.followUpDate = req.body.followUpDate;
  if (req.body.followUpStatus === 'completed') visit.followUpCompletedAt = new Date();
  if (req.body.followUpStatus === 'scheduled') visit.followUpCompletedAt = null;
  await visit.save();

  await writeAuditLog({
    req,
    action: 'clinic_follow_up_updated',
    module: 'ClinicVisit',
    recordId: visit._id,
    previousValue,
    newValue: {
      followUpStatus: visit.followUpStatus,
      followUpCompletedAt: visit.followUpCompletedAt,
      followUpCompletedNote: visit.followUpCompletedNote,
      nextAction: visit.nextAction,
    },
  });

  res.json(visit);
});

// GET /api/agents/visits - Admin views all clinic visits.
const getAllClinicVisits = asyncHandler(async (req, res) => {
  const result = await paginateModel({
    model: ClinicVisit,
    filter: buildVisitFilter(req),
    query: req.query,
    sort: buildSort(req.query.sortBy, req.query.sortOrder, ['visitDate', 'followUpDate', 'createdAt', 'outcome']),
    populate: [
      { path: 'agent', select: 'agentId fullName assignedRegion' },
      { path: 'doctor', select: 'doctorId fullName clinicName' },
    ],
  });
  res.json(result);
});

module.exports = {
  createAgent,
  getAllAgents,
  getAgentById,
  updateAgent,
  deleteAgent,
  getMyDashboard,
  getMyDoctors,
  addClinicVisit,
  getMyVisits,
  getMyFollowUps,
  getMyVisitById,
  updateMyVisit,
  updateMyFollowUp,
  getAllClinicVisits,
};
