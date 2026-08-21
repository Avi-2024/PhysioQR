const mongoose = require('mongoose');
const ClinicVisit = require('../../models/ClinicVisit.model');
const { buildSearchFilter, buildSort, paginateModel } = require('../../utils/queryHelpers');
const asyncHandler = require('../../utils/asyncHandler');

const VISIT_OUTCOMES = ['doctor_registered', 'interested', 'follow_up_required', 'not_interested', 'call_later', 'clinic_closed', 'incorrect_location'];
const INTEREST_LEVELS = ['very_interested', 'interested', 'neutral', 'not_interested'];
const FOLLOW_UP_STATUSES = ['not_required', 'scheduled', 'completed', 'missed', 'cancelled'];

const buildFilter = (query = {}) => {
  const filter = {};
  if (query.agentId) filter.agent = query.agentId;
  if (query.doctorId) filter.doctor = query.doctorId;
  if (query.outcome && VISIT_OUTCOMES.includes(query.outcome)) filter.outcome = query.outcome;
  if (query.interestLevel && INTEREST_LEVELS.includes(query.interestLevel)) filter.doctorInterestLevel = query.interestLevel;
  if (query.followUpStatus && FOLLOW_UP_STATUSES.includes(query.followUpStatus)) filter.followUpStatus = query.followUpStatus;
  if (query.fromDate || query.toDate) {
    filter.visitDate = {};
    if (query.fromDate) filter.visitDate.$gte = new Date(query.fromDate);
    if (query.toDate) {
      const end = new Date(query.toDate);
      end.setHours(23, 59, 59, 999);
      filter.visitDate.$lte = end;
    }
  }
  if (query.search) {
    Object.assign(filter, buildSearchFilter(query.search, ['doctorName', 'clinicName', 'clinicLocation', 'discussionDetails', 'nextAction', 'followUpNotes']));
  }
  return filter;
};

const getClinicVisits = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query);
  const now = new Date();

  const [result, total, scheduled, overdue, completed, doctorRegistered] = await Promise.all([
    paginateModel({
      model: ClinicVisit,
      filter,
      query: req.query,
      sort: buildSort(req.query.sortBy, req.query.sortOrder, ['visitDate', 'followUpDate', 'createdAt', 'outcome', 'doctorInterestLevel']),
      populate: [
        { path: 'agent', select: 'agentId fullName assignedRegion mobile' },
        { path: 'doctor', select: 'doctorId fullName clinicName city state status' },
      ],
    }),
    ClinicVisit.countDocuments(),
    ClinicVisit.countDocuments({ followUpStatus: 'scheduled' }),
    ClinicVisit.countDocuments({ followUpStatus: 'scheduled', followUpDate: { $lt: now } }),
    ClinicVisit.countDocuments({ followUpStatus: 'completed' }),
    ClinicVisit.countDocuments({ outcome: 'doctor_registered' }),
  ]);

  res.json({
    ...result,
    summary: { total, scheduled, overdue, completed, doctorRegistered },
  });
});

const getClinicVisitById = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid clinic visit id' });
  }

  const visit = await ClinicVisit.findById(req.params.id)
    .populate('agent', 'agentId fullName assignedRegion mobile email status')
    .populate('doctor', 'doctorId fullName clinicName city state mobile email status specialization')
    .lean();

  if (!visit) return res.status(404).json({ message: 'Clinic visit not found' });

  const now = new Date();
  const followUpDue = visit.followUpStatus === 'scheduled' && visit.followUpDate && new Date(visit.followUpDate) < now;

  res.json({
    ...visit,
    id: visit._id,
    followUpDue,
    canAdminEdit: false,
    ownership: {
      role: 'agent',
      message: 'Clinic visits are recorded and updated by the assigned field agent. Admin is read-only for audit integrity.',
    },
  });
});

module.exports = { getClinicVisits, getClinicVisitById };
