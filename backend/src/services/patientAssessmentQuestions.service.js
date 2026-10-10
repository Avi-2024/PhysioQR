// The patient assessment is intentionally structured during the initial rollout.
// Free-writing ("text") and unsupported image prompts should not be shown or
// accepted for NEW assessments. Historical questions/answers stay in MongoDB.
const HIDDEN_PATIENT_QUESTION_TYPES = Object.freeze(['text', 'image']);

const patientQuestionTypeFilter = () => ({
  questionType: { $nin: [...HIDDEN_PATIENT_QUESTION_TYPES] },
});

const isStructuredPatientQuestion = (question) =>
  Boolean(question) && !HIDDEN_PATIENT_QUESTION_TYPES.includes(question.questionType);

module.exports = {
  HIDDEN_PATIENT_QUESTION_TYPES,
  patientQuestionTypeFilter,
  isStructuredPatientQuestion,
};
