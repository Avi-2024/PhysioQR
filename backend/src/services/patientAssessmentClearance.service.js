// Fast-track genuinely low-risk, non-operative assessments.
// Important: ALL existing/unclassified red flags remain CRITICAL. A single
// critical red flag must never be auto-cleared based on a count threshold.
// Only warnings explicitly clinically classified as "routine" can use
// the 3+ trigger. Surgery or an explicit physio-review pathway still blocks.
const ROUTINE_REVIEW_THRESHOLD = 3;

const decidePatientAssessmentClearance = ({
  redFlagDetails = [],
  requiresPhysioReview = false,
  isPostOperative = false,
} = {}) => {
  const flags = Array.isArray(redFlagDetails) ? redFlagDetails : [];
  const redFlagCount = flags.length;
  const criticalFlagCount = flags.filter((flag) => flag?.severity !== 'routine').length;
  const routineFlagCount = redFlagCount - criticalFlagCount;
  const hasRedFlag = redFlagCount > 0;
  const clinicalReviewRequired = Boolean(requiresPhysioReview || isPostOperative);
  const riskReviewRequired = criticalFlagCount > 0 || routineFlagCount >= ROUTINE_REVIEW_THRESHOLD;
  const reviewRequired = clinicalReviewRequired || riskReviewRequired;
  return {
    redFlagCount,
    criticalFlagCount,
    routineFlagCount,
    hasRedFlag,
    requiresPhysioReview: clinicalReviewRequired,
    clinicalSelectionRequired: reviewRequired,
    reviewRequired,
    autoCleared: !reviewRequired,
    status: reviewRequired ? 'pending_review' : 'cleared',
    reviewType: riskReviewRequired ? 'red_flag'
      : clinicalReviewRequired ? 'physio_review' : undefined,
  };
};

// Backward compatibility: assessments saved before the new classifier have no
// stored clinicalSelectionRequired, and retain their historical safety gate.
const requiresClinicalProgrammeSelection = (assessment) => {
  if (!assessment) return false;
  if (typeof assessment.clinicalSelectionRequired === 'boolean') {
    return assessment.clinicalSelectionRequired;
  }
  return Boolean(assessment.hasRedFlag || assessment.requiresPhysioReview);
};

module.exports = { ROUTINE_REVIEW_THRESHOLD, decidePatientAssessmentClearance, requiresClinicalProgrammeSelection };
