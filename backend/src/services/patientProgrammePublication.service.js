// Clinical drafts can exist alongside legacy programmes.
// An active PatientProgram enrolment alone does not publish clinical content.
const isReleasedForPatient = (program) => {
  if (!program) return false;
  if (!program.clinicalApprovalRequired) return true; // legacy lifecycle unchanged
  return program.isActive === true && Boolean(program.clinicalApproval?.approvedAt);
};

module.exports = { isReleasedForPatient };
