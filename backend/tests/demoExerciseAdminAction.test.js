const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const writes = [];
const audits = [];
let remaining = 0;
const Exercise = {
  countDocuments: async () => remaining,
  updateMany: async (filter, change) => {
    writes.push({ filter, change });
    return { matchedCount: remaining, modifiedCount: remaining };
  },
};

const originalLoad = Module._load;
let manageDemoExerciseVideos;
try {
  Module._load = function(request, parent, isMain) {
    if (request === 'mongoose') return {};
    if (request === '../models/Exercise.model') return { Exercise, ProgramDay: {} };
    if (request === '../models/PainCategory.model') return {};
    if (request === '../utils/auditLogger') return { writeAuditLog: async (value) => { audits.push(value); } };
    if (request === '../utils/asyncHandler') return (handler) => handler;
    return originalLoad.apply(this, arguments);
  };
  ({ manageDemoExerciseVideos } = require('../src/controllers/exercise.controller'));
} finally {
  Module._load = originalLoad;
}
const originalNodeEnv = process.env.NODE_ENV;
test.after(() => {
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
});
test.beforeEach(() => { remaining = 0; writes.length = 0; audits.length = 0; process.env.NODE_ENV = 'development'; });

async function execute(body) {
  let statusCode = 200;
  let responseBody;
  const res = {
    status(value) { statusCode = value; return res; },
    json(value) { responseBody = value; return res; },
  };
  await manageDemoExerciseVideos({ body, user: { role: 'admin', _id: '507f1f77bcf86cd799439011' } }, res);
  return { statusCode, body: responseBody };
}

test('apply fills missing videos and records an audit without publishing programmes', async () => {
  remaining = 16;
  const result = await execute({ action: 'apply', acknowledgeTestingOnly: true });
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.changed, 16);
  assert.equal(result.body.programmePublished, false);
  assert.equal(result.body.realVideosOverwritten, 0);
  assert.equal(writes.length, 1);
  assert.deepEqual(writes[0].change.$set, {
    videoUrl: 'https://youtu.be/ml6cT4AZdqI?si=0VwhyxF63Vulcq5Z',
    youtubeVideoId: 'ml6cT4AZdqI',
    isDemoVideo: true,
  });
  assert.equal(writes[0].filter.$or.length, 2);
  assert.equal(writes[0].filter.$or[0].$and.length, 2);
  assert.equal(writes[0].filter.$or[1].youtubeVideoId, 'M7lc1UVf-VE');
  assert.equal(audits.length, 1);
  assert.equal(audits[0].action, 'exercise_demo_videos_bulk_added');
});

test('remove only targets exact flagged test-only videos', async () => {
  remaining = 10;
  const result = await execute({ action: 'remove', acknowledgeTestingOnly: true });
  assert.equal(result.body.changed, 10);
  assert.deepEqual(writes[0].filter, {
    $or: [
      { isDemoVideo: true, videoUrl: 'https://youtu.be/ml6cT4AZdqI?si=0VwhyxF63Vulcq5Z', youtubeVideoId: 'ml6cT4AZdqI' },
      { isDemoVideo: true, videoUrl: 'https://www.youtube.com/watch?v=M7lc1UVf-VE', youtubeVideoId: 'M7lc1UVf-VE' },
    ],
  });
  assert.deepEqual(writes[0].change.$set, {
    videoUrl: '', youtubeVideoId: '', isDemoVideo: false,
  });
});

test('never modifies anything without explicit acknowledgement', async () => {
  const result = await execute({ action: 'apply' });
  assert.equal(result.statusCode, 400);
  assert.equal(writes.length, 0);
});

test('is always forbidden in production', async () => {
  process.env.NODE_ENV = 'production';
  const result = await execute({ action: 'apply', acknowledgeTestingOnly: true });
  assert.equal(result.statusCode, 403);
  assert.equal(writes.length, 0);
});

test('zero missing videos makes no write', async () => {
  const result = await execute({ action: 'apply', acknowledgeTestingOnly: true });
  assert.equal(result.body.changed, 0);
  assert.equal(writes.length, 0);
});
