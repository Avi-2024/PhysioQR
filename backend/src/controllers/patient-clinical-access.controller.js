const PatientAssessment = require('../models/PatientAssessment.model');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/patients/me/clinical-access
// Safety access is determined by any unresolved review, not only the newest
// assessment. A later assessment must never bypass an older unresolved red flag.
const getClinicalAccess = asyncHandler(async (req, res) => {
  const patientId = req.user._id;

  const [blockedAssessment, pendingAssessment] = await Promise.all([
    PatientAssessment.findOne({ patient: patientId, status: 'blocked' })
      .sort({ createdAt: -1 })
      .select('_id reviewType hasRedFlag status redFlagDetails adminReviewNote createdAt reviewedAt')
      .lean(),
    PatientAssessment.findOne({ patient: patientId, status: 'pending_review' })
      .sort({ createdAt: -1 })
      .select('_id reviewType hasRedFlag status redFlagDetails createdAt')
      .lean(),
  ]);

  const assessment = blockedAssessment || pendingAssessment || null;
  const accessState = blockedAssessment
    ? 'blocked'
    : pendingAssessment
      ? 'pending_review'
      : 'cleared';

  res.json({
    canAccessRehab: accessState === 'cleared',
    accessState,
    assessment,
    reviewPending: accessState === 'pending_review',
    reviewBlocked: accessState === 'blocked',
  });
});

module.exports = { getClinicalAccess };
