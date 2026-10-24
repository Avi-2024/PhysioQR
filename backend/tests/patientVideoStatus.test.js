const test = require('node:test');
const assert = require('node:assert/strict');
const { videoStatusForExercise, summarizeDayVideoStatus } = require('../src/services/patientVideoStatus.service');
const { patientSafeExercise } = require('../src/services/demoExerciseVideo.service');

test('approved YouTube video works even when watch v is not the first query parameter', () => {
  const exercise = { name: 'Safe exercise', isDemoVideo: false,
    videoUrl: 'https://www.youtube.com/watch?feature=shared&v=ABCDEFGHIJK' };
  assert.equal(videoStatusForExercise(exercise), 'ready');
  assert.equal(patientSafeExercise(exercise).videoUrl, exercise.videoUrl);
});

test('unreviewed videos remain hidden from patients', () => {
  const exercise = { videoUrl: 'https://youtu.be/ABCDEFGHIJK', youtubeVideoId: 'ABCDEFGHIJK',
    isDemoVideo: true, videoCandidateReviewPending: true };
  assert.equal(videoStatusForExercise(exercise), 'awaiting_clinical_review');
  const safe = patientSafeExercise(exercise);
  assert.equal(safe.videoUrl, '');
  assert.equal(safe.youtubeVideoId, '');
});

test('generic video and mismatched IDs are not considered ready', () => {
  assert.equal(videoStatusForExercise({ videoUrl: 'https://youtu.be/ml6cT4AZdqI' }), 'demo_only');
  assert.equal(videoStatusForExercise({ youtubeVideoId: 'ABCDEFGHIJK', videoUrl: 'https://youtu.be/ABCDEFGHIJL' }), 'invalid_link');
  assert.equal(videoStatusForExercise({ videoUrl: 'https://example.org/video' }), 'invalid_link');
  assert.equal(videoStatusForExercise({ videoUrl: '', youtubeVideoId: '' }), 'missing');
});

test('day summary exposes counts, not restricted URLs', () => {
  const counts = summarizeDayVideoStatus([
    { exercise: { videoUrl: 'https://youtu.be/ABCDEFGHIJK', isDemoVideo: false } },
    { exercise: { videoUrl: 'https://youtu.be/ABCDEFGHIJL', isDemoVideo: true } },
    { exercise: { videoUrl: '', videoCandidateReviewPending: true } },
    { exercise: { videoUrl: '' } },
  ]);
  assert.deepEqual(counts, { ready: 1, awaitingClinicalReview: 1, demoOnly: 1, missing: 1, invalidLink: 0, total: 4 });
  assert.equal(JSON.stringify(counts).includes('youtube'), false);
});
