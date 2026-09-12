const PatientProgram = require('../models/PatientProgram.model');
const PatientAssessment = require('../models/PatientAssessment.model');
const { ProgramDay } = require('../models/Exercise.model');
const asyncHandler = require('../utils/asyncHandler');

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

  const enrollment = await PatientProgram.findOne({ patient: patientId, status: 'active' })
    .sort({ startDate: -1, createdAt: -1 })
    .populate('patient', 'patientId fullName mobile age dateOfBirth gender preferredLanguage')
    .populate('program', 'programCode name nameHindi description durationDays sessionsPerDay instructions precautions painCategory')
    .populate('doctor', 'doctorId fullName qualification specialization clinicName clinicAddress city state postalCode clinicContact clinicEmail')
    .lean();

  if (!enrollment) {
    return res.status(404).json({ message: 'No active rehabilitation prescription found.' });
  }

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

  const languages = [...new Set(exerciseEntries
    .map((entry) => entry.exercise?.language)
    .filter(Boolean))];

  res.json({
    prescriptionId: `RX-${String(enrollment._id).slice(-8).toUpperCase()}`,
    prescriptionDate: enrollment.startDate || enrollment.createdAt,
    enrollment: {
      id: enrollment._id,
      currentDay,
      completionPercentage: enrollment.completionPercentage || 0,
      startDate: enrollment.startDate,
      expiryDate: enrollment.expiryDate,
      unlockMethod: enrollment.unlockMethod,
    },
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
