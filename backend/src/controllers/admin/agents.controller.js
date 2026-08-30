const Agent = require('../../models/Agent.model');
const Doctor = require('../../models/Doctor.model');
const Patient = require('../../models/Patient.model');
const { Payment } = require('../../models/Payment.model');
const { writeAuditLog } = require('../../utils/auditLogger');
const { buildSearchFilter, buildSort, paginateModel } = require('../../utils/queryHelpers');
const asyncHandler = require('../../utils/asyncHandler');

const AGENT_STATUSES = ['active', 'inactive', 'suspended', 'terminated'];
const VERIFIED_PAYMENT_STATUSES = ['successful', 'manually_verified', 'partially_refunded', 'refunded'];
const isObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value));
const normalizeAgent = (agent) => ({ ...agent, id: agent.agentId || agent._id });
const agentIdentityFilter = (value) => ({ $or: [...(isObjectId(value) ? [{ _id: value }] : []), { agentId: value }] });

const getAgents = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const filter = { ...buildSearchFilter(search, ['agentId', 'fullName', 'mobile', 'email', 'city', 'state', 'assignedRegion']) };
  if (status && AGENT_STATUSES.includes(status)) filter.status = status;
  const [result, summaryRows] = await Promise.all([
    paginateModel({ model: Agent, filter, query: req.query, sort: buildSort(req.query.sortBy, req.query.sortOrder, ['createdAt', 'joiningDate', 'fullName', 'city', 'assignedRegion', 'status']), select: '-identityProof' }),
    Agent.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);
  const summary = { total: 0, active: 0, inactive: 0, suspended: 0, terminated: 0 };
  summaryRows.forEach((row) => { if (Object.prototype.hasOwnProperty.call(summary, row._id)) summary[row._id] = Number(row.count || 0); summary.total += Number(row.count || 0); });
  res.json({ items: result.items.map(normalizeAgent), meta: result.meta, summary });
});

const getAgentById = asyncHandler(async (req, res) => {
  const agent = await Agent.findOne(agentIdentityFilter(req.params.id)).select('-identityProof').lean();
  if (!agent) return res.status(404).json({ message: 'Agent not found' });
  const doctors = await Doctor.find({ agent: agent._id }).select('doctorId fullName clinicName city status approvedPatientFee revenueModel createdAt').sort({ createdAt: -1 }).lean();
  const doctorIds = doctors.map((doctor) => doctor._id);
  const [patientsGenerated, paidPatientIds, revenue] = await Promise.all([
    Patient.countDocuments({ referringDoctor: { $in: doctorIds } }),
    Payment.distinct('patient', { doctor: { $in: doctorIds }, status: { $in: VERIFIED_PAYMENT_STATUSES } }),
    Payment.aggregate([{ $match: { doctor: { $in: doctorIds }, status: { $in: VERIFIED_PAYMENT_STATUSES } } }, { $group: { _id: null, paid: { $sum: { $ifNull: ['$paidAmount', 0] } }, refunded: { $sum: { $ifNull: ['$refundAmount', 0] } } } }]),
  ]);
  const revenueRow = revenue[0] || { paid: 0, refunded: 0 };
  res.json({ ...normalizeAgent(agent), metrics: { doctorsRegistered: doctors.length, patientsGenerated, paidPatients: paidPatientIds.length, revenueGenerated: Math.max((revenueRow.paid || 0) - (revenueRow.refunded || 0), 0) }, doctors });
});

const updateAgentTarget = asyncHandler(async (req, res) => {
  const target = req.body.monthlyOnboardingTarget;
  if (target !== null && (!Number.isInteger(target) || target < 0 || target > 10000)) return res.status(400).json({ message: 'monthlyOnboardingTarget must be an integer from 0 to 10000, or null' });
  const agent = await Agent.findOne(agentIdentityFilter(req.params.id));
  if (!agent) return res.status(404).json({ message: 'Agent not found' });
  const previousValue = { monthlyOnboardingTarget: agent.monthlyOnboardingTarget ?? null };
  agent.monthlyOnboardingTarget = target === null ? undefined : target;
  await agent.save();
  await writeAuditLog({ req, action: 'agent_monthly_target_updated', module: 'Agent', recordId: agent._id, previousValue, newValue: { monthlyOnboardingTarget: agent.monthlyOnboardingTarget ?? null } });
  res.json({ message: 'Agent monthly target updated', monthlyOnboardingTarget: agent.monthlyOnboardingTarget ?? null });
});

module.exports = { getAgents, getAgentById, updateAgentTarget };
