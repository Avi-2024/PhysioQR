const test = require('node:test');
const assert = require('node:assert/strict');
const {
  PROGRAM_CODE, EXERCISE_PREFIX, exercises, days, validateDraft,
} = require('../src/data/generalKnee30DayDraft');
const { withDayDosage, withDayDosageInProgramme } = require('../src/services/dayExerciseDosage.service');
const { ensureApprovedRelease, videoConfigured } = require('../src/services/programmeReleaseGate.service');

test('draft contains exactly 30 numbered days and 15 reusable exercises', () => {
  assert.equal(PROGRAM_CODE, 'DRAFT-KNEE-GENERAL-30D');
  assert.match(EXERCISE_PREFIX, /^physioqr_knee_general_30d_/);
  assert.equal(days.length, 30);
  assert.equal(exercises.length, 15);
  assert.deepEqual(validateDraft(), []);
  assert.equal(new Set(days.map((d)=>d.title)).size, 30);
});

test('every day has distinct exercises with valid, explicit prescriptions', () => {
  const keys = new Set(exercises.map((exercise)=>exercise.key));
  let mappings = 0;
  for (const [index, day] of days.entries()) {
    assert.equal(day.dayNumber, index+1);
    assert.ok(day.focus);
    assert.ok(day.items.length >= 2);
    const dailyKeys = new Set(day.items.map((entry)=>entry.key));
    assert.equal(dailyKeys.size, day.items.length);
    for (const entry of day.items) {
      assert.ok(keys.has(entry.key));
      assert.ok(entry.sets > 0 && entry.repetitions > 0);
      assert.ok(entry.holdDuration);
      mappings += 1;
    }
  }
  assert.equal(mappings, 112);
});

test('all draft exercises have written instructions and safety, no invented videos', () => {
  for (const exercise of exercises) {
    assert.ok(exercise.description.length > 45, exercise.key);
    assert.ok(exercise.safety.length > 15, exercise.key);
    assert.ok(exercise.sets > 0 && exercise.repetitions > 0);
    assert.equal(exercise.videoUrl, undefined);
  }
});

test('daily dosage overrides are used on the patient exercise object', () => {
  const entry = { exercise: { _id:'ex', name:'Quad Set', sets:1, repetitions:8, holdDuration:'3 seconds', restDuration:'45 seconds' },
    displayOrder:1, sets:2, repetitions:10, holdDuration:'5 seconds' };
  const mapped = withDayDosage(entry);
  assert.equal(mapped.exercise.sets, 2);
  assert.equal(mapped.exercise.repetitions, 10);
  assert.equal(mapped.exercise.holdDuration, '5 seconds');
  assert.equal(mapped.exercise.restDuration, '45 seconds');
  assert.equal(entry.exercise.sets, 1); // do not mutate reusable library
  assert.equal(withDayDosageInProgramme({ dayNumber:6, exercises:[entry] }).exercises[0].exercise.sets, 2);
});

test('publication accepts only plausible YouTube video links or video IDs', () => {
  assert.equal(videoConfigured({ videoUrl: '' }), false);
  assert.equal(videoConfigured({ videoUrl: 'https://example.com/dummy' }), false);
  assert.equal(videoConfigured({ videoUrl: 'https://www.youtube.com/watch?v=ABCDEFGHIJK' }), true);
  assert.equal(videoConfigured({ videoUrl: 'https://youtu.be/ABCDEFGHIJK' }), true);
  assert.equal(videoConfigured({ youtubeVideoId: 'ABCDEFGHIJK' }), true);
  assert.equal(videoConfigured({ youtubeVideoId: 'dummy' }), false);
});

test('unapproved draft programme cannot be released', async () => {
  await assert.rejects(
    ensureApprovedRelease({ clinicalApprovalRequired:true, clinicalApproval:{} }),
    /Clinical sign-off required/,
  );
  await assert.doesNotReject(ensureApprovedRelease({ clinicalApprovalRequired:false }));
});
