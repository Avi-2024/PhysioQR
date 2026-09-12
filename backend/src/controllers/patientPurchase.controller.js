const Patient = require('../models/Patient.model');
const PatientAssessment = require('../models/PatientAssessment.model');
const Program = require('../models/Program.model');
const asyncHandler = require('../utils/asyncHandler');

const normalizeIds = (values = []) => [...new Set((values || []).map((value) => String(value)).filter(Boolean))];

// GET /api/patients/me/purchase-quote
// Programme selection is clinical. Pricing is commercial and comes only from
// the Doctor (referred patient) or Admin (direct patient).
const getPurchaseQuote = asyncHandler(async (req, res) => {
  const patientId = req.user._id;
  const [patient, assessment] = await Promise.all([
    Patient.findById(patientId).populate(
      'referringDoctor',
      'doctorId fullName clinicName status qrCodeActive approvedPatientFee revenueModel',
    ),
    PatientAssessment.findOne({ patient: patientId })
      .sort({ createdAt: -1 })
      .select('painCategory status reviewType requiresPhysioReview approvedProgram approvedPrograms hasRedFlag')
      .lean(),
  ]);

  if (!patient) return res.status(404).json({ message: 'Patient not found' });
  if (!assessment) return res.status(400).json({ message: 'Complete your assessment before selecting rehabilitation programmes' });
  if (assessment.status === 'pending_review') {
    return res.status(409).json({
      code: 'CLINICAL_REVIEW_PENDING',
      message: assessment.reviewType === 'physio_review'
        ? 'Your physiotherapy assessment is awaiting clinical review before programmes can be assigned.'
        : 'Your assessment is awaiting safety review before programmes can be assigned.',
    });
  }
  if (assessment.status === 'blocked') {
    return res.status(409).json({
      code: 'ASSESSMENT_BLOCKED',
      message: 'Rehabilitation programmes cannot be assigned until the clinical review is cleared.',
    });
  }
  if (assessment.status !== 'cleared') {
    return res.status(409).json({ message: 'Assessment must be clinically cleared before programme selection' });
  }

  const painCategoryId = assessment.painCategory;
  if (!painCategoryId) return res.status(400).json({ message: 'Assessment body region is not configured' });

  let programs = [];
  let assignmentSource = 'body_region_auto_mapping';
  const approvedIds = normalizeIds([
    ...(assessment.approvedPrograms || []),
    ...(assessment.approvedProgram ? [assessment.approvedProgram] : []),
  ]);

  if (approvedIds.length) {
    programs = await Program.find({
      _id: { $in: approvedIds },
      isActive: true,
      painCategory: painCategoryId,
    }).populate('painCategory', 'name').sort({ durationDays: 1, name: 1 });
    if (programs.length !== approvedIds.length) {
      return res.status(409).json({
        code: 'APPROVED_PROGRAM_UNAVAILABLE',
        message: 'One or more clinically approved programmes are no longer active for this body region. Admin must review the assignment before payment can continue.',
      });
    }
    assignmentSource = 'clinical_review';
  } else if (assessment.requiresPhysioReview || assessment.hasRedFlag) {
    return res.status(409).json({
      code: 'PROGRAM_APPROVAL_REQUIRED',
      message: 'Admin must approve at least one rehabilitation programme for this cleared clinical review before payment can continue.',
    });
  } else {
    const program = await Program.findOne({ isActive: true, painCategory: painCategoryId })
      .populate('painCategory', 'name')
      .sort({ durationDays: 1, createdAt: 1 });
    if (!program) return res.status(404).json({ message: 'No active rehabilitation programme is mapped to this body region' });
    programs = [program];
  }

  const doctor = patient.referringDoctor || null;
  if (doctor && (doctor.status !== 'approved' || !doctor.qrCodeActive)) {
    return res.status(400).json({ message: 'Referring doctor is not active for new patient payments' });
  }

  const purchaseMode = doctor ? 'doctor_referral' : 'direct';
  const amount = doctor
    ? Number(doctor.approvedPatientFee || 0)
    : Number(patient.directPatientFee || 0);

  if (amount <= 0) {
    return res.status(400).json({
      code: 'PATIENT_FEE_NOT_CONFIGURED',
      message: doctor
        ? 'The referring Doctor has not configured the patient fee yet.'
        : 'Admin has not configured the fee for this direct patient yet.',
    });
  }

  const mapProgram = (program) => ({
    id: program._id,
    programCode: program.programCode,
    name: program.name,
    description: program.description,
    difficultyLevel: program.difficultyLevel,
    durationDays: program.durationDays,
    sessionsPerDay: program.sessionsPerDay,
    painCategory: program.painCategory,
  });
  const primaryProgram = programs[0];

  res.json({
    purchaseMode,
    patient: {
      id: patient._id,
      patientId: patient.patientId,
      fullName: patient.fullName,
      mobile: patient.mobile,
      mobileVerified: patient.mobileVerified,
      consentAccepted: patient.consentAccepted,
    },
    doctor: doctor ? {
      id: doctor._id,
      doctorId: doctor.doctorId,
      fullName: doctor.fullName,
      clinicName: doctor.clinicName,
      revenueModel: doctor.revenueModel,
    } : null,
    // Primary field retained for older clients; new clients should render programs[].
    program: mapProgram(primaryProgram),
    programs: programs.map(mapProgram),
    pricing: {
      originalAmount: amount,
      discountAmount: 0,
      taxAmount: 0,
      finalAmount: amount,
      currency: 'INR',
      source: doctor ? 'doctor_patient_fee' : 'admin_patient_fee',
      feeAuthority: doctor ? 'doctor' : 'admin',
    },
    assignment: { source: assignmentSource, programmeCount: programs.length },
  });
});

module.exports = { getPurchaseQuote };
