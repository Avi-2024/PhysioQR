const PatientProgram = require('../models/PatientProgram.model');
const asyncHandler = require('../utils/asyncHandler');

const enrollmentPopulate = [
  { path: 'program', select: 'programCode name nameHindi description durationDays sessionsPerDay painCategory isActive' },
  { path: 'doctor', select: 'doctorId fullName clinicName' },
];

const listMyPrograms = asyncHandler(async (req, res) => {
  const items = await PatientProgram.find({ patient: req.user._id, status: { $in: ['active', 'paused', 'completed'] } })
    .populate(enrollmentPopulate)
    .sort({ status: 1, startDate: -1, createdAt: -1 })
    .lean();
  res.json(items);
});

const getMyProgramByEnrollment = asyncHandler(async (req, res) => {
  const item = await PatientProgram.findOne({
    _id: req.params.enrollmentId,
    patient: req.user._id,
    status: { $in: ['active', 'paused', 'completed'] },
  }).populate(enrollmentPopulate).lean();
  if (!item) return res.status(404).json({ message: 'Patient programme enrollment not found' });
  res.json(item);
});

module.exports = { listMyPrograms, getMyProgramByEnrollment };
