// Assessment form acceptance is distinct from authorisation to start treatment.
// Every successfully saved assessment receives acknowledgement, including cases
// that must undergo safety or post-operative review before rehabilitation.
export type AssessmentSubmissionNotice = {
  title: string;
  description: string;
};

export const getAssessmentSubmissionNotice = (status: string): AssessmentSubmissionNotice => {
  const title = 'Assessment submitted successfully';
  if (status === 'cleared') {
    return { title, description: 'Screening is complete. No individual Admin approval is required for this low-risk assessment.' };
  }
  if (status === 'pending_review') {
    return { title, description: 'Your answers are saved. A clinical safety review is required before rehabilitation can begin. Your registration has not been rejected.' };
  }
  if (status === 'blocked') {
    return { title, description: 'Your answers are saved. Rehabilitation cannot begin until your care team addresses the safety concern.' };
  }
  return { title, description: 'Your answers are saved. Programme eligibility will be confirmed before rehabilitation begins.' };
};
