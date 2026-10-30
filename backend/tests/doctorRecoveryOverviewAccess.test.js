const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const DOCTOR_USER = '507f1f77bcf86cd799439010';
const DOCTOR = '507f1f77bcf86cd799439011';
const PATIENT = '507f1f77bcf86cd799439012';
const ENROLLMENT = '507f1f77bcf86cd799439013';

let doctorAvailable = true;
let patientList = [];
let enrollmentList = [];
let aggregateCalled = false;
let patientFilter, enrollmentFilter, pipeline;

const mocks = {
  '../models/Doctor.model': {
    findOne: (filter) => ({
      select: () => ({ lean: async () => {
        assert.deepEqual(filter, { user: DOCTOR_USER });
        return doctorAvailable ? { _id: DOCTOR } : null;
      } }),
    }),
  },
  '../models/Patient.model': {
    find: (filter) => {
      patientFilter = filter;
      return { select: () => ({ lean: async () => patientList }) };
    },
  },
  '../models/PatientProgram.model': {
    find: (filter) => {
      enrollmentFilter = filter;
      return { select: () => ({ populate: () => ({ lean: async () => enrollmentList }) }) };
    },
  },
  '../models/ProgramProgress.model': {
    aggregate: async (steps) => {
      aggregateCalled = true;
      pipeline = steps;
      return [{
        totals: [{ loggedDays: 1, completedDays: 1, reportingPatients: [PATIENT], discomfortDays: 1 }],
        updates: [{
          patient: PATIENT, patientProgram: ENROLLMENT, dayNumber: 2,
          dayCompleted: true, discomfortReported: true,
          painScoreBefore: 3, painScoreAfter: 5,
          updatedAt: new Date('2026-10-30T08:00:00Z'),
        }],
      }];
    },
  },
  '../utils/asyncHandler': (fn) => fn,
};

const loader = Module._load;
let getMyRecoveryOverview;
try {
  Module._load = function(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) return mocks[request];
    return loader.apply(this, arguments);
  };
  ({ getMyRecoveryOverview } = require('../src/controllers/doctorRecoveryOverview.controller'));
} finally {
  Module._load = loader;
}

const invoke = async () => {
  let code = 200, payload, headers = {};
  const response = {
    status(status) { code = status; return this; },
    set(key, value) { headers[key] = value; return this; },
    json(value) { payload = value; return this; },
  };
  await getMyRecoveryOverview({ user: { _id: DOCTOR_USER, role: 'doctor' } }, response);
  return { code, payload, headers };
};

test.beforeEach(() => {
  doctorAvailable = true;
  patientList = [{ _id: PATIENT, patientId: 'PT00011', fullName: 'Referred Patient' }];
  enrollmentList = [{
    _id: ENROLLMENT, patient: PATIENT, program: { name: 'Neck Rehabilitation' },
  }];
  aggregateCalled = false;
  patientFilter = null;
  enrollmentFilter = null;
  pipeline = null;
});

test('returns doctor-only recent activity with private no-store headers and careful pain flags', async () => {
  const { code, payload, headers } = await invoke();
  assert.equal(code, 200);
  assert.equal(headers['Cache-Control'], 'private, no-store');
  assert.deepEqual(patientFilter, { referringDoctor: DOCTOR });
  assert.deepEqual(enrollmentFilter, { doctor: DOCTOR, patient: { $in: [PATIENT] } });
  assert.deepEqual(pipeline[0].$match.patient, { $in: [PATIENT] });
  assert.deepEqual(pipeline[0].$match.patientProgram, { $in: [ENROLLMENT] });
  assert.equal(payload.recentUpdates[0].patientId, 'PT00011');
  assert.equal(payload.recentUpdates[0].needsReview, true);
  assert.equal(payload.recentUpdates[0].painBefore, 3);
  assert.equal(payload.recentUpdates[0].painAfter, 5);
  assert.equal(payload.completedDays, 1);
});

test('a doctor with no referred patients gets empty metrics without querying other patients', async () => {
  patientList = [];
  const { code, payload } = await invoke();
  assert.equal(code, 200);
  assert.equal(aggregateCalled, false);
  assert.equal(enrollmentFilter, null);
  assert.equal(payload.totalReferredPatients, 0);
  assert.equal(payload.recentUpdates.length, 0);
});

test('a doctor with referrals but no doctor-linked programmes cannot query their progress', async () => {
  enrollmentList = [];
  const { code, payload } = await invoke();
  assert.equal(code, 200);
  assert.equal(aggregateCalled, false);
  assert.equal(payload.totalReferredPatients, 1);
  assert.equal(payload.loggedDays, 0);
});

test('an unlinked doctor profile cannot access any referrals or progress', async () => {
  doctorAvailable = false;
  const { code, payload } = await invoke();
  assert.equal(code, 404);
  assert.equal(payload.message, 'Doctor profile not found');
  assert.equal(patientFilter, null);
  assert.equal(aggregateCalled, false);
});
