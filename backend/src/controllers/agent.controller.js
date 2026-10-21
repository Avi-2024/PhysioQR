const crypto = require('crypto');
const Agent = require('../models/Agent.model');
const User = require('../models/User.model');
const Doctor = require('../models/Doctor.model');
const ClinicVisit = require('../models/ClinicVisit.model');
const Patient = require('../models/Patient.model');
const { getPatientCountsByDoctor, countDoctorsWithPatients } = require('../services/agentPatientCounts.service');
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


const AGENT_STATUSES = ['active', 'inactive', 'suspended', 'terminated'];
const AGENT_PROFILE_FIELDS = ['fullName', 'mobile', 'email', 'whatsapp', 'address', 'city', 'state', 'assignedRegion', 'reportingPerson', 'joiningDate', 'monthlyOnboardingTarget'];
const AGENT_TEXT_LIMITS = { fullName: 150, mobile: 15, email: 160, whatsapp: 15, address: 500, city: 100, state: 100, assignedRegion: 160, reportingPerson: 160 };
const validateAgentPayload = (body, { creating = false } = {}) => {
  const values = {};
  for (const field of AGENT_PROFILE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(body, field)) continue;
    const value = body[field];
    if (field === 'monthlyOnboardingTarget') {
      if (value === null || value === '') { values[field] = undefined; continue; }
      if (!Number.isInteger(value) || value < 0 || value > 10000) return { error: 'Monthly target must be an integer from 0 to 10000' };
      values[field] = value;
    } else if (field === 'joiningDate') {
      if (value === '' || value === null) { values[field] = undefined; continue; }
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) return { error: 'Joining date must be a valid YYYY-MM-DD date' };
      values[field] = new Date(value);
    } else {
      if (typeof value !== 'string' || value.trim().length > AGENT_TEXT_LIMITS[field]) return { error: `Invalid ${field}` };
      values[field] = value.trim();
    }
  }
  if ((creating || Object.prototype.hasOwnProperty.call(values, 'fullName')) && (!values.fullName || values.fullName.length < 2)) return { error: 'Full name must have at least 2 characters' };
  if ((creating || Object.prototype.hasOwnProperty.call(values, 'mobile')) && !/^\+?\d{10,15}$/.test(values.mobile || '')) return { error: 'Mobile must contain 10–15 digits' };
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) return { error: 'Invalid email address' };
  if (values.whatsapp && !/^\+?\d{10,15}$/.test(values.whatsapp)) return { error: 'Invalid WhatsApp number' };
  if (values.email !== undefined) values.email = values.email.toLowerCase();
  if (body.status !== undefined && !AGENT_STATUSES.includes(body.status)) return { error: 'Invalid agent status' };
  return { values };
};
const loginConflict = async ({ mobile, email, excludeId }) => {
  const match = [{ mobile }, ...(email ? [{ email }] : [])].filter(x => Object.values(x)[0]);
  return match.length ? User.findOne({ ...(excludeId ? { _id: { $ne: excludeId } } : {}), $or: match }).select('_id').lean() : null;
};

