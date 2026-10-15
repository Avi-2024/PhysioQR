const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

// Isolated regression coverage: no real database, patient or fee is modified.
let patients = new Map();
let queries = [];
let paymentsExist = false;
let auditEvents = [];
const MONGO_ID = '507f1f77bcf86cd799439016';

const Patient = {
  findOne: async (filter) => {
    queries.push(filter);
    if (filter.patientId) return patients.get(filter.patientId) || null;
    if (filter._id) return [...patients.values()].find((patient) => String(patient._id) === filter._id) || null;
    return null;
  },
};
const Payment = { exists: async () => paymentsExist };
const mocks = {
  '../../models/Patient.model': Patient,
  '../../models/Payment.model': { Payment },
  '../../utils/auditLogger': { writeAuditLog: async (record) => { auditEvents.push(record); } },
  '../../utils/asyncHandler': (fn) => fn,
};

const originalLoad = Module._load;
let updateDirectPatientFee;
try {
  Module._load = function(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) return mocks[request];
    return originalLoad.apply(this, arguments);
  };
  ({ updateDirectPatientFee } = require('../src/controllers/admin/patient-fee.controller'));
} finally {
  Module._load = originalLoad;
}

function createPatient(overrides = {}) {
  return {
    _id: MONGO_ID,
    patientId: 'PT00016',
    referringDoctor: null,
    referralLocked: false,
    directPatientFee: undefined,
    async save() { this.saved = true; },
    ...overrides,
  };
}

function makeRequest(id = 'PT00016', fee = 1500, reason = 'Initial direct fee') {
  const req = {
    params: { id }, body: { fee, reason }, user: { _id: MONGO_ID },
  };
  let status = 200;
  let response;
  const res = {
    status(value) { status = value; return res; },
    json(value) { response = value; return res; },
  };
  return { req, res, outcome: () => ({ status, response }) };
}

test.beforeEach(() => {
  patients = new Map();
  queries = [];
  paymentsExist = false;
  auditEvents = [];
});

test('public PT ID resolves the exact patient and saves its direct fee', async () => {
  const patient = createPatient();
  patients.set(patient.patientId, patient);
  const { req, res, outcome } = makeRequest('PT00016');
  await updateDirectPatientFee(req, res);
  assert.equal(outcome().status, 200);
  assert.equal(patient.directPatientFee, 1500);
  assert.equal(patient.saved, true);
  assert.deepEqual(queries, [{ patientId: 'PT00016' }]);
  assert.equal(auditEvents.length, 1);
  assert.equal(auditEvents[0].recordId, MONGO_ID);
  assert.equal(auditEvents[0].action, 'direct_patient_fee_updated');
});

test('MongoDB ID still resolves same patient', async () => {
  const patient = createPatient();
  patients.set(patient.patientId, patient);
  const { req, res, outcome } = makeRequest(MONGO_ID, 2500);
  await updateDirectPatientFee(req, res);
  assert.equal(outcome().status, 200);
  assert.deepEqual(queries, [{ _id: MONGO_ID }]);
  assert.equal(patient.directPatientFee, 2500);
});

test('malformed or missing identifiers are rejected without a query', async () => {
  for (const id of ['not-a-patient', 'PTABC', 'PT12', '507f1f77bcf86cd79943901x']) {
    const { req, res, outcome } = makeRequest(id);
    await updateDirectPatientFee(req, res);
    assert.equal(outcome().status, 400);
  }
  assert.equal(queries.length, 0);
  assert.equal(auditEvents.length, 0);
});

test('unknown public PT ID returns 404 without changing any record', async () => {
  const { req, res, outcome } = makeRequest('PT99999');
  await updateDirectPatientFee(req, res);
  assert.equal(outcome().status, 404);
  assert.deepEqual(queries, [{ patientId: 'PT99999' }]);
  assert.equal(auditEvents.length, 0);
});

test('doctor-linked patient cannot receive admin direct fee', async () => {
  const patient = createPatient({ referringDoctor: '507f1f77bcf86cd799439099' });
  patients.set(patient.patientId, patient);
  const { req, res, outcome } = makeRequest();
  await updateDirectPatientFee(req, res);
  assert.equal(outcome().status, 409);
  assert.match(outcome().response.message, /linked to a Doctor/);
  assert.equal(patient.saved, undefined);
});

test('payment and referral lock remain enforced', async () => {
  const patient = createPatient();
  patients.set(patient.patientId, patient);
  paymentsExist = true;
  let call = makeRequest();
  await updateDirectPatientFee(call.req, call.res);
  assert.equal(call.outcome().status, 409);
  paymentsExist = false;
  patient.referralLocked = true;
  call = makeRequest();
  await updateDirectPatientFee(call.req, call.res);
  assert.equal(call.outcome().status, 409);
  assert.equal(auditEvents.length, 0);
  assert.equal(patient.saved, undefined);
});
