const PatientAssessment = require('../models/PatientAssessment.model');
const PatientProgram = require('../models/PatientProgram.model');
const { Payment } = require('../models/Payment.model');
const { activateProgrammeBundle, getApprovedProgrammeIds } = require('../services/programBundle.service');
const asyncHandler = require('../utils/asyncHandler');

const ACTIVE_PAYMENT_STATUSES = ['successful', 'manually_verified', 'partially_refunded'];

// GET /api/patients/me/clinical-access
// Rehabilitation access requires the current clinical clearance + a financially
// valid payment made for/after that clearance + activation of the approved bundle.
const getClinicalAccess = asyncHandler(async (req, res) => {
  const patientId = req.user._id;

  const [blockedAssessment, pendingAssessment, latestAssessment] = await Promise.all([
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
      .select('_id reviewType hasRedFlag status createdAt reviewedAt approvedProgram approvedPrograms')
      .lean(),
  ]);

  const clearanceAt = latestAssessment?.reviewedAt || latestAssessment?.createdAt;
  const paymentFilter = {
    patient: patientId,
    status: { $in: ACTIVE_PAYMENT_STATUSES },
    duplicateOf: { $exists: false },
  };
  if (clearanceAt) paymentFilter.createdAt = { $gte: clearanceAt };

  const verifiedPayment = await Payment.findOne(paymentFilter)
    .sort({ verifiedAt: -1, createdAt: -1 })
    .select('_id status program programs doctor verifiedAt createdAt')
    .lean();

  const approvedProgramIds = getApprovedProgrammeIds(latestAssessment);

  // Recovery-safe reconciliation for a payment that belongs to the current
  // clearance cycle. This cannot reuse an older payment for a later assessment.
  if (!blockedAssessment && !pendingAssessment && latestAssessment?.status === 'cleared' && verifiedPayment && approvedProgramIds.length) {
    await activateProgrammeBundle({
      patientId,
      paymentId: verifiedPayment._id,
      doctorId: verifiedPayment.doctor || null,
      programIds: approvedProgramIds,
      primaryProgramId: verifiedPayment.program || approvedProgramIds[0],
    });
  }

  const patientPrograms = await PatientProgram.find({ patient: patientId })
    .sort({ createdAt: -1 })
    .select('_id program status payment activationPayment startDate expiryDate')
    .lean();

  const currentPaymentId = verifiedPayment ? String(verifiedPayment._id) : '';
  const activeProgramIds = new Set(
    patientPrograms
      .filter((item) => item.status === 'active' && (
        !currentPaymentId ||
        String(item.activationPayment || '') === currentPaymentId ||
        String(item.payment || '') === currentPaymentId
      ))
      .map((item) => String(item.program)),
  );

  const programmeBundleActivated = Boolean(verifiedPayment) && (approvedProgramIds.length
    ? approvedProgramIds.every((id) => activeProgramIds.has(String(id)))
    : patientPrograms.some((item) => item.status === 'active' && (
      String(item.activationPayment || '') === currentPaymentId || String(item.payment || '') === currentPaymentId
    )));

  let accessState = 'active';
  let assessment = null;

  if (blockedAssessment) {
    accessState = 'blocked'; assessment = blockedAssessment;
  } else if (pendingAssessment) {
    accessState = 'pending_review'; assessment = pendingAssessment;
  } else if (!latestAssessment || latestAssessment.status !== 'cleared') {
    accessState = 'assessment_required'; assessment = latestAssessment || null;
  } else if (!verifiedPayment) {
    accessState = 'payment_required'; assessment = latestAssessment;
  } else if (!programmeBundleActivated) {
    accessState = 'activation_pending'; assessment = latestAssessment;
  } else {
    assessment = latestAssessment;
  }

  const paymentCompleted = Boolean(verifiedPayment);
  const canAccessRehab = accessState === 'active' && paymentCompleted && programmeBundleActivated;

  res.json({
    canAccessRehab,
    accessState,
    assessment,
    reviewPending: accessState === 'pending_review',
    reviewBlocked: accessState === 'blocked',
    clinicalCleared: Boolean(latestAssessment?.status === 'cleared' && !blockedAssessment && !pendingAssessment),
    paymentCompleted,
    payment: verifiedPayment || null,
    programActivated: programmeBundleActivated,
    program: patientPrograms.find((item) => item.status === 'active') || null,
    programs: patientPrograms,
    approvedProgramIds,
    nextAction: accessState === 'active' ? 'dashboard' : accessState,
  });
});

module.exports = { getClinicalAccess };
