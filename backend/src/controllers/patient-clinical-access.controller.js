const PatientAssessment = require('../models/PatientAssessment.model');
const PatientProgram = require('../models/PatientProgram.model');
const { Payment } = require('../models/Payment.model');
const asyncHandler = require('../utils/asyncHandler');

const ACTIVE_PAYMENT_STATUSES = ['successful', 'manually_verified', 'partially_refunded'];

// GET /api/patients/me/clinical-access
// Rehabilitation access is granted only when all gates are satisfied:
// clinical clearance + financially valid payment + active patient programme.
const getClinicalAccess = asyncHandler(async (req, res) => {
  const patientId = req.user._id;

  const [blockedAssessment, pendingAssessment, latestAssessment, patientProgram, verifiedPayment] = await Promise.all([
    PatientAssessment.findOne({ patient: patientId, status: 'blocked' })
      .sort({ createdAt: -1 })
      .select('_id reviewType hasRedFlag status redFlagDetails adminReviewNote createdAt reviewedAt')
      .lean(),
    PatientAssessment.findOne({ patient: patientId, status: 'pending_review' })
      .sort({ createdAt: -1 })
      .select('_id reviewType hasRedFlag status redFlagDetails createdAt')
      .lean(),
    PatientAssessment.findOne({ patient: patientId })
      .sort({ createdAt: -1 })
      .select('_id reviewType hasRedFlag status createdAt reviewedAt')
      .lean(),
    PatientProgram.findOne({ patient: patientId })
      .sort({ createdAt: -1 })
      .select('_id program status payment startDate expiryDate')
      .lean(),
    Payment.findOne({
      patient: patientId,
      status: { $in: ACTIVE_PAYMENT_STATUSES },
      duplicateOf: { $exists: false },
    })
      .sort({ verifiedAt: -1, createdAt: -1 })
      .select('_id status program verifiedAt')
      .lean(),
  ]);

  let accessState = 'active';
  let assessment = null;

  if (blockedAssessment) {
    accessState = 'blocked';
    assessment = blockedAssessment;
  } else if (pendingAssessment) {
    accessState = 'pending_review';
    assessment = pendingAssessment;
  } else if (!latestAssessment || latestAssessment.status !== 'cleared') {
    accessState = 'assessment_required';
    assessment = latestAssessment || null;
  } else if (!verifiedPayment) {
    accessState = 'payment_required';
    assessment = latestAssessment;
  } else if (!patientProgram || patientProgram.status !== 'active') {
    accessState = 'activation_pending';
    assessment = latestAssessment;
  } else {
    assessment = latestAssessment;
  }

  const paymentCompleted = Boolean(verifiedPayment);
  const programActivated = patientProgram?.status === 'active';
  const canAccessRehab = accessState === 'active' && paymentCompleted && programActivated;

  res.json({
    canAccessRehab,
    accessState,
    assessment,
    reviewPending: accessState === 'pending_review',
    reviewBlocked: accessState === 'blocked',
    clinicalCleared: Boolean(latestAssessment?.status === 'cleared' && !blockedAssessment && !pendingAssessment),
    paymentCompleted,
    payment: verifiedPayment || null,
    programActivated,
    program: patientProgram || null,
    nextAction: accessState === 'active' ? 'dashboard' : accessState,
  });
});

module.exports = { getClinicalAccess };
