const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const agentDoctorIds = [
  '507f1f77bcf86cd799439011',
  '507f1f77bcf86cd799439012',
];
let called = 0;
let seenPipeline;
const fakePatient = {
  aggregate: async (pipeline) => {
    called += 1;
    seenPipeline = pipeline;
    return [{ _id: agentDoctorIds[0], count: 3 }];
  },
};
const originalLoad = Module._load;
let getPatientCountsByDoctor;
let countDoctorsWithPatients;
try {
  Module._load = function(request, parent, isMain) {
    if (request === '../models/Patient.model') return fakePatient;
    return originalLoad.apply(this, arguments);
  };
  ({ getPatientCountsByDoctor, countDoctorsWithPatients } = require('../src/services/agentPatientCounts.service'));
} finally {
  Module._load = originalLoad;
}

test.beforeEach(() => { called = 0; seenPipeline = undefined; });

test('doctor counts are derived from referral links only and scoped to assigned doctor IDs', async () => {
  const counts = await getPatientCountsByDoctor(agentDoctorIds);
  assert.equal(called, 1);
  assert.deepEqual(seenPipeline[0], { $match: { referringDoctor: { $in: agentDoctorIds } } });
  assert.deepEqual(seenPipeline[1], { $group: { _id: '$referringDoctor', count: { $sum: 1 } } });
  assert.equal(counts.get(agentDoctorIds[0]), 3);
  assert.equal(counts.get(agentDoctorIds[1]) || 0, 0);
  assert.equal(countDoctorsWithPatients(counts), 1);
});

test('empty agent doctor list skips database aggregation', async () => {
  const counts = await getPatientCountsByDoctor([]);
  assert.equal(called, 0);
  assert.equal(counts.size, 0);
  assert.equal(countDoctorsWithPatients(counts), 0);
});

test('aggregation returns only counts and never individual patient or payment details', async () => {
  const counts = await getPatientCountsByDoctor(agentDoctorIds);
  assert.deepEqual([...counts.entries()], [[agentDoctorIds[0], 3]]);
  assert.equal(JSON.stringify(seenPipeline).includes('paidAmount'), false);
  assert.equal(JSON.stringify(seenPipeline).includes('payment'), false);
});
