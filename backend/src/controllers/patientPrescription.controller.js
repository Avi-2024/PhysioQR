const QRCode = require('qrcode');
const PatientProgram = require('../models/PatientProgram.model');
const PatientAssessment = require('../models/PatientAssessment.model');
const { ProgramDay } = require('../models/Exercise.model');
const asyncHandler = require('../utils/asyncHandler');

const enrollmentPopulate = [
  { path: 'patient', select: 'patientId fullName mobile age dateOfBirth gender preferredLanguage' },
  { path: 'program', select: 'programCode name nameHindi description durationDays sessionsPerDay instructions precautions painCategory' },
  { path: 'doctor', select: 'doctorId fullName qualification specialization clinicName clinicAddress city state postalCode clinicContact clinicEmail' },
];

const getMyPrescription = asyncHandler(async (req, res) => {
  const patientId = req.user._id;

  const unresolvedAssessment = await PatientAssessment.findOne({
    patient: patientId,
    status: { $in: ['pending_review', 'blocked'] },
  })
    .sort({ status: 1, createdAt: -1 })
    .select('_id status reviewType hasRedFlag createdAt')
    .lean();

  if (unresolvedAssessment) {
    return res.status(409).json({
      code: unresolvedAssessment.status === 'blocked' ? 'REHAB_ACCESS_BLOCKED' : 'CLINICAL_REVIEW_PENDING',
      message: unresolvedAssessment.status === 'blocked'
        ? 'Rehabilitation access is paused until clinical clearance is completed.'
        : 'Your assessment is awaiting clinical review before rehabilitation exercises can be accessed.',
      assessment: unresolvedAssessment,
    });
  }

  const activeEnrollments = await PatientProgram.find({ patient: patientId, status: 'active' })
    .populate('program', 'programCode name nameHindi durationDays')
    .sort({ startDate: -1, createdAt: -1 })
    .lean();

  if (!activeEnrollments.length) {
    return res.status(404).json({ message: 'No active rehabilitation prescription found.' });
  }

  const requestedEnrollmentId = String(req.query.enrollmentId || '').trim();
  const selectedSummary = requestedEnrollmentId
    ? activeEnrollments.find((item) => String(item._id) === requestedEnrollmentId)
    : activeEnrollments[0];
  if (!selectedSummary) return res.status(404).json({ message: 'Selected rehabilitation programme is not active for this patient.' });

  const enrollment = await PatientProgram.findOne({ _id: selectedSummary._id, patient: patientId, status: 'active' })
    .populate(enrollmentPopulate)
    .lean();

  if (!enrollment) return res.status(404).json({ message: 'Selected rehabilitation prescription is unavailable.' });

  const currentDay = Math.max(1, Number(enrollment.currentDay || 1));
  const programDay = await ProgramDay.findOne({
    program: enrollment.program?._id || enrollment.program,
    dayNumber: currentDay,
    isActive: true,
  })
    .populate('exercises.exercise')
    .lean();

  const exerciseEntries = (programDay?.exercises || [])
    .filter((entry) => entry.exercise?.isActive !== false)
    .sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0));

  const languages = [...new Set(exerciseEntries.map((entry) => entry.exercise?.language).filter(Boolean))];
  const frontendBase = String(process.env.FRONTEND_URL || '').split(',')[0].trim().replace(/\/$/, '');
  const prescriptionUrl = frontendBase ? `${frontendBase}/patient/programme?enrollment=${enrollment._id}` : '';
  const prescriptionQr = prescriptionUrl ? await QRCode.toDataURL(prescriptionUrl, { margin: 1, width: 180 }) : '';

  res.json({
    prescriptionId: `RX-${String(enrollment._id).slice(-8).toUpperCase()}`,
    prescriptionDate: enrollment.startDate || enrollment.createdAt,
    prescriptionUrl,
    prescriptionQr,
    enrollment: {
      id: enrollment._id,
      currentDay,
      completionPercentage: enrollment.completionPercentage || 0,
      startDate: enrollment.startDate,
      expiryDate: enrollment.expiryDate,
      unlockMethod: enrollment.unlockMethod,
    },
    activePrograms: activeEnrollments.map((item) => ({
      enrollmentId: item._id,
      currentDay: item.currentDay,
      completionPercentage: item.completionPercentage || 0,
      startDate: item.startDate,
      expiryDate: item.expiryDate,
      program: item.program,
    })),
    patient: enrollment.patient,
    doctor: enrollment.doctor,
    program: enrollment.program,
    day: programDay ? {
      id: programDay._id,
      dayNumber: programDay.dayNumber,
      title: programDay.title,
      exercises: exerciseEntries,
    } : {
      dayNumber: currentDay,
      title: '',
      exercises: [],
    },
    availableLanguages: languages.length ? languages : ['en'],
  });
});

module.exports = { getMyPrescription };
