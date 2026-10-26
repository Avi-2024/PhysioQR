const Patient = require('../../models/Patient.model');
const PatientProgram = require('../../models/PatientProgram.model');
const PatientAssessment = require('../../models/PatientAssessment.model');
const Program = require('../../models/Program.model');
const { Payment } = require('../../models/Payment.model');
const asyncHandler = require('../../utils/asyncHandler');
const { writeAuditLog } = require('../../utils/auditLogger');
const { assessProgrammeEligibility } = require('../../services/adminComplimentaryProgramme.service');
const { ensureApprovedRelease } = require('../../services/programmeReleaseGate.service');
const { ProgramDay } = require('../../models/Exercise.model');
const { summarizeDayVideoStatus } = require('../../services/patientVideoStatus.service');

const isObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value));
const findPatient = (identifier) => Patient.findOne({
  $or: [
    { _id: isObjectId(identifier) ? identifier : null },
    { patientId: identifier },
  ],
});
const verifiedStatuses = ['successful', 'manually_verified'];

const dayOneVideoReady = (day) => Boolean(day && summarizeDayVideoStatus(
  (day.exercises || []).filter((item) => item.exercise && item.exercise.isActive !== false),
).ready > 0);

const patientEligibility = async (patient) => {
  if (patient.status !== 'active' || !patient.mobileVerified || !patient.consentAccepted) {
    return 'Only active, verified patients with recorded consent can receive another programme';
  }
  const [hasCurrentProgramme, hasVerifiedPurchase, unresolved] = await Promise.all([
    PatientProgram.exists({ patient: patient._id, status: 'active' }),
    Payment.exists({ patient: patient._id, status: { $in: verifiedStatuses } }),
    PatientAssessment.exists({ patient: patient._id, status: { $in: ['blocked', 'pending_review'] } }),
  ]);
  if (unresolved) return 'An unresolved clinical assessment must be reviewed before more exercises are assigned';
  if (!hasCurrentProgramme || !hasVerifiedPurchase) {
    return 'Complimentary assignments are for existing patients with an active programme and a verified prior purchase';
  }
  return null;
};

const listAssignableProgrammes = asyncHandler(async (req, res) => {
  const patient = await findPatient(req.params.id);
  if (!patient) return res.status(404).json({ message: 'Patient not found' });
  const restriction = await patientEligibility(patient);
  if (restriction) return res.json({ eligible: false, reason: restriction, programmes: [] });

  const [assessments, enrolled, programmes] = await Promise.all([
    PatientAssessment.find({ patient: patient._id })
      .select('_id status painCategory clinicalSelectionRequired hasRedFlag requiresPhysioReview approvedProgram approvedPrograms createdAt')
      .sort({ createdAt: -1 }).lean(),
    PatientProgram.find({ patient: patient._id }).select('program').lean(),
    Program.find({ isActive: true }).select('_id name programCode durationDays painCategory isActive clinicalApprovalRequired clinicalApproval').sort({ name: 1 }).lean(),
  ]);
  const enrolledProgrammeIds = enrolled.map((item) => item.program);
  const candidates = programmes
    .map((programme) => ({
      programme,
      decision: assessProgrammeEligibility({ programme, assessments, enrolledProgrammeIds }),
    }))
    .filter((item) => item.decision.eligible);

  const days = candidates.length ? await ProgramDay.find({
    program: { $in: candidates.map((item) => item.programme._id) },
    dayNumber: 1,
    isActive: true,
  }).populate('exercises.exercise', '_id isActive videoUrl youtubeVideoId isDemoVideo videoCandidateReviewPending').lean() : [];

  const eligible = candidates.filter(({ programme }) => days.some((day) =>
    String(day.program) === String(programme._id) && dayOneVideoReady(day)))
    .map(({ programme, decision }) => ({
      _id: programme._id,
      name: programme.name,
      programCode: programme.programCode,
      durationDays: programme.durationDays,
      assessmentId: decision.assessmentId,
    }));

  res.set('Cache-Control', 'private, no-store');
  res.json({ eligible: true, programmes: eligible });
});

