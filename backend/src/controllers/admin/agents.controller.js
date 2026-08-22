const Agent = require('../../models/Agent.model');
const Doctor = require('../../models/Doctor.model');
const Patient = require('../../models/Patient.model');
const { Payment } = require('../../models/Payment.model');
const { buildSearchFilter, buildSort, paginateModel } = require('../../utils/queryHelpers');
const asyncHandler = require('../../utils/asyncHandler');

const AGENT_STATUSES = ['active', 'inactive', 'suspended', 'terminated'];
const isObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value));

const normalizeAgent = (agent) => ({
  ...agent,
  id: agent.agentId || agent._id,
});

const getAgents = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const filter = {
    ...buildSearchFilter(search, ['agentId', 'fullName', 'mobile', 'email', 'city', 'state', 'assignedRegion']),
  };

  if (status && AGENT_STATUSES.includes(status)) {
    filter.status = status;
  }

  const [result, summaryRows] = await Promise.all([
    paginateModel({
      model: Agent,
      filter,
      query: req.query,
      sort: buildSort(req.query.sortBy, req.query.sortOrder, ['createdAt', 'joiningDate', 'fullName', 'city', 'assignedRegion', 'status']),
      select: '-identityProof',
    }),
    Agent.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const summary = { total: 0, active: 0, inactive: 0, suspended: 0, terminated: 0 };
  summaryRows.forEach((row) => {
    if (Object.prototype.hasOwnProperty.call(summary, row._id)) summary[row._id] = Number(row.count || 0);
    summary.total += Number(row.count || 0);
  });

  res.json({ items: result.items.map(normalizeAgent), meta: result.meta, summary });
});

const getAgentById = asyncHandler(async (req, res) => {
  const agent = await Agent.findOne({
    $or: [
      ...(isObjectId(req.params.id) ? [{ _id: req.params.id }] : []),
      { agentId: req.params.id },
    ],
  }).select('-identityProof').lean();

  if (!agent) return res.status(404).json({ message: 'Agent not found' });

  const doctors = await Doctor.find({ agent: agent._id })
    .select('doctorId fullName clinicName city status approvedPatientFee revenueModel createdAt')
    .sort({ createdAt: -1 })
    .lean();

  const doctorIds = doctors.map((doctor) => doctor._id);
  const [patientsGenerated, paidPatients, revenue] = await Promise.all([
    Patient.countDocuments({ referringDoctor: { $in: doctorIds } }),
    Payment.countDocuments({ doctor: { $in: doctorIds }, status: { $in: ['successful', 'manually_verified'] } }),
    Payment.aggregate([
      { $match: { doctor: { $in: doctorIds }, status: { $in: ['successful', 'manually_verified'] } } },
      { $group: { _id: null, total: { $sum: '$paidAmount' } } },
    ]),
  ]);

  res.json({
    ...normalizeAgent(agent),
    metrics: {
      doctorsRegistered: doctors.length,
      patientsGenerated,
      paidPatients,
      revenueGenerated: revenue[0]?.total || 0,
    },
    doctors,
  });
});

module.exports = { getAgents, getAgentById };
