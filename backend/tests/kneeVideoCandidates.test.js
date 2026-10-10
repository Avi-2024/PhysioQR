const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { EXERCISE_PREFIX, exercises } = require('../src/data/generalKnee30DayDraft');
const { CANDIDATES, validateCandidates } = require('../src/data/generalKneeExerciseVideoCandidates');

let programme = { _id: 'p', programCode: 'DRAFT-KNEE-GENERAL-30D', painCategory: 'knee',
  isActive: false, clinicalApprovalRequired: true };
let records = [], writes = [];
const Program = { findOne: () => ({ lean: async () => programme }) };
const Exercise = {
  find: () => ({ select: () => ({ lean: async () => records }) }),
  updateOne: async (filter, change) => {
    writes.push({ filter, change });
    const row = records.find((record) => String(record._id) === String(filter._id));
    if (row) Object.assign(row, change.$set);
    return { modifiedCount: row ? 1 : 0 };
  },
};
const originalLoad = Module._load;
let assignKneeVideoCandidates;
try {
  Module._load = function (request, parent, isMain) {
    if (request === '../models/Program.model') return Program;
    if (request === '../models/Exercise.model') return { Exercise };
    return originalLoad.apply(this, arguments);
  };
  ({ assignKneeVideoCandidates } = require('../src/services/kneeVideoCandidateMapping.service'));
} finally {
  Module._load = originalLoad;
}

const originalEnv = process.env.NODE_ENV;
test.after(() => {
  if (originalEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalEnv;
});
test.beforeEach(() => {
  process.env.NODE_ENV = 'development';
  programme = { _id: 'p', programCode: 'DRAFT-KNEE-GENERAL-30D', painCategory: 'knee',
    isActive: false, clinicalApprovalRequired: true };
  writes = [];
  records = exercises.map((exercise, index) => ({
    _id: String(index + 1), name: exercise.name,
    seedKey: EXERCISE_PREFIX + exercise.key, videoUrl: '',
    youtubeVideoId: '', isDemoVideo: false,
  }));
});

test('15 real source URLs exist and all belong to different exercise keys', () => {
  assert.deepEqual(validateCandidates(exercises.map((exercise)=>exercise.key)), []);
  const ids = Object.values(CANDIDATES).map((candidate)=>candidate.youtubeVideoId);
  assert.equal(ids.length, 15);
  assert.equal(new Set(ids).size, 15);
  assert.ok(Object.values(CANDIDATES).every((item)=>item.sourcePage && item.videoTitle));
});

test('dry run makes no DB changes', async () => {
  const result = await assignKneeVideoCandidates();
  assert.equal(result.items.length, 15);
  assert.equal(result.changed, 0);
  assert.equal(writes.length, 0);
  assert.equal(result.patientProgrammePublished, false);
});

test('apply assigns a different candidate per exercise, pending clinical review', async () => {
  const result = await assignKneeVideoCandidates({ apply: true });
  assert.equal(result.changed, 15);
  assert.equal(writes.length, 15);
  assert.equal(new Set(writes.map((item) => item.change.$set.youtubeVideoId)).size, 15);
  for (const item of writes) {
    assert.equal(item.change.$set.isDemoVideo, true);
    assert.equal(item.change.$set.videoCandidateReviewPending, true);
    assert.equal(item.filter.seedKey.startsWith(EXERCISE_PREFIX), true);
    assert.equal(item.filter.$or.length, 2);
  }
  assert.equal(result.patientProgrammePublished, false);
  // Idempotent: after simulated writes, no blank or old-demo URL remains.
  const second = await assignKneeVideoCandidates({ apply: true });
  assert.equal(second.changed, 0);
});

test('preserves custom real video links, replaces only previous demo link', async () => {
  records[0].videoUrl = 'https://www.youtube.com/watch?v=QWERTY12345';
  records[0].youtubeVideoId = 'QWERTY12345';
  records[1].videoUrl = 'https://youtu.be/ml6cT4AZdqI?si=0VwhyxF63Vulcq5Z';
  records[1].youtubeVideoId = 'ml6cT4AZdqI';
  records[1].isDemoVideo = true;
  const result = await assignKneeVideoCandidates({ apply: true });
  assert.equal(result.preserved, 1);
  assert.equal(result.changed, 14);
  assert.equal(writes.some((item) => item.filter._id === records[0]._id), false);
  assert.equal(records[0].youtubeVideoId, 'QWERTY12345');
});

test('never changes published or unprotected programme', async () => {
  programme.isActive = true;
  await assert.rejects(assignKneeVideoCandidates({ apply: true }), /active or lacks/);
  assert.equal(writes.length, 0);
  programme.isActive = false;
  programme.clinicalApprovalRequired = false;
  await assert.rejects(assignKneeVideoCandidates({ apply: true }), /active or lacks/);
});

test('disabled in production', async () => {
  process.env.NODE_ENV = 'production';
  await assert.rejects(assignKneeVideoCandidates({ apply: true }), /disabled in production/);
  assert.equal(writes.length, 0);
});
