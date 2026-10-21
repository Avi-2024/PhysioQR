const test = require('node:test');
const assert = require('node:assert/strict');
const { formatDay, summarizeDays } = require('../src/services/doctorPatientProgress.service');

test('preserves written feedback and exercise-level events for doctor review', () => {
  const day = formatDay({
    dayNumber: 3, dayStarted: true, dayCompleted: true,
    painScoreBefore: 7, painScoreAfter: 5, difficultyRating: 3,
    feedbackText: '  Better range of motion today  ', discomfortReported: false,
    exercises: [
      { exercise: { _id: 'a', name: 'Heel slides' }, videoStarted: true, markedCompleted: true },
      { exercise: { _id: 'b', name: 'Quad sets' }, skipped: true, skipReason: 'More pain' },
    ],
  });
  assert.equal(day.feedback, 'Better range of motion today');
  assert.equal(day.painChange, -2);
  assert.equal(day.completedExercises, 1);
  assert.equal(day.skippedExercises, 1);
  assert.deepEqual(day.exercises.map((exercise) => exercise.name), ['Heel slides', 'Quad sets']);
  assert.equal(day.exercises[1].skipReason, 'More pain');
});

test('missing pain scores are not converted to zero and not included in averages', () => {
  const days = [
    formatDay({ dayNumber: 1, dayStarted: true, feedbackText: 'First day' }),
    formatDay({ dayNumber: 2, dayStarted: true, painScoreBefore: 6, painScoreAfter: 4 }),
    formatDay({ dayNumber: 3, dayStarted: true, painScoreBefore: 8 }),
  ];
  assert.equal(days[0].painBefore, null);
  assert.equal(days[0].painAfter, null);
  assert.equal(days[2].painChange, null);
  const summary = summarizeDays(days);
  assert.equal(summary.averagePainBefore, 6);
  assert.equal(summary.averagePainAfter, 4);
  assert.equal(summary.reportedDays, 3);
  assert.equal(summary.feedbackEntries, 1);
});

test('discomfort and increased pain are indicators, not a diagnosis', () => {
  const days = [
    formatDay({ dayNumber: 1, painScoreBefore: 3, painScoreAfter: 5, discomfortReported: true }),
    formatDay({ dayNumber: 2, painScoreBefore: 7, painScoreAfter: 7, discomfortReported: false }),
  ];
  const summary = summarizeDays(days);
  assert.equal(summary.discomfortDays, 1);
  assert.equal(summary.painIncreasedDays, 1);
  assert.equal(summary.completedDays, 0);
  assert.equal(summary.averagePainAfter, 6);
});