// POST /api/admin/patients/:id/programmes/complimentary
// No Razorpay order, Payment record, wallet ledger, fee-share, or reused payment.
const assignComplimentaryProgramme = asyncHandler(async (req, res) => {
  const patient = await findPatient(req.params.id);
  if (!patient) return res.status(404).json({ message: 'Patient not found' });
  const restriction = await patientEligibility(patient);
  if (restriction) return res.status(409).json({ message: restriction, code: 'ADDITIONAL_PROGRAMME_INELIGIBLE' });

  const programme = await Program.findOne({ _id: req.body.programId, isActive: true });
  if (!programme) return res.status(404).json({ message: 'Published programme not found' });

  const [assessments, existing] = await Promise.all([
    PatientAssessment.find({ patient: patient._id, painCategory: programme.painCategory })
      .select('_id status painCategory clinicalSelectionRequired hasRedFlag requiresPhysioReview approvedProgram approvedPrograms createdAt')
      .sort({ createdAt: -1 }).lean(),
    PatientProgram.findOne({ patient: patient._id, program: programme._id }).select('_id status').lean(),
  ]);

  const decision = assessProgrammeEligibility({
    programme, assessments, enrolledProgrammeIds: existing ? [programme._id] : [],
  });
  if (!decision.eligible) {
    return res.status(409).json({ code: 'CLINICAL_PROGRAMME_NOT_ELIGIBLE', message: decision.reason });
  }
  await ensureApprovedRelease(programme);
  const dayOne = await ProgramDay.findOne({ program: programme._id, dayNumber: 1, isActive: true })
    .populate('exercises.exercise', '_id isActive videoUrl youtubeVideoId isDemoVideo videoCandidateReviewPending').lean();
  if (!dayOneVideoReady(dayOne)) {
    return res.status(409).json({ code: 'PROGRAMME_DAY_ONE_UNAVAILABLE', message: 'Day 1 needs a published, approved exercise video before this programme can be assigned' });
  }

  const clinicalNote = String(req.body.clinicalNote || '').trim();
  const now = new Date();
  const expiryDate = new Date(now.getTime() + (Number(programme.durationDays) + 3) * 86400000);
  let enrollment;
  try {
    enrollment = await PatientProgram.create({
      patient: patient._id,
      program: programme._id,
      doctor: patient.referringDoctor || undefined,
      status: 'active',
      startDate: now,
      expiryDate,
      currentDay: 1,
      completionPercentage: 0,
      unlockMethod: 'every_24_hours',
      gracePeriodDays: 3,
      complimentaryAssignment: {
        grantedBy: req.user._id,
        grantedAt: now,
        clinicalAssessment: decision.assessmentId,
        clinicalNote,
        source: 'admin',
      },
      // Payment and activationPayment intentionally remain absent.
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        code: 'PROGRAMME_ALREADY_ENROLLED',
        message: 'This patient already has a record for this programme. Existing progress has not been changed.',
      });
    }
    throw error;
  }

  await writeAuditLog({
    req,
    action: 'patient_additional_programme_complimentary',
    module: 'PatientProgram',
    recordId: enrollment._id,
    newValue: {
      patient: patient._id,
      program: programme._id,
      assessmentId: decision.assessmentId,
      source: 'admin',
      complimentary: true,
      amountCharged: 0,
      startDate: now,
      expiryDate,
    },
    reason: clinicalNote,
  });

  res.set('Cache-Control', 'private, no-store');
  return res.status(201).json({
    message: 'Additional rehabilitation programme assigned free of charge',
    enrollmentId: enrollment._id,
    programmeId: programme._id,
    amountCharged: 0,
  });
});

module.exports = { listAssignableProgrammes, assignComplimentaryProgramme };
