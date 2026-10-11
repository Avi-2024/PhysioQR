const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { EXERCISE_PREFIX, PROGRAM_CODE } = require('../src/data/generalKnee30DayDraft');

let days = [];
const fakeDay = { find: () => ({ populate: () => ({ lean: async () => days }) }) };
const originalLoad = Module._load;
let gate;
try {
  Module._load = function(request, parent, isMain) {
    if (request === '../models/Exercise.model') return { ProgramDay: fakeDay };
    return originalLoad.apply(this, arguments);
  };
  gate = require('../src/services/programmeReleaseGate.service');
} finally {
  Module._load = originalLoad;
}

const program = {
  _id: 'p', programCode: PROGRAM_CODE, painCategory: 'knee',
  isActive: false, clinicalApprovalRequired: true, durationDays: 1,
  clinicalApproval: {},
};
const candidate = () => ({
  _id: 'e1',
  seedKey: EXERCISE_PREFIX + 'bridge',
  name: 'Gentle Glute Bridge', isActive: true,
  videoUrl: 'https://www.youtube.com/watch?v=WK-5Pb9nNwQ',
  youtubeVideoId: 'WK-5Pb9nNwQ',
  videoCandidateSourcePage: 'https://www.kingstonandrichmond.nhs.uk/',
  isDemoVideo: true,
  videoCandidateReviewPending: true,
  safetyInstructions: 'Stop with sharp pain',
  painCategory: 'knee', sets: 1, repetitions: 8,
});
test.beforeEach(() => {
  days = [{
    dayNumber: 1, updatedAt: new Date('2026-01-01T00:00:00Z'),
    exercises: [{ exercise: candidate(), sets: 1, repetitions: 8 }],
  }];
});

test('exercise-specific Knee links need no separate per-video form before full programme sign-off', async () => {
  const exercise = days[0].exercises[0].exercise;
  assert.equal(gate.isCandidateForProgrammeSignoff(exercise, program), true);
  assert.equal(gate.videoConfigured(exercise), false); // NOT yet patient-licensed
  const review = await gate.inspectProgrammeRelease(program, { forProgrammeSignoff: true });
  assert.equal(review.issues.length, 0);
  assert.equal(review.exercises[0].videoReady, true);
  const publish = await gate.inspectProgrammeRelease(program);
  assert.match(publish.issues[0], /requires video suitability check/);
  assert.equal(publish.exercises[0].videoReady, false);
});

test('after ONE real whole-programme review, candidate can satisfy strict release checks', async () => {
  const exercise = days[0].exercises[0].exercise;
  exercise.videoCandidateReviewPending = false;
  exercise.isDemoVideo = false;
  assert.equal(gate.videoConfigured(exercise), true);
  const release = await gate.inspectProgrammeRelease(program);
  assert.equal(release.issues.length, 0);
});

test('direct exercise-matched YouTube URLs work without separate source page', async () => {
  const exercise = days[0].exercises[0].exercise;
  exercise.videoCandidateSourcePage = '';
  assert.equal(gate.candidateVideoProblem(exercise, program), null);
  assert.equal(gate.isCandidateForProgrammeSignoff(exercise, program), true);
  exercise.videoUrl = 'https://youtu.be/WK-5Pb9nNwQ?si=share';
  assert.equal(gate.isCandidateForProgrammeSignoff(exercise, program), true);
  const ready = await gate.inspectProgrammeRelease(program, { forProgrammeSignoff: true });
  assert.equal(ready.issues.length, 0);
});

test('generic demo, wrong YouTube ID or wrong programme still fail with clear reason', async () => {
  const exercise = days[0].exercises[0].exercise;
  exercise.videoUrl = 'https://youtu.be/ml6cT4AZdqI';
  exercise.youtubeVideoId = 'ml6cT4AZdqI';
  assert.match(gate.candidateVideoProblem(exercise, program), /Generic playback-test video/);
  exercise.youtubeVideoId = 'WK-5Pb9nNwQ';
  assert.match(gate.candidateVideoProblem(exercise, program), /does not match/);
  exercise.videoUrl = 'https://video.example.com/WK-5Pb9nNwQ';
  assert.match(gate.candidateVideoProblem(exercise, program), /valid YouTube/);
  const blocked = await gate.inspectProgrammeRelease(program, { forProgrammeSignoff: true });
  assert.match(blocked.issues.join('; '), /Gentle Glute Bridge.*YouTube/);
  exercise.videoUrl = 'https://youtu.be/WK-5Pb9nNwQ';
  assert.equal(gate.isCandidateForProgrammeSignoff(exercise, { ...program, programCode: 'other' }), false);
});

test('HTTP (non-HTTPS) exercise candidate URL must be corrected before review', () => {
  const exercise = days[0].exercises[0].exercise;
  exercise.videoUrl = 'http://youtu.be/WK-5Pb9nNwQ';
  assert.match(gate.candidateVideoProblem(exercise, program), /HTTPS/);
});

test('missing/invalid content still blocks full-programme sign-off', async () => {
  const exercise = days[0].exercises[0].exercise;
  exercise.safetyInstructions = '';
  const result = await gate.inspectProgrammeRelease(program, { forProgrammeSignoff: true });
  assert.match(result.issues.join(' '), /needs safety instructions/);
  exercise.safetyInstructions = 'Stop with sharp pain';
  days[0].exercises = [];
  const empty = await gate.inspectProgrammeRelease(program, { forProgrammeSignoff: true });
  assert.match(empty.issues.join(' '), /no exercises assigned/);
});
