const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DEMO_VIDEO_ID, DEMO_VIDEO_URL, youtubeId,
  isDemoExerciseVideo, patientSafeExercise, patientSafeDay,
} = require('../src/services/demoExerciseVideo.service');
const { videoConfigured } = require('../src/services/programmeReleaseGate.service');

test('demo sample is explicitly identified, never clinically ready', () => {
  assert.equal(DEMO_VIDEO_ID, 'M7lc1UVf-VE');
  assert.equal(youtubeId(DEMO_VIDEO_URL), DEMO_VIDEO_ID);
  assert.equal(isDemoExerciseVideo({ youtubeVideoId: DEMO_VIDEO_ID, isDemoVideo: false }), true);
  assert.equal(isDemoExerciseVideo({ videoUrl: DEMO_VIDEO_URL }), true);
  assert.equal(isDemoExerciseVideo({ videoUrl: 'https://www.youtube.com/watch?v=ABCDEFGHIJK', isDemoVideo: true }), true);
  assert.equal(videoConfigured({ videoUrl: DEMO_VIDEO_URL, youtubeVideoId: DEMO_VIDEO_ID, isDemoVideo: true }), false);
  assert.equal(videoConfigured({ youtubeVideoId: DEMO_VIDEO_ID, isDemoVideo: false }), false);
});

test('real exercise URLs are left intact and remain eligible for clinical review', () => {
  const realExercise = {
    _id: 'e2', name: 'Approved exercise',
    videoUrl: 'https://www.youtube.com/watch?v=ABCDEFGHIJK',
    youtubeVideoId: 'ABCDEFGHIJK', isDemoVideo: false,
  };
  assert.equal(isDemoExerciseVideo(realExercise), false);
  assert.deepEqual(patientSafeExercise(realExercise), realExercise);
  assert.equal(videoConfigured(realExercise), true);
});

test('non-admin responses redact demo video but preserve exercise instructions and dose', () => {
  const demo = {
    _id: 'e1', name: 'Supported Heel Slide', videoUrl: DEMO_VIDEO_URL,
    youtubeVideoId: DEMO_VIDEO_ID, isDemoVideo: true,
    description: 'Gentle knee motion only', repetitions: 8, sets: 1,
  };
  const safe = patientSafeExercise(demo);
  assert.equal(safe.videoUrl, '');
  assert.equal(safe.youtubeVideoId, '');
  assert.equal(safe.thumbnail, '');
  assert.equal(safe.description, demo.description);
  assert.equal(safe.repetitions, 8);
  assert.equal(demo.videoUrl, DEMO_VIDEO_URL); // original object unchanged

  const day = patientSafeDay({ dayNumber: 1, exercises: [{ exercise: demo, sets: 2, repetitions: 10 }] });
  assert.equal(day.exercises[0].exercise.videoUrl, '');
  assert.equal(day.exercises[0].sets, 2);
  assert.equal(day.exercises[0].repetitions, 10);
});

test('demo markers are recognised from YouTube embedded/watch/short URLs', () => {
  assert.equal(youtubeId('https://www.youtube.com/embed/M7lc1UVf-VE'), DEMO_VIDEO_ID);
  assert.equal(youtubeId('https://youtu.be/M7lc1UVf-VE'), DEMO_VIDEO_ID);
  assert.equal(youtubeId('https://www.youtube.com/shorts/M7lc1UVf-VE'), DEMO_VIDEO_ID);
  assert.equal(youtubeId('https://example.org/watch?v=M7lc1UVf-VE'), '');
});