// POST /api/agents - Admin creates an agent.
const createAgent = asyncHandler(async (req, res) => {
  const { values, error } = validateAgentPayload(req.body, { creating: true });
  if (error) return res.status(400).json({ message: error });
  if (req.body.status && req.body.status !== 'active') return res.status(400).json({ message: 'Create agents as active; manage status from their profile' });
  if (await loginConflict(values)) return res.status(409).json({ message: 'An account with this email or mobile already exists' });

  const temporaryPassword = `Agent@${crypto.randomInt(100000, 1000000)}${crypto.randomBytes(3).toString('hex')}`;
  let loginUser;
  try {
    loginUser = await User.create({
      role: 'agent', email: values.email || undefined, mobile: values.mobile,
      password: temporaryPassword, status: 'active', mustChangePassword: true,
    });
    const agent = await Agent.create({ ...values, user: loginUser._id, status: 'active' });
    loginUser.profileRef = agent._id;
    loginUser.profileModel = 'Agent';
    await loginUser.save();
    await writeAuditLog({ req, action: 'agent_created', module: 'Agent', recordId: agent._id, newValue: { fullName: agent.fullName, user: loginUser._id } });
    return res.status(201).json({
      agent, user: { id: loginUser._id, email: loginUser.email, mobile: loginUser.mobile, role: loginUser.role },
      temporaryPassword,
    });
  } catch (err) {
    // Do not leave a login account stranded when the agent profile could not be created.
    if (loginUser) {
      const linkedAgent = await Agent.findOne({ user: loginUser._id }).select('_id').lean();
      if (!linkedAgent) await User.deleteOne({ _id: loginUser._id });
    }
    if (err?.code === 11000) return res.status(409).json({ message: 'Agent ID or account contact already exists; retry' });
    throw err;
  }
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
  const agent = await Agent.findById(req.params.id);
  if (!agent) return res.status(404).json({ message: 'Agent not found' });
  if (agent.status === 'terminated') return res.status(409).json({ message: 'Terminated agents cannot be edited or reactivated' });

  const { values, error } = validateAgentPayload(req.body);
  if (error) return res.status(400).json({ message: error });
  const statusChanged = req.body.status !== undefined && req.body.status !== agent.status;
  const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
  if (statusChanged && (reason.length < 5 || reason.length > 500)) return res.status(400).json({ message: 'A reason (5–500 characters) is required for status changes' });
  if (req.body.status === 'terminated') return res.status(400).json({ message: 'Use the terminate action to terminate an agent' });

  const user = await User.findById(agent.user);
  if (!user || user.role !== 'agent') return res.status(409).json({ message: 'Linked agent login account is missing or invalid' });
  if (await loginConflict({ mobile: values.mobile ?? agent.mobile, email: values.email ?? agent.email, excludeId: user._id })) {
    return res.status(409).json({ message: 'Email or mobile is already used by another account' });
  }

  const before = { fullName: agent.fullName, mobile: agent.mobile, email: agent.email, status: agent.status, assignedRegion: agent.assignedRegion };
  const contactChanged = (values.mobile !== undefined && values.mobile !== user.mobile) || (values.email !== undefined && values.email !== (user.email || ''));
  Object.entries(values).forEach(([field, value]) => { agent[field] = value; });
  if (statusChanged) agent.status = req.body.status;

  // Keep the login identity/status in sync, and revoke existing sessions on contact or status changes.
  if (values.mobile !== undefined) user.mobile = values.mobile;
  if (values.email !== undefined) user.email = values.email || undefined;
  if (statusChanged) user.status = agent.status;
  if (contactChanged || statusChanged) user.tokenVersion = (user.tokenVersion || 0) + 1;
  try {
    if (contactChanged || statusChanged) await user.save();
    await agent.save();
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ message: 'Email or mobile is already used by another account' });
    throw err;
  }
  await writeAuditLog({
    req, action: statusChanged ? 'agent_status_changed' : 'agent_updated', module: 'Agent',
    recordId: agent._id, previousValue: before,
    newValue: { fullName: agent.fullName, mobile: agent.mobile, email: agent.email, status: agent.status, assignedRegion: agent.assignedRegion },
    reason: reason || undefined,
  });
  res.json(agent);
});

// DELETE /api/agents/:id - Admin terminates an agent without deleting history.
const deleteAgent = asyncHandler(async (req, res) => {
  const agent = await Agent.findById(req.params.id);
  if (!agent) return res.status(404).json({ message: 'Agent not found' });
  if (agent.status === 'terminated') return res.json({ message: 'Agent already terminated', agent });
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
  if (reason.length < 5 || reason.length > 500 || req.body?.confirmation !== agent.agentId) {
    return res.status(400).json({ message: 'Enter the Agent ID and a reason (5–500 characters) to confirm termination' });
  }

  const previousValue = { status: agent.status };
  agent.status = 'terminated';
  await User.updateOne({ _id: agent.user, role: 'agent' }, { $set: { status: 'terminated' }, $inc: { tokenVersion: 1 } });
  await agent.save();
  // Preserve agent, doctors, visits, referrals, payments, and audit history.
  await writeAuditLog({
    req, action: 'agent_terminated', module: 'Agent', recordId: agent._id, previousValue,
    newValue: { status: agent.status }, reason,
  });
  res.json({ message: 'Agent terminated; historical records retained', agent });
});

