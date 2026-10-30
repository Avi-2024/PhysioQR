const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

// Isolated route-controller tests: no database, gateway, or live clinical data.
const PATIENT_ID = '507f1f77bcf86cd799439011';
const REGION_ID = '507f1f77bcf86cd799439012';
const PROGRAM_ID = '507f1f77bcf86cd799439013';
let patient;
let fee;
let feeSource;
const mockPatient = {
  findById: (id) => {
    assert.equal(id, PATIENT_ID);
    return { populate: async () => patient };
  },
};
const mockAssessment = {
  findOne: () => ({
    sort: () => ({
      select: () => ({
        lean: async () => ({
          painCategory: REGION_ID, status: 'cleared',
          approvedProgram: null, approvedPrograms: [],
          clinicalSelectionRequired: false,
        }),
      }),
    }),
  }),
};
const mockProgram = {
  findOne: () => ({
    populate: () => ({
      sort: async () => ({
        _id: PROGRAM_ID, name: 'General Knee', isActive: true,
        painCategory: REGION_ID, durationDays: 30, difficultyLevel: 'beginner',
      }),
    }),
  }),
};
const mocks = {
  '../models/Patient.model': mockPatient,
  '../models/PatientAssessment.model': mockAssessment,
  '../models/Program.model': mockProgram,
  '../utils/asyncHandler': (fn) => fn,
  '../services/patientAssessmentClearance.service': { requiresClinicalProgrammeSelection: () => false },
  '../services/directPatientPricing.service': { resolveDirectPatientFee: async (item) => item.referralSource === 'direct' && !item.referringDoctor ? { amount: 300, source: 'website_direct_fixed' } : { amount: fee, source: feeSource } },
};

const originalLoad = Module._load;
let getPurchaseQuote;
try {
  Module._load = function(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) return mocks[request];
    return originalLoad.apply(this, arguments);
  };
  ({ getPurchaseQuote } = require('../src/controllers/patientPurchase.controller'));
} finally {
  Module._load = originalLoad;
}

const request = () => {
  let status = 200;
  let response;
  const res = {
    status(code) { status = code; return res; },
    json(data) { response = data; return res; },
  };
  return { req: { user: { _id: PATIENT_ID } }, res, outcome: () => ({ status, response }) };
};

test.beforeEach(() => {
  patient = { _id: PATIENT_ID, fullName: 'Patient Example', mobile: '9999999999', referringDoctor: null };
  fee = 1800;
  feeSource = 'admin_default';
});

test('direct patient receives programme, admin default price and direct checkout mode', async () => {
  const { req, res, outcome } = request();
  await getPurchaseQuote(req, res);
  assert.equal(outcome().status, 200);
  assert.equal(outcome().response.purchaseMode, 'direct');
  assert.equal(outcome().response.program.id, PROGRAM_ID);
  assert.equal(outcome().response.doctor, null);
  assert.equal(outcome().response.pricing.originalAmount, 1800);
  assert.equal(outcome().response.pricing.source, 'admin_default');
});

test('patient-level fee source is preserved in direct quote', async () => {
  fee = 2100;
  feeSource = 'patient_override';
  const { req, res, outcome } = request();
  await getPurchaseQuote(req, res);
  assert.equal(outcome().response.pricing.originalAmount, 2100);
  assert.equal(outcome().response.pricing.source, 'patient_override');
});

test('no configured fee blocks payment with an actionable message', async () => {
  fee = 0;
  feeSource = 'not_configured';
  const { req, res, outcome } = request();
  await getPurchaseQuote(req, res);
  assert.equal(outcome().status, 400);
  assert.equal(outcome().response.code, 'PATIENT_FEE_NOT_CONFIGURED');
  assert.match(outcome().response.message, /default direct-patient fee/);
});

test('referred patient keeps doctor pricing, not admin pricing', async () => {
  patient.referringDoctor = {
    _id: '507f1f77bcf86cd799439014',
    fullName: 'Doctor Example',
    status: 'approved', qrCodeActive: true,
    approvedPatientFee: 3200, revenueModel: 'split',
  };
  const { req, res, outcome } = request();
  await getPurchaseQuote(req, res);
  assert.equal(outcome().status, 200);
  assert.equal(outcome().response.purchaseMode, 'doctor_referral');
  assert.equal(outcome().response.pricing.originalAmount, 3200);
  assert.equal(outcome().response.pricing.source, 'doctor_patient_fee');
});

test('website-direct purchase quote displays fixed ₹300 and platform pricing source', async () => {
  patient.referralSource = 'direct';
  fee = 1500;
  feeSource = 'patient_override';
  const { req, res, outcome } = request();
  await getPurchaseQuote(req, res);
  assert.equal(outcome().status, 200);
  assert.equal(outcome().response.purchaseMode, 'direct');
  assert.equal(outcome().response.pricing.originalAmount, 300);
  assert.equal(outcome().response.pricing.finalAmount, 300);
  assert.equal(outcome().response.pricing.source, 'website_direct_fixed');
  assert.equal(outcome().response.pricing.feeAuthority, 'platform');
  assert.equal(outcome().response.doctor, null);
});
