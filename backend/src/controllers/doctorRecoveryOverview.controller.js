const Doctor = require('../models/Doctor.model');
const Patient = require('../models/Patient.model');
const PatientProgram = require('../models/PatientProgram.model');
const ProgramProgress = require('../models/ProgramProgress.model');
const asyncHandler = require('../utils/asyncHandler');
const { buildRecoveryPipeline, summarizeOverview } = require('../services/doctorRecoveryOverview.service');

// GET /api/doctors/me/recovery-overview
// Doctor-only, read-only, no diagnostic interpretation, restricted to the
// signed-in doctor's referred patients AND their doctor-linked enrollments.
const getMyRecoveryOverview = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ user: req.user._id }).select('_id').lean();
  if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const patients = await Patient.find({ referringDoctor: doctor._id })
    .select('_id patientId fullName').lean();
  const patientIds = patients.map((patient) => patient._id);
  const enrollments = patientIds.length
    ? await PatientProgram.find({ doctor: doctor._id, patient: { $in: patientIds } })
      .select('_id patient program')
      .populate('program', 'name')
      .lean()
    : [];
  const enrollmentIds = enrollments.map((entry) => entry._id);

  const [aggregate] = enrollmentIds.length
    ? await ProgramProgress.aggregate(buildRecoveryPipeline({
      patientIds, enrollmentIds, since,
    }))
    : [{ totals: [], updates: [] }];

  res.set('Cache-Control', 'private, no-store');
  return res.json(summarizeOverview({ result: aggregate, patients, enrollments, since }));
});

module.exports = { getMyRecoveryOverview };
