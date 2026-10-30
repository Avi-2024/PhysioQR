const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

// Public registration must not trust patient-supplied commercial/referral fields.
const DOCTOR_ID = '507f1f77bcf86cd799439099';
let savedPatient;
let doctorFinds;
const mocks = {
  '../models/Patient.model': {
    findOne: () => ({ select: async () => null }),
    create: async (payload) => {
      savedPatient = payload;
      return { _id: '507f1f77bcf86cd799439011', ...payload };
    },
  },
  '../models/Doctor.model': {
    findOne: async (filter) => {
      doctorFinds++;
      if (filter.referralCode === 'DR00001') return { _id: DOCTOR_ID, doctorId: 'DR00001', fullName: 'Doctor Example', agent: null };
      return null;
    },
  },
  '../models/QrScan.model': { create: async () => ({}), findOneAndUpdate: async () => ({}) },
  '../utils/asyncHandler': (fn) => fn,
  '../services/patientAssessmentClearance.service': { requiresClinicalProgrammeSelection: () => false },
};
const originalLoad = Module._load;
let registerPatient;
try {
  Module._load = function (request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) return mocks[request];
    return originalLoad.apply(this, arguments);
  };
  ({ registerPatient } = require('../src/controllers/patient.controller'));
} finally {
  Module._load = originalLoad;
}
const request = (extra = {}) => {
  let status = 200;
  let response;
  const req = {
    body: {
      fullName: 'Website Patient', mobile: '9999999999', age: 45,
      gender: 'female', city: 'Bhopal', ...extra,
    },
  };
  const res = {
    status(value) { status = value; return res; },
    json(value) { response = value; return res; },
  };
  return { req, res, outcome: () => ({ status, response }) };
};

test.beforeEach(() => { savedPatient = null; doctorFinds = 0; });

test('website registration assigns server-owned direct attribution and ignores forged financial fields', async () => {
  const { req, res, outcome } = request({
    referralSource: 'legacy_direct',
    referringDoctor: DOCTOR_ID,
    directPatientFee: 1900,
    referralLocked: true,
    mobileVerified: true,
  });
  await registerPatient(req, res);
  assert.equal(outcome().status, 201);
  assert.equal(savedPatient.referralSource, 'direct');
  assert.equal(savedPatient.referringDoctor, null);
  assert.equal(savedPatient.age, 45);
  assert.equal(savedPatient.gender, 'female');
  assert.equal(savedPatient.city, 'Bhopal');
  for (const forbidden of ['directPatientFee', 'referralLocked', 'mobileVerified']) {
    assert.equal(Object.prototype.hasOwnProperty.call(savedPatient, forbidden), false);
  }
  assert.equal(doctorFinds, 0);
});

test('valid doctor QR registration stays doctor-linked instead of becoming website-direct', async () => {
  const { req, res, outcome } = request({ doctorCode: 'DR00001', referralSource: 'direct' });
  await registerPatient(req, res);
  assert.equal(outcome().status, 201);
  assert.equal(savedPatient.referralSource, 'qr_code');
  assert.equal(savedPatient.referringDoctor, DOCTOR_ID);
  assert.equal(doctorFinds, 1);
});
