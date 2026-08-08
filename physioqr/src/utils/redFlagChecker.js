/**
 * Red Flag Medical Safety Checker (SRS Section 15)
 * Identifies high-risk assessment responses that require manual Admin review
 */

const RED_FLAG_KEYWORDS = [
  "severe loss of movement",
  "chest pain",
  "loss of bowel control",
  "loss of bladder control",
  "unexplained swelling",
  "fever with pain",
  "numbness in both legs",
  "sudden severe onset",
  "recent major trauma"
];

export function checkAssessmentRedFlags(answers = {}) {
  const flagsFound = [];

  // Check pain level >= 8
  if (answers.painLevel && Number(answers.painLevel) >= 8) {
    flagsFound.push({
      key: "severe_pain",
      label: "High Pain Intensity (8+ out of 10)",
      action: "Requires physician evaluation before initiating exercise"
    });
  }

  // Check specific checkboxes or text answers
  if (answers.symptoms && Array.isArray(answers.symptoms)) {
    answers.symptoms.forEach((symptom) => {
      const symLower = symptom.toLowerCase();
      if (RED_FLAG_KEYWORDS.some((kw) => symLower.includes(kw))) {
        flagsFound.push({
          key: "symptom_flag",
          label: `High-Risk Symptom Reported: "${symptom}"`,
          action: "Automatic exercise assignment paused. Sent to Admin review."
        });
      }
    });
  }

  if (answers.recentSurgery === "yes") {
    flagsFound.push({
      key: "recent_surgery",
      label: "Recent Post-Operative Status (< 30 days)",
      action: "Needs custom post-op clearance"
    });
  }

  return {
    isRedFlag: flagsFound.length > 0,
    flags: flagsFound,
    recommendation: flagsFound.length > 0
      ? "Consult a doctor immediately. Our clinical team has received your assessment for priority review."
      : "Cleared for rehabilitation program."
  };
}
