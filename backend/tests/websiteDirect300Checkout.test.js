const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

// Direct checkout regression tests without MongoDB, Razorpay, or actual payments.
const PATIENT_ID = '507f1f77bcf86cd799439011';
const PROGRAM_ID = '507f1f77bcf86cd799439012';
const REGION_ID = '507f1f77bcf86cd799439013';
let patient, savedOrder, gatewayDefaultReads, configuredAmount;

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
    findOne: async ({ couponCode }) => couponCode === 'SAVE50' ? { couponCode, usedCount: 0, usageLimit: 10, isActive: true, discountType: 'fixed', discountValue: 50 } : null,
  },
  '../models/AppSetting.model': {
    findOne: () => ({
      lean: async () => {
        gatewayDefaultReads++;
        return { value: { directPatientDefaultFee: configuredAmount } };
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
  patient = { _id: PATIENT_ID, mobileVerified: true, consentAccepted: true, referralSource: 'direct', referringDoctor: null, directPatientFee: undefined };
  configuredAmount = 0;
  savedOrder = null;
  gatewayDefaultReads = 0;
});

test('homepage direct payment defaults to ₹300 (30000 paise) when Admin fee is unset', async () => {
  const { req, res, outcome } = request();
  await createDirectOrder(req, res);
  assert.equal(outcome().status, 200);
  assert.equal(outcome().result.amount, 30000);
  assert.equal(outcome().result.finalAmount, 300);
  assert.equal(savedOrder.originalAmount, 300);
  assert.equal(savedOrder.discountAmount, 0);
  assert.equal(savedOrder.finalAmount, 300);
  assert.equal(savedOrder.pricingSnapshot.directFeeSource, 'website_direct_default');
  assert.equal(savedOrder.pricingSnapshot.feeAuthority, 'admin');
  assert.equal(savedOrder.pricingSnapshot.doctorFeeShare, 0);
  assert.equal(gatewayDefaultReads, 1);
});

test('Admin Finance setting changes website-direct Razorpay amount', async () => {
  configuredAmount = 750;
  const { req, res, outcome } = request();
  await createDirectOrder(req, res);
  assert.equal(outcome().status, 200);
  assert.equal(outcome().result.amount, 75000);
  assert.equal(savedOrder.finalAmount, 750);
  assert.equal(savedOrder.pricingSnapshot.directFeeSource, 'admin_default');
});

test('Admin patient-specific override remains effective before payment', async () => {
  configuredAmount = 750;
  patient.directPatientFee = 950;
  const { req, res, outcome } = request();
  await createDirectOrder(req, res);
  assert.equal(outcome().status, 200);
  assert.equal(outcome().result.amount, 95000);
  assert.equal(savedOrder.pricingSnapshot.directFeeSource, 'patient_override');
  assert.equal(gatewayDefaultReads, 0);
});

test('existing coupon logic remains active for a website-direct payment', async () => {
  const { req, res, outcome } = request({ couponCode: 'SAVE50' });
  await createDirectOrder(req, res);
  assert.equal(outcome().status, 200);
  assert.equal(outcome().result.originalAmount, 300);
  assert.equal(outcome().result.discountAmount, 50);
  assert.equal(outcome().result.finalAmount, 250);
  assert.equal(outcome().result.amount, 25000);
  assert.equal(savedOrder.pricingSnapshot.couponCode, 'SAVE50');
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
  configuredAmount = 1800;
  const { req, res, outcome } = request();
  await createDirectOrder(req, res);
  assert.equal(outcome().status, 200);
  assert.equal(outcome().result.amount, 180000);
  assert.equal(savedOrder.pricingSnapshot.directFeeSource, 'admin_default');
  assert.equal(gatewayDefaultReads, 1);
});
