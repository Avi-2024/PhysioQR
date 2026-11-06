// Universal auto-approval: all assessments are automatically cleared.
// Critical red flags, routine warnings, and post-surgery or physiotherapy review pathways
// no longer block clearance or hold assessments in pending_review.
// Flag details are still counted and stored on the assessment record for clinical reference,
// but the patient receives immediate auto-clearance and can proceed directly to programme selection.
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

  // Universal auto-approval enabled:
  // - No red flags + eligible assessment -> auto-cleared
  // - Critical red flags -> auto-cleared (no pending_review hold)
  // - Post-surgery or physiotherapy review -> auto-cleared (no restricted hold)
  return {
    redFlagCount,
    criticalFlagCount,
    routineFlagCount,
    hasRedFlag,
    requiresPhysioReview: false,
    clinicalSelectionRequired: false,
    reviewRequired: false,
    autoCleared: true,
    status: 'cleared',
    reviewType: undefined,
  };
};

// With universal auto-approval, assessments do not require individual manual programme approval.
// Only if an assessment was explicitly saved with clinicalSelectionRequired === true does it require manual approval.
const requiresClinicalProgrammeSelection = (assessment) => {
  if (!assessment) return false;
  if (typeof assessment.clinicalSelectionRequired === 'boolean') {
    return assessment.clinicalSelectionRequired;
  }
  return false;
};

module.exports = { ROUTINE_REVIEW_THRESHOLD, decidePatientAssessmentClearance, requiresClinicalProgrammeSelection };
