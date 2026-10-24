const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const DOCTOR = '507f1f77bcf86cd799439011';
const PATIENT = '507f1f77bcf86cd799439012';
const ENROLLMENT = '507f1f77bcf86cd799439013';
let ownerPatient = null;
let doctorProfile = { _id: DOCTOR };
let foundFilter;
let programsQueried = false;
let progressQueried = false;

const mocks = {
  mongoose: { isValidObjectId: (id) => /^[a-f0-9]{24}$/.test(id) },
  '../models/Doctor.model': {
    findOne: () => ({ select: () => ({ lean: async () => doctorProfile }) }),
  },
  '../models/Patient.model': {
    findOne: (filter) => {
      foundFilter = filter;
      const value = String(filter.referringDoctor) === DOCTOR && (
        filter.patientId === 'PT00011' || filter._id === PATIENT
      ) ? ownerPatient : null;
      return { select: () => ({ lean: async () => value }) };
    },
  },
  '../models/PatientProgram.model': {
    find: (filter) => {
      programsQueried = true;
      assert.equal(String(filter.patient), PATIENT);
      assert.equal(String(filter.doctor), DOCTOR);
      return {
        select: () => ({
          populate: () => ({
            sort: () => ({
              lean: async () => [{ _id: ENROLLMENT, patient: PATIENT, program: { name: 'Knee rehab', durationDays: 30 }, status: 'active', currentDay: 2, completionPercentage: 3 }],
            }),
          }),
        }),
      };
    },
  },
  '../models/ProgramProgress.model': {
    find: (filter) => {
      progressQueried = true;
      assert.equal(String(filter.patient), PATIENT);
      assert.deepEqual(filter.patientProgram.$in, [ENROLLMENT]);
      return {
        select: () => ({
          populate: () => ({
            sort: () => ({
              lean: async () => [{
                patientProgram: ENROLLMENT, dayNumber: 1,
                dayStarted: true, dayCompleted: true, painScoreBefore: 6,
                painScoreAfter: 4, feedbackText: 'It helped',
                exercises: [{ exercise: { _id: 'exercise1', name: 'Heel slides' }, markedCompleted: true }],
              }],
            }),
          }),
        }),
      };
    },
  },
  '../utils/asyncHandler': (fn) => fn,
};

const load = Module._load;
let getMyPatientProgress;
try {
  Module._load = function(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) return mocks[request];
    return load.apply(this, arguments);
  };
  ({ getMyPatientProgress } = require('../src/controllers/doctorPatientProgress.controller'));
} finally {
  Module._load = load;
}

const request = (patientId) => {
  let status = 200;
  let result;
  const headers = {};
  const res = {
    status(code) { status = code; return res; },
    set(name, value) { headers[name] = value; return res; },
    json(body) { result = body; return res; },
  };
  return {
    req: { user: { _id: 'doctor-user' }, params: { patientId } },
    res, read: () => ({ status, result, headers }),
  };
};

test.beforeEach(() => {
  ownerPatient = { _id: PATIENT, referringDoctor: DOCTOR, patientId: 'PT00011', fullName: 'Patient Example', age: 35 };
  doctorProfile = { _id: DOCTOR };
  foundFilter = null;
  programsQueried = false;
  progressQueried = false;
});

test('doctor sees day feedback only for own referred patient', async () => {
  const ctx = request('PT00011');
  await getMyPatientProgress(ctx.req, ctx.res);
  assert.equal(ctx.read().status, 200);
  assert.equal(foundFilter.referringDoctor, DOCTOR);
  assert.equal(ctx.read().result.programmes[0].days[0].feedback, 'It helped');
  assert.equal(ctx.read().result.programmes[0].summary.averagePainBefore, 6);
  assert.equal(ctx.read().result.programmes[0].summary.averagePainAfter, 4);
  assert.match(ctx.read().headers['Cache-Control'], /no-store/);
  assert.equal(programsQueried, true);
  assert.equal(progressQueried, true);
});

test('public and MongoDB patient IDs use the same referral gate', async () => {
  const ctx = request(PATIENT);
  await getMyPatientProgress(ctx.req, ctx.res);
  assert.equal(ctx.read().status, 200);
  assert.equal(foundFilter._id, PATIENT);
  assert.equal(foundFilter.referringDoctor, DOCTOR);
});

test('unrelated or direct patient cannot be accessed even if their ID is known', async () => {
  ownerPatient = null;
  const ctx = request('PT00011');
  await getMyPatientProgress(ctx.req, ctx.res);
  assert.equal(ctx.read().status, 404);
  assert.equal(ctx.read().result.message, 'Patient not found in your referrals');
  assert.equal(programsQueried, false);
  assert.equal(progressQueried, false);
});

test('invalid identifiers are rejected before any database lookup', async () => {
  const ctx = request('PT-this-is-not-valid');
  await getMyPatientProgress(ctx.req, ctx.res);
  assert.equal(ctx.read().status, 400);
  assert.equal(foundFilter, null);
  assert.equal(programsQueried, false);
});

test('doctor without profile cannot read any patient progress', async () => {
  doctorProfile = null;
  const ctx = request(PATIENT);
  await getMyPatientProgress(ctx.req, ctx.res);
  assert.equal(ctx.read().status, 404);
  assert.equal(foundFilter, null);
});
