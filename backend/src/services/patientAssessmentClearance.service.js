// Risk-sensitive self-service clearance policy.
// No clinician should have to approve normal low-risk, non-surgical
// assessments one by one. ONE positive clinical red flag is sufficient
// to require review; a numeric threshold such as 3 would miss urgent cases.
// Post-operative cases also require review irrespective of red-flag count.
const decidePatientAssessmentClearance = ({
  redFlagDetails = [],
  requiresPhysioReview = false,
  isPostOperative = false,
} = {}) => {
  const redFlagCount = Array.isArray(redFlagDetails) ? redFlagDetails.length : 0;
  const hasRedFlag = redFlagCount > 0;
  const clinicalReviewRequired = Boolean(requiresPhysioReview || isPostOperative);
  const reviewRequired = hasRedFlag || clinicalReviewRequired;
  return {
    redFlagCount,
    hasRedFlag,
    requiresPhysioReview: clinicalReviewRequired,
    reviewRequired,
    autoCleared: !reviewRequired,
    status: reviewRequired ? 'pending_review' : 'cleared',
    reviewType: hasRedFlag ? 'red_flag' : clinicalReviewRequired ? 'physio_review' : undefined,
  };
};

// Even after an Admin clears a red-flag assessment, its assigned treatment
// programme must be clinician-selected rather than auto-picked by region.
const requiresClinicalProgrammeSelection = (assessment) =>
  Boolean(assessment && (assessment.hasRedFlag || assessment.requiresPhysioReview));

module.exports = { decidePatientAssessmentClearance, requiresClinicalProgrammeSelection };
