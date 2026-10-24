// Formats patient-reported rehab data for doctor read-only review.
// Missing scores remain null (not zero) and no clinical diagnosis is inferred.
const score = (value) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 10 ? value : null);
const compactText = (value) => typeof value === 'string' ? value.trim() : '';

const formatDay = (entry) => {
  const before = score(entry.painScoreBefore);
  const after = score(entry.painScoreAfter);
  const exercises = (entry.exercises || []).map((item) => ({
    id: String(item.exercise?._id || item.exercise || ''),
    name: compactText(item.exercise?.name) || 'Exercise',
    videoStarted: Boolean(item.videoStarted),
    videoCompleted: Boolean(item.videoCompleted),
    markedCompleted: Boolean(item.markedCompleted),
    skipped: Boolean(item.skipped),
    skipReason: compactText(item.skipReason),
  }));
  return {
    dayNumber: entry.dayNumber,
    dayStarted: Boolean(entry.dayStarted),
    dayCompleted: Boolean(entry.dayCompleted),
    completedAt: entry.completedAt || null,
    updatedAt: entry.updatedAt || null,
    painBefore: before,
    painAfter: after,
    painChange: before === null || after === null ? null : after - before,
    difficultyRating: score(entry.difficultyRating),
    feedback: compactText(entry.feedbackText),
    discomfortReported: entry.discomfortReported === true,
    hasDiscomfortResponse: typeof entry.discomfortReported === 'boolean',
    fullSessionCompleted: Boolean(entry.fullSessionCompleted),
    completedExercises: exercises.filter((item) => item.markedCompleted).length,
    skippedExercises: exercises.filter((item) => item.skipped).length,
    videoStartedCount: exercises.filter((item) => item.videoStarted).length,
    videoCompletedCount: exercises.filter((item) => item.videoCompleted).length,
    exercises,
  };
};

const summarizeDays = (days) => {
  const paired = days.filter((d) => d.painBefore !== null && d.painAfter !== null);
  const average = (values) => values.length
    ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
    : null;
  const reports = days.filter((d) => d.feedback || d.painBefore !== null || d.painAfter !== null || d.fullSessionCompleted || d.hasDiscomfortResponse);
  const latestReport = reports.length ? reports[reports.length - 1] : null;
  return {
    openedDays: days.filter((d) => d.dayStarted).length,
    completedDays: days.filter((d) => d.dayCompleted).length,
    reportedDays: reports.length,
    feedbackEntries: days.filter((d) => d.feedback).length,
    discomfortDays: days.filter((d) => d.discomfortReported).length,
    painIncreasedDays: paired.filter((d) => d.painChange > 0).length,
    completedExercises: days.reduce((sum, d) => sum + d.completedExercises, 0),
    skippedExercises: days.reduce((sum, d) => sum + d.skippedExercises, 0),
    averagePainBefore: average(paired.map((d) => d.painBefore)),
    averagePainAfter: average(paired.map((d) => d.painAfter)),
    latestReportDay: latestReport?.dayNumber || null,
    lastActivityAt: days.filter((d) => d.dayStarted || d.dayCompleted || d.feedback).map((d) => d.updatedAt).filter(Boolean).sort((a, b) => new Date(a).getTime() - new Date(b).getTime()).at(-1) || null,
  };
};

module.exports = { formatDay, summarizeDays };
