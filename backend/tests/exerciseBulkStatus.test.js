// Isolated controller unit checks. All DB operations are mocked: no patients or
// clinical content are modified when these tests run.
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const ids = ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012', '507f1f77bcf86cd799439013'];
let docs = [];
let updates = [];
let audits = [];

const Exercise = {
  find: () => ({ select: async () => docs }),
  updateMany: async (filter, change) => { updates.push({ filter, change }); return { modifiedCount: filter._id.$in.length }; },
  findById: async () => null,
};
const originalLoad = Module._load;
let bulkSetExerciseStatus;
try {
  Module._load = function (request, parent, isMain) {
    if (request === 'mongoose') return { isValidObjectId: (value) => /^[a-f0-9]{24}$/i.test(value) };
    if (request === '../models/Exercise.model') return { Exercise, ProgramDay: {} };
    if (request === '../models/PainCategory.model') return {};
    if (request === '../utils/auditLogger') return { writeAuditLog: async (entry) => { audits.push(entry); } };
    if (request === '../utils/asyncHandler') return (fn) => fn;
    return originalLoad.apply(this, arguments);
  };
  ({ bulkSetExerciseStatus } = require('../src/controllers/exercise.controller'));
} finally {
  Module._load = originalLoad;
}

const request = (body) => {
  let status = 200;
  const response = {
    status: (value) => { status = value; return response; },
    json: (value) => { response.body = value; return response; },
    get statusCode() { return status; },
  };
  return { req: { body, user: { role: 'admin', _id: ids[0] } }, res: response };
};

test.beforeEach(() => { docs = []; updates = []; audits = []; });

test('one bulk activation skips active records and emits one audit entry per changed exercise', async () => {
  docs = [{ _id: ids[0], name: 'Heel Slide', isActive: false },
    { _id: ids[1], name: 'Quad Set', isActive: false },
    { _id: ids[2], name: 'Calf Stretch', isActive: true }];
  const { req, res } = request({ exerciseIds: [...ids, ids[0]], action: 'activate', reason: 'Clinical content preparation' });
  await bulkSetExerciseStatus(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.selected, 3);
  assert.equal(res.body.changed, 2);
  assert.equal(res.body.skipped, 1);
  assert.equal(res.body.programmePublished, false);
  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0].filter._id.$in, [ids[0], ids[1]]);
  assert.deepEqual(updates[0].change, { $set: { isActive: true } });
  assert.equal(audits.length, 2);
  assert.equal(audits[0].reason, 'Clinical content preparation');
  assert.equal(audits[1].metadata.bulk, true);
});

test('bulk deactivation without typed reason preserves a standard audit reason', async () => {
  docs = [{ _id: ids[0], name: 'Heel Slide', isActive: true }];
  const { req, res } = request({ exerciseIds: [ids[0]], action: 'deactivate' });
  await bulkSetExerciseStatus(req, res);
  assert.equal(res.body.changed, 1);
  assert.match(audits[0].reason, /Bulk deactivation/);
  assert.equal(updates[0].change.$set.isActive, false);
});

test('bulk actions reject invalid or empty IDs and unknown exercises before writing', async () => {
  const invalid = request({ exerciseIds: ['not-an-id'], action: 'activate' });
  await bulkSetExerciseStatus(invalid.req, invalid.res);
  assert.equal(invalid.res.statusCode, 400);

  const missing = request({ exerciseIds: [ids[0]], action: 'activate' });
  await bulkSetExerciseStatus(missing.req, missing.res);
  assert.equal(missing.res.statusCode, 404);
  assert.equal(updates.length, 0);
  assert.equal(audits.length, 0);
});

test('already active selections result in skips and no unnecessary writes', async () => {
  docs = [{ _id: ids[0], name: 'Heel Slide', isActive: true }];
  const { req, res } = request({ exerciseIds: [ids[0]], action: 'activate' });
  await bulkSetExerciseStatus(req, res);
  assert.equal(res.body.changed, 0);
  assert.equal(res.body.skipped, 1);
  assert.equal(updates.length, 0);
  assert.equal(audits.length, 0);
});
