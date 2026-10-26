// Shared eligibility logic for Admin's complimentary *additional* programme action.
// A previous clearance for a different body region never authorizes this programme.
const { requiresClinicalProgrammeSelection } = require('./patientAssessmentClearance.service');

const idOf = (value) => String(value?._id || value || '');

const assessProgrammeEligibility = ({ programme, assessments = [], enrolledProgrammeIds = [] }) => {
  if (!programme?.isActive) return { eligible: false, reason: 'Programme is not published/active' };
  if (programme.clinicalApprovalRequired && !programme.clinicalApproval?.approvedAt) {
    return { eligible: false, reason: 'Programme clinical sign-off is missing' };
  }
  if (enrolledProgrammeIds.some((id) => idOf(id) === idOf(programme._id))) {
    return { eligible: false, reason: 'Patient already has this programme' };
  }
  const matching = assessments
    .filter((item) => idOf(item.painCategory) === idOf(programme.painCategory))
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0];

  if (!matching) {
    return { eligible: false, reason: 'A clinical assessment is required for this body region' };
  }
  if (matching.status !== 'cleared') {
    return { eligible: false, reason: 'The latest body-region assessment needs clinical clearance' };
  }
  const approvedIds = [
    ...(matching.approvedPrograms || []),
    ...(matching.approvedProgram ? [matching.approvedProgram] : []),
  ].map(idOf);
  if (requiresClinicalProgrammeSelection(matching) && !approvedIds.includes(idOf(programme._id))) {
    return { eligible: false, reason: 'A clinician must explicitly approve this programme in the assessment review' };
  }
  return { eligible: true, assessmentId: idOf(matching._id) };
};

module.exports = { assessProgrammeEligibility };
