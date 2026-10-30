const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

// Direct checkout regression tests without MongoDB, Razorpay, or actual payments.
const PATIENT_ID = '507f1f77bcf86cd799439011';
const PROGRAM_ID = '507f1f77bcf86cd799439012';
const REGION_ID = '507f1f77bcf86cd799439013';
let patient, savedOrder, gatewayDefaultReads;

const mockModels = {
  '../models/Patient.model': { findById: async () => patient },
  '../models/PatientAssessment.model': {
    findOne: () => ({ sort: () => ({ lean: async () => ({
      status: 'cleared', painCategory: REGION_ID, approvedPrograms: [], approvedProgram: null,
    }) }) }),
  },
  '../models/Program.model': {
    findById: async () => ({ _id: PROGRAM_ID, isActive: true, painCategory: REGION_ID }),
    find: async () => [{ _id: PROGRAM_ID, isActive: true, painCategory: REGION_ID }],
  },
  '../models/PatientProgram.model': { findOne: async () => null },
  '../models/Payment.model': {
    Order: {
      create: async (order) => { savedOrder = order; return order; },
      findOne: async () => null,
    },
    Payment: {},
  },
  '../models/Coupon.model': {
    findOne: async () => { throw new Error('Unexpected coupon lookup'); },
  },
  '../models/AppSetting.model': {
    findOne: () => ({
      lean: async () => {
        gatewayDefaultReads++;
        return { value: { directPatientDefaultFee: 1800 } };
      },
    }),
  },
  '../utils/idGenerator': { generateInvoiceNumber: () => 'RC/2026/000001' },
  '../utils/auditLogger': { writeAuditLog: async () => {} },
  '../utils/asyncHandler': (fn) => fn,
  '../services/sequence.service': { getNextSequence: async () => 1 },
  '../services/programBundle.service': { activateProgrammeBundle: async () => {} },
  '../services/patientAssessmentClearance.service': { requiresClinicalProgrammeSelection: () => false },
  '../services/fraud.service': {},
};

const originalLoad = Module._load;
let createDirectOrder;
try {
  Module._load = function (request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mockModels, request)) return mockModels[request];
    return originalLoad.apply(this, arguments);
  };
  ({ createDirectOrder } = require('../src/controllers/directPayment.controller'));
} finally {
  Module._load = originalLoad;
}

const request = (body = {}) => {
  let status = 200;
  let result;
  const req = {
    body: { patientId: PATIENT_ID, programId: PROGRAM_ID, ...body },
    user: { _id: PATIENT_ID, role: 'patient' },
  };
  const res = {
    status: (code) => { status = code; return res; },
    json: (payload) => { result = payload; return res; },
  };
  return { req, res, outcome: () => ({ status, result }) };
};

test.beforeEach(() => {
  process.env.NODE_ENV = 'test';
  process.env.PAYMENT_GATEWAY_MODE = 'mock';
  patient = { _id: PATIENT_ID, mobileVerified: true, consentAccepted: true, referralSource: 'direct', referringDoctor: null, directPatientFee: 5000 };
  savedOrder = null;
  gatewayDefaultReads = 0;
});

test('homepage direct payment charges exactly ₹300 (30000 paise) even with legacy Admin overrides', async () => {
  const { req, res, outcome } = request();
  await createDirectOrder(req, res);
  assert.equal(outcome().status, 200);
  assert.equal(outcome().result.amount, 30000);
  assert.equal(outcome().result.finalAmount, 300);
  assert.equal(savedOrder.originalAmount, 300);
  assert.equal(savedOrder.discountAmount, 0);
  assert.equal(savedOrder.finalAmount, 300);
  assert.equal(savedOrder.pricingSnapshot.directFeeSource, 'website_direct_fixed');
  assert.equal(savedOrder.pricingSnapshot.feeAuthority, 'platform');
  assert.equal(savedOrder.pricingSnapshot.doctorFeeShare, 0);
  assert.equal(gatewayDefaultReads, 0);
});

test('website direct checkout cannot silently discount fixed ₹300 with a coupon', async () => {
  const { req, res } = request({ couponCode: 'DISCOUNT50' });
  await assert.rejects(() => createDirectOrder(req, res),
    (err) => err.status === 400 && /fixed ₹300/.test(err.message));
  assert.equal(savedOrder, null);
});

test('doctor-referred patients cannot enter direct payment endpoint', async () => {
  patient = { ...patient, referringDoctor: 'doctor-id', referralSource: 'qr_code' };
  const { req, res } = request();
  await assert.rejects(() => createDirectOrder(req, res),
    (err) => err.status === 409 && /doctor-linked payment flow/i.test(err.message));
  assert.equal(savedOrder, null);
});

test('other non-website direct patients still use configured Admin default', async () => {
  patient.referralSource = 'legacy_direct';
  patient.directPatientFee = undefined;
  const { req, res, outcome } = request();
  await createDirectOrder(req, res);
  assert.equal(outcome().status, 200);
  assert.equal(outcome().result.amount, 180000);
  assert.equal(savedOrder.pricingSnapshot.directFeeSource, 'admin_default');
  assert.equal(gatewayDefaultReads, 1);
});
