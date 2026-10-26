const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const PATIENT = '507f1f77bcf86cd799439011';
const PROGRAM = '507f1f77bcf86cd799439012';
const REGION = '507f1f77bcf86cd799439013';
const ASSESSMENT = '507f1f77bcf86cd799439014';
let created = null;
let audit = null;
let previousEnrollment = null;
let programmeDayReady = true;
let paymentExists = true;
let activeExists = true;
let unresolved = false;
let selectedPatient = {
  _id: PATIENT, patientId: 'PT00011', status: 'active', mobileVerified: true,
  consentAccepted: true, referringDoctor: null,
};
const programDoc = { _id: PROGRAM, painCategory: REGION, isActive: true, durationDays: 30, clinicalApprovalRequired: false };
const assessment = { _id: ASSESSMENT, painCategory: REGION, status: 'cleared', clinicalSelectionRequired: false, createdAt: new Date('2026-10-22T12:00:00Z') };
const day = {
  exercises: [{ exercise: { _id: '507f1f77bcf86cd799439022', isActive: true, isDemoVideo: false, videoUrl: 'https://youtu.be/ABCDEFGHIJK', youtubeVideoId: 'ABCDEFGHIJK' } }],
};
const mock = {
  '../../models/Patient.model': {
    findOne: async () => selectedPatient,
  },
  '../../models/PatientProgram.model': {
    exists: async () => activeExists,
    findOne: () => ({ select: () => ({ lean: async () => previousEnrollment }) }),
    create: async (payload) => {
      created = payload;
      return { _id: '507f1f77bcf86cd799439020', ...payload };
    },
  },
  '../../models/PatientAssessment.model': {
    exists: async () => unresolved,
    find: () => ({
      select: () => ({
        sort: () => ({ lean: async () => [assessment] }),
      }),
    }),
  },
  '../../models/Program.model': { findOne: async () => programDoc },
  '../../models/Payment.model': { Payment: { exists: async () => paymentExists } },
  '../../utils/asyncHandler': (fn) => fn,
  '../../utils/auditLogger': { writeAuditLog: async (payload) => { audit = payload; } },
  '../../services/programmeReleaseGate.service': { ensureApprovedRelease: async () => {} },
  '../../models/Exercise.model': {
    ProgramDay: {
      findOne: () => ({
        populate: () => ({ lean: async () => programmeDayReady ? day : null }),
      }),
    },
  },
};
const originalLoad = Module._load;
let assignComplimentaryProgramme;
try {
  Module._load = function(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mock, request)) return mock[request];
    return originalLoad.apply(this, arguments);
  };
  ({ assignComplimentaryProgramme } = require('../src/controllers/admin/complimentary-programmes.controller'));
} finally {
  Module._load = originalLoad;
}
const call = async () => {
  let status = 200;
  let json;
  const res = { status(value) { status = value; return res; }, set() { return res; }, json(value) { json = value; return res; } };
  await assignComplimentaryProgramme({
    params: { id: 'PT00011' },
    body: { programId: PROGRAM, clinicalNote: 'Clinically approved for additional rehabilitation.', confirmFree: true },
    user: { _id: '507f1f77bcf86cd799439019', role: 'admin' },
  }, res);
  return { status, json };
};
test.beforeEach(() => {
  created = null;
  audit = null;
  previousEnrollment = null;
  programmeDayReady = true;
  paymentExists = true;
  activeExists = true;
  unresolved = false;
  selectedPatient = { _id: PATIENT, patientId: 'PT00011', status: 'active', mobileVerified: true, consentAccepted: true, referringDoctor: null };
});

test('creates a separate active Day 1 enrolment without a new payment or fee share', async () => {
  const response = await call();
  assert.equal(response.status, 201);
  assert.equal(response.json.amountCharged, 0);
  assert.equal(created.currentDay, 1);
  assert.equal(created.completionPercentage, 0);
  assert.equal(created.status, 'active');
  assert.equal(created.program, PROGRAM);
  assert.equal(created.patient, PATIENT);
  assert.equal(created.payment, undefined);
  assert.equal(created.activationPayment, undefined);
  assert.equal(created.complimentaryAssignment.source, 'admin');
  assert.equal(created.complimentaryAssignment.clinicalAssessment, ASSESSMENT);
  assert.equal(audit.action, 'patient_additional_programme_complimentary');
  assert.equal(audit.newValue.amountCharged, 0);
});

test('does not grant initial unpaid therapy access', async () => {
  paymentExists = false;
  const response = await call();
  assert.equal(response.status, 409);
  assert.equal(created, null);
});

test('does not assign when clinical review remains unresolved', async () => {
  unresolved = true;
  const response = await call();
  assert.equal(response.status, 409);
  assert.equal(created, null);
});

test('does not modify or recreate existing programme and progress', async () => {
  previousEnrollment = { _id: 'existing', status: 'completed' };
  const response = await call();
  assert.equal(response.status, 409);
  assert.equal(created, null);
});

test('does not activate programmes without a verified approved day-one video', async () => {
  programmeDayReady = false;
  const response = await call();
  assert.equal(response.status, 409);
  assert.equal(response.json.code, 'PROGRAMME_DAY_ONE_UNAVAILABLE');
  assert.equal(created, null);
});

test('does not assign while patient account is blocked', async () => {
  selectedPatient.status = 'blocked';
  const response = await call();
  assert.equal(response.status, 409);
  assert.equal(created, null);
});
