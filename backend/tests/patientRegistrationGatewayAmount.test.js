const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const PATIENT_ID = '507f1f77bcf86cd799439011';
const DOCTOR_ID = '507f1f77bcf86cd799439012';
const PROGRAM_ID = '507f1f77bcf86cd799439013';
const REGION_ID = '507f1f77bcf86cd799439014';

let savedOrder;
let priorOrder;
let referredPatient;
const doctor = { _id: DOCTOR_ID, status: 'approved', qrCodeActive: true, approvedPatientFee: 6500, revenueModel: 'split', feeSharePercentage: 50 };
const program = { _id: PROGRAM_ID, isActive: true, painCategory: REGION_ID };
const patient = () => ({
  _id: PATIENT_ID, mobileVerified: true, consentAccepted: true,
  referringDoctor: referredPatient ? DOCTOR_ID : null,
});
const orderModel = {
  findOne: async () => priorOrder,
  create: async (data) => {
    savedOrder = data;
    return { ...data, _id: '507f1f77bcf86cd799439015' };
  },
};
const mocks = {
  '../models/Payment.model': { Order: orderModel, Payment: { findOne: async () => null } },
  '../models/Patient.model': { findById: async () => patient() },
  '../models/Doctor.model': { findById: async () => doctor },
  '../models/Program.model': {
    findById: async () => program,
    find: async () => [program],
  },
  '../models/PatientProgram.model': { findOne: async () => null },
  '../models/PatientAssessment.model': {
    findOne: () => ({
      sort: () => ({
        lean: async () => ({ status: 'cleared', painCategory: REGION_ID, approvedProgram: null, approvedPrograms: [], clinicalSelectionRequired: false }),
      }),
    }),
  },
  '../models/Coupon.model': {},
  '../models/QrScan.model': {},
  '../models/Wallet.model': { DoctorWallet: {}, WalletTransaction: {} },
  '../models/FeeShare.model': { FeeShare: {} },
  '../utils/asyncHandler': (fn) => fn,
  '../utils/idGenerator': { generateInvoiceNumber: () => 'RC/2026/000001' },
  '../utils/auditLogger': { writeAuditLog: async () => {} },
  '../services/sequence.service': { getNextSequence: async () => 1 },
  '../services/programBundle.service': { activateProgrammeBundle: async () => {} },
  '../services/fraud.service': {},
  '../services/patientAssessmentClearance.service': { requiresClinicalProgrammeSelection: () => false },
};
const originalLoad = Module._load;
let createDoctorOrder;
let createDirectOrder;
try {
  Module._load = function (request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) return mocks[request];
    return originalLoad.apply(this, arguments);
  };
  ({ createOrder: createDoctorOrder } = require('../src/controllers/payment.controller'));
  ({ createDirectOrder } = require('../src/controllers/directPayment.controller'));
} finally {
  Module._load = originalLoad;
}

const request = (direct = false, more = {}) => {
  let code = 200;
  let data;
  const res = {
    status(value) { code = value; return res; },
    json(value) { data = value; return res; },
  };
  const req = {
    user: { role: 'patient', _id: PATIENT_ID },
    body: {
      patientId: PATIENT_ID,
      programId: PROGRAM_ID,
      ...(direct ? {} : { doctorId: DOCTOR_ID }),
      ...more,
    },
  };
  return { req, res, result: () => ({ code, data }) };
};
test.beforeEach(() => {
  process.env.NODE_ENV = 'test';
  process.env.PAYMENT_GATEWAY_MODE = 'mock';
  priorOrder = null;
  savedOrder = null;
  referredPatient = false;
});

test('doctor-referred registration generates exactly INR 300 / 30000 paise despite legacy doctor fee', async () => {
  referredPatient = true;
  const call = request();
  await createDoctorOrder(call.req, call.res);
  assert.equal(call.result().code, 200);
  assert.equal(call.result().data.amount, 30000);
  assert.equal(call.result().data.finalAmount, 300);
  assert.equal(savedOrder.originalAmount, 300);
  assert.equal(savedOrder.discountAmount, 0);
  assert.equal(savedOrder.pricingSnapshot.feeSharePercentage, 50);
});

test('direct registration generates exactly INR 300 / 30000 paise despite legacy patient fee', async () => {
  const call = request(true);
  await createDirectOrder(call.req, call.res);
  assert.equal(call.result().code, 200);
  assert.equal(call.result().data.amount, 30000);
  assert.equal(call.result().data.finalAmount, 300);
  assert.equal(savedOrder.discountAmount, 0);
  assert.equal(savedOrder.pricingSnapshot.directFeeSource, 'fixed_registration_fee');
});

test('a coupon cannot lower the fixed registration payment', async () => {
  const direct = request(true, { couponCode: 'DISCOUNT50' });
  await assert.rejects(() => createDirectOrder(direct.req, direct.res), (error) => error.status === 400 && /Coupons cannot/.test(error.message));
  referredPatient = true;
  const referred = request(false, { couponCode: 'DISCOUNT50' });
  await assert.rejects(() => createDoctorOrder(referred.req, referred.res), (error) => error.status === 400 && /Coupons cannot/.test(error.message));
  assert.equal(savedOrder, null);
});

test('legacy orders cannot be reoffered at an outdated price through idempotency keys', async () => {
  priorOrder = { currency: 'INR', originalAmount: 1900, finalAmount: 1900, discountAmount: 0 };
  const direct = request(true, { idempotencyKey: 'old-direct' });
  await createDirectOrder(direct.req, direct.res);
  assert.equal(direct.result().code, 409);
  assert.match(direct.result().data.message, /outdated fee/);
  referredPatient = true;
  const referred = request(false, { idempotencyKey: 'old-doctor' });
  await createDoctorOrder(referred.req, referred.res);
  assert.equal(referred.result().code, 409);
  assert.match(referred.result().data.message, /outdated fee/);
  assert.equal(savedOrder, null);
});