// GET /api/agents/me/dashboard - Agent dashboard stats.
const getMyDashboard = asyncHandler(async (req, res) => {
  const agent = await getCurrentAgent(req);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const agentDoctorIds = (await Doctor.find({ agent: agent._id }, '_id').lean()).map((doctor) => doctor._id);

  const [
    totalDoctors,
    pendingApproval,
    approved,
    rejected,
    activeDoctors,
    monthlyOnboarded,
    totalPatients,
    pendingFollowUps,
    upcomingFollowUps,
    recentVisits,
    todaysVisits,
    dueFollowUps,
    recentApprovedDoctors,
  ] = await Promise.all([
    Doctor.countDocuments({ agent: agent._id }),
    Doctor.countDocuments({ agent: agent._id, status: { $in: ['submitted', 'under_review', 'documents_required'] } }),
    Doctor.countDocuments({ agent: agent._id, status: 'approved' }),
    Doctor.countDocuments({ agent: agent._id, status: 'rejected' }),
    Doctor.countDocuments({ agent: agent._id, status: 'approved', qrCodeActive: true }),
    Doctor.countDocuments({ agent: agent._id, createdAt: { $gte: monthStart, $lt: nextMonthStart } }),
    Patient.countDocuments({ referringDoctor: { $in: agentDoctorIds } }),
    ClinicVisit.countDocuments({ agent: agent._id, followUpStatus: 'scheduled', followUpDate: { $lte: now } }),
    ClinicVisit.countDocuments({ agent: agent._id, followUpStatus: 'scheduled', followUpDate: { $gt: now } }),
    ClinicVisit.find({ agent: agent._id })
      .populate('doctor', 'doctorId fullName clinicName status')
      .sort({ visitDate: -1, createdAt: -1 })
      .limit(5)
      .lean(),
    ClinicVisit.find({ agent: agent._id, visitDate: { $gte: todayStart, $lt: tomorrowStart } })
      .populate('doctor', 'doctorId fullName clinicName status')
      .sort({ visitDate: 1, visitTime: 1 })
      .limit(8)
      .lean(),
    ClinicVisit.find({ agent: agent._id, followUpStatus: 'scheduled', followUpDate: { $lte: now } })
      .populate('doctor', 'doctorId fullName clinicName status')
      .sort({ followUpDate: 1 })
      .limit(5)
      .lean(),
    Doctor.find({ agent: agent._id, status: 'approved' })
      .select('doctorId fullName clinicName approvalDate qrCodeActive updatedAt')
      .sort({ approvalDate: -1, updatedAt: -1 })
      .limit(5)
      .lean(),
  ]);

  const doctorPatientCounts = await getPatientCountsByDoctor(agentDoctorIds);
  const doctorsWithPatients = countDoctorsWithPatients(doctorPatientCounts);
  const monthlyTarget = Number.isFinite(agent.monthlyOnboardingTarget) ? agent.monthlyOnboardingTarget : null;
  const targetAchievementPercentage = monthlyTarget && monthlyTarget > 0
    ? Math.min(100, Math.round((monthlyOnboarded / monthlyTarget) * 100))
    : null;

  res.json({
    agent: {
      agentId: agent.agentId,
      fullName: agent.fullName,
      assignedRegion: agent.assignedRegion,
      status: agent.status,
    },
    totalDoctors,
    pendingApproval,
    approved,
    rejected,
    activeDoctors,
    monthlyOnboarded,
    monthlyTarget,
    targetAchievementPercentage,
    totalPatients,
    doctorsWithPatients,
    pendingFollowUps,
    upcomingFollowUps,
    todaysVisits,
    dueFollowUps,
    recentApprovedDoctors,
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
