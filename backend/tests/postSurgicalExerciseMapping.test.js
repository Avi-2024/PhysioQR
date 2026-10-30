const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const REGION = '507f1f77bcf86cd799439011';
const SURGERY = '507f1f77bcf86cd799439012';
const EXERCISE = '507f1f77bcf86cd799439013';
const PROGRAM = '507f1f77bcf86cd799439014';
let mockSurgery, matchingPrograms, assignedExercises, capturedQuery;
const fakeSurgeryType = {
  findOne: (query) => {
    capturedQuery = query;
    return { select: () => ({ lean: async () => mockSurgery }) };
  },
};
const fakeProgram = {
  find: (query) => {
    capturedQuery = query;
    return { select: () => ({ lean: async () => matchingPrograms }) };
  },
};
const fakeProgramDay = {
  distinct: async (_field, query) => {
    capturedQuery = query;
    return assignedExercises;
  },
};
const mocks = {
  '../models/SurgeryType.model': fakeSurgeryType,
  '../models/Program.model': fakeProgram,
  '../models/Exercise.model': { ProgramDay: fakeProgramDay },
};
const originalLoad = Module._load;
let lookupSurgery, surgeryProgrammeCode, exerciseIdsForSurgeryProgramme, surgeryFilter;
try {
  Module._load = function (request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) return mocks[request];
    return originalLoad.apply(this, arguments);
  };
  ({ lookupSurgery, surgeryProgrammeCode, exerciseIdsForSurgeryProgramme, surgeryFilter } =
    require('../src/services/surgicalExerciseMapping.service'));
} finally {
  Module._load = originalLoad;
}

test.beforeEach(() => {
  mockSurgery = { _id: SURGERY, name: 'ACL Reconstruction', code: 'acl_reconstruction', bodyRegion: REGION, isActive: true };
  matchingPrograms = [{ _id: PROGRAM }];
  assignedExercises = [EXERCISE];
  capturedQuery = null;
});

test('every supported seeded post-surgery condition gets a stable distinct programme identity', () => {
  const seed = fs.readFileSync(path.join(__dirname, '../scripts/seedAssessmentPathways.js'), 'utf8');
  const surgeryBlock = seed.split('const surgeries = {')[1].split('};')[0];
  const supported = [...surgeryBlock.matchAll(/\['([a-z_]+)',\s*'([^']+)'\]/g)].map((m) => m[1]);
  assert.ok(supported.length >= 20, 'Expect seeded knee, shoulder, hip, spine, ankle/foot, elbow, wrist/hand surgeries');
  const codes = supported.map(surgeryProgrammeCode);
  assert.equal(new Set(codes).size, supported.length, 'Post-op programme codes must not collide');
  assert.ok(codes.every((c) => /^POSTOP-[A-Z0-9-]+$/.test(c)));
  for (const code of supported) assert.equal(surgeryProgrammeCode(code), 'POSTOP-' + code.toUpperCase().replaceAll('_', '-'));
});

test('active surgery is looked up by exact ID; unknown or inactive is rejected', async () => {
  assert.deepEqual(await lookupSurgery(SURGERY), mockSurgery);
  assert.deepEqual(capturedQuery, { _id: SURGERY, isActive: true });
  await assert.rejects(lookupSurgery('Knee Surgery'), { status: 400 });
  mockSurgery = null;
  await assert.rejects(lookupSurgery(SURGERY), { status: 404 });
});

test('surgical exercise lookup uses ONLY matching post-operative programmes for same body region', async () => {
  const ids = await exerciseIdsForSurgeryProgramme(mockSurgery);
  assert.deepEqual(ids, [EXERCISE]);
  assert.equal(capturedQuery.program.$in[0], PROGRAM);
  assert.equal(capturedQuery.isActive, true);
});

test('programme must be active and explicitly associated with surgery rather than body region alone', async () => {
  matchingPrograms = [];
  assert.deepEqual(await exerciseIdsForSurgeryProgramme(mockSurgery), []);
  assert.equal(capturedQuery.isActive, true);
  assert.equal(capturedQuery.difficultyLevel, 'post_operative');
  assert.equal(capturedQuery.painCategory, REGION);
  assert.ok(capturedQuery.$or.some((c) => c.programCode === 'POSTOP-ACL-RECONSTRUCTION'));
  assert.ok(capturedQuery.$or.some((c) => c.eligibleConditions === 'ACL Reconstruction'));
});

test('condition selector joins explicit condition tags with exercises in surgical programmes', () => {
  assert.deepEqual(surgeryFilter(SURGERY, [EXERCISE], REGION), {
    $or: [{ surgeryTypes: SURGERY, painCategory: REGION }, { _id: { $in: [EXERCISE] } }],
  });
  assert.deepEqual(surgeryFilter(SURGERY, [], REGION), {
    $or: [{ surgeryTypes: SURGERY, painCategory: REGION }],
  });
  const raw = JSON.stringify(surgeryFilter(SURGERY, [], REGION));
  assert.ok(!raw.includes('post_operative') && !raw.includes('all'),
    'Never implicitly show all general body-region exercises for ACL surgery');
});

test('all seeded surgery types resolve an exact programme and linked exercise IDs', async () => {
  const seed = fs.readFileSync(path.join(__dirname, '../scripts/seedAssessmentPathways.js'), 'utf8');
  const block = seed.split('const surgeries = {')[1].split('};')[0];
  const pairs = [...block.matchAll(/\['([a-z_]+)',\s*'([^']+)'\]/g)];
  assert.ok(pairs.length >= 20);
  for (const [, code, name] of pairs) {
    const surgery = { _id: SURGERY, code, name, bodyRegion: REGION };
    const programId = '507f1f77bcf86cd799439015';
    let requestedFilter;
    matchingPrograms = [{ _id: programId }];
    fakeProgram.find = (filter) => {
      requestedFilter = filter;
      return { select: () => ({ lean: async () => matchingPrograms }) };
    };
    const result = await exerciseIdsForSurgeryProgramme(surgery);
    assert.deepEqual(result, [EXERCISE], code);
    assert.equal(requestedFilter.difficultyLevel, 'post_operative', code);
    assert.equal(requestedFilter.painCategory, REGION, code);
    assert.ok(requestedFilter.$or.some((item) => item.programCode === surgeryProgrammeCode(code)), code);
  }
});
