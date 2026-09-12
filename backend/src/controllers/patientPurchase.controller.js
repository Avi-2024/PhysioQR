const Patient = require('../models/Patient.model');
const PatientAssessment = require('../models/PatientAssessment.model');
const Program = require('../models/Program.model');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/patients/me/purchase-quote
// Returns a payment-ready quote for both doctor-referred and direct patients.
// Doctor-referred pricing remains doctor-controlled; direct patients use the
// programme default price and have no doctor fee-share attribution.
const getPurchaseQuote = asyncHandler(async (req, res) => {
  const patientId = req.user._id;
  const [patient, assessment] = await Promise.all([
    Patient.findById(patientId).populate(
      'referringDoctor',
      'doctorId fullName clinicName status qrCodeActive approvedPatientFee revenueModel',
    ),
    PatientAssessment.findOne({ patient: patientId })
      .sort({ createdAt: -1 })
      .select('painCategory status reviewType requiresPhysioReview approvedProgram hasRedFlag')
      .lean(),
  ]);

  if (!patient) return res.status(404).json({ message: 'Patient not found' });
  if (!assessment) return res.status(400).json({ message: 'Complete your assessment before selecting a rehabilitation programme' });
  if (assessment.status === 'pending_review') {
    return res.status(409).json({
      code: 'CLINICAL_REVIEW_PENDING',
      message: assessment.reviewType === 'physio_review'
        ? 'Your physiotherapy assessment is awaiting clinical review before a programme can be assigned.'
        : 'Your assessment is awaiting safety review before a programme can be assigned.',
    });
  }
  if (assessment.status === 'blocked') {
    return res.status(409).json({
      code: 'ASSESSMENT_BLOCKED',
      message: 'A rehabilitation programme cannot be assigned until the clinical review is cleared.',
    });
  }
  if (assessment.status !== 'cleared') {
    return res.status(409).json({ message: 'Assessment must be clinically cleared before programme selection' });
  }

  const painCategoryId = assessment.painCategory;
  if (!painCategoryId) return res.status(400).json({ message: 'Assessment body region is not configured' });

  let program;
  let assignmentSource = 'body_region_auto_mapping';

  // A clinician-selected programme always takes precedence, whether the review
  // was a red-flag review or a post-surgery/physio review.
  if (assessment.approvedProgram) {
    program = await Program.findOne({
      _id: assessment.approvedProgram,
      isActive: true,
      painCategory: painCategoryId,
    }).populate('painCategory', 'name');
    if (!program) {
      return res.status(409).json({
        code: 'APPROVED_PROGRAM_UNAVAILABLE',
        message: 'The clinically approved programme is no longer active for this body region. Admin must assign another programme before payment can continue.',
      });
    }
    assignmentSource = 'clinical_review';
  } else if (assessment.requiresPhysioReview || assessment.hasRedFlag) {
    return res.status(409).json({
      code: 'PROGRAM_APPROVAL_REQUIRED',
      message: 'Admin must approve a rehabilitation programme for this cleared clinical review before payment can continue.',
    });
  } else {
    program = await Program.findOne({ isActive: true, painCategory: painCategoryId })
      .populate('painCategory', 'name')
      .sort({ createdAt: -1 });
    if (!program) return res.status(404).json({ message: 'No active rehabilitation programme is mapped to this body region' });
  }

  const doctor = patient.referringDoctor || null;
  if (doctor && (doctor.status !== 'approved' || !doctor.qrCodeActive)) {
    return res.status(400).json({ message: 'Referring doctor is not active for new program payments' });
  }

  const purchaseMode = doctor ? 'doctor_referral' : 'direct';
  const amount = doctor
    ? Number(doctor.approvedPatientFee || program.defaultPrice || 0)
    : Number(program.defaultPrice || 0);
  if (amount <= 0) {
    return res.status(400).json({
      message: doctor
        ? 'Program price is not configured for this doctor'
        : 'Direct program price is not configured. Set the programme default price in Admin.',
    });
  }

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
    program: {
      id: program._id,
      programCode: program.programCode,
      name: program.name,
      description: program.description,
      difficultyLevel: program.difficultyLevel,
      durationDays: program.durationDays,
      sessionsPerDay: program.sessionsPerDay,
      painCategory: program.painCategory,
    },
    pricing: {
      originalAmount: amount,
      discountAmount: 0,
      taxAmount: 0,
      finalAmount: amount,
      currency: 'INR',
      source: doctor ? 'doctor_pricing' : 'program_default_price',
    },
    assignment: { source: assignmentSource },
  });
});

module.exports = { getPurchaseQuote };
