// Hard medical safety safeguards for the seeded screening questionnaire.
// This set is intentionally conservative. Urgent red flags cannot be downgraded
// to "routine" by an Admin edit or a direct MongoDB update.
const NON_DOWNGRADABLE_SAFETY_KEYS = new Set([
  'safety_bladder_bowel',
  'safety_saddle_numbness',
  'safety_bilateral_leg_weakness',
  'safety_serious_accident',
  'safety_fever_unwell',
]);
const isNonDowngradableSafetyQuestion = (question) =>
  Boolean(question?.seedKey && NON_DOWNGRADABLE_SAFETY_KEYS.has(question.seedKey));

const effectiveRedFlagSeverity = (question) => (
  !isNonDowngradableSafetyQuestion(question) &&
    question?.redFlagSeverity === 'routine' &&
    Boolean(String(question?.redFlagClassification?.clinicianName || '').trim())
      ? 'routine'
      : 'critical'
);

module.exports = {
  NON_DOWNGRADABLE_SAFETY_KEYS,
  isNonDowngradableSafetyQuestion,
  effectiveRedFlagSeverity,
};
