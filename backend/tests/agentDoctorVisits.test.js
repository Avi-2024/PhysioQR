const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const agentId = '507f1f77bcf86cd799439011';
const doctorIds = ['507f1f77bcf86cd799439012', '507f1f77bcf86cd799439013'];
let called = 0;
let pipeline;
const originalLoad = Module._load;
let getClinicVisitCountsByDoctor;
try {
  Module._load = function(request, parent, isMain) {
    if (request === '../models/ClinicVisit.model') return {
      aggregate: async (stages) => {
        called += 1;
        pipeline = stages;
        return [{ _id: doctorIds[0], count: 9 }];
      },
    };
    return originalLoad.apply(this, arguments);
  };
  ({ getClinicVisitCountsByDoctor } = require('../src/services/agentDoctorVisits.service'));
} finally {
  Module._load = originalLoad;
}

test.beforeEach(() => { called = 0; pipeline = null; });

test('aggregate counts are strictly restricted to the current agent and its own doctor IDs', async () => {
  const result = await getClinicVisitCountsByDoctor({ agentId, doctorIds });
  assert.equal(called, 1);
  assert.deepEqual(pipeline, [
    { $match: { agent: agentId, doctor: { $in: doctorIds } } },
    { $group: { _id: '$doctor', count: { $sum: 1 } } },
  ]);
  assert.equal(result.get(doctorIds[0]), 9);
  assert.equal(result.get(doctorIds[1]) || 0, 0);
});

test('empty doctor list or missing agent does not query or expose other agents records', async () => {
  assert.equal((await getClinicVisitCountsByDoctor({ agentId, doctorIds: [] })).size, 0);
  assert.equal((await getClinicVisitCountsByDoctor({ doctorIds })).size, 0);
  assert.equal(called, 0);
});

test('no visit notes, patient details or financial fields are returned', async () => {
  const result = await getClinicVisitCountsByDoctor({ agentId, doctorIds });
  assert.deepEqual([...result.entries()], [[doctorIds[0], 9]]);
  assert.equal(JSON.stringify(pipeline).includes('paidAmount'), false);
  assert.equal(JSON.stringify(pipeline).includes('discussionDetails'), false);
});
