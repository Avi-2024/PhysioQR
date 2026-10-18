const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

// The clinician-approval rule must live in the payment controller, not only
// the browser/quote. Test without MongoDB, Razorpay, or actual patient data.
const ID = '507f1f77bcf86cd799439011';
const PROGRAM_ID = '507f1f77bcf86cd799439012';
const REGION_ID = '507f1f77bcf86cd799439013';
const assessment = {
  status: 'cleared',
  painCategory: REGION_ID,
  clinicalSelectionRequired: true,
  approvedPrograms: [],
  approvedProgram: null,
};
const models = {
  '../models/Patient.model': { findById: async () => ({ _id: ID, mobileVerified: true, consentAccepted: true, referringDoctor: null }) },
  '../models/PatientAssessment.model': { findOne: () => ({ sort: () => ({ lean: async () => assessment }) }) },
  '../models/Program.model': { findById: async () => ({ _id: PROGRAM_ID, isActive: true, painCategory: REGION_ID }) },
  '../models/Payment.model': { Order: {}, Payment: {} },
  '../models/PatientProgram.model': {},
  '../models/Coupon.model': {},
  '../utils/idGenerator': { generateInvoiceNumber: () => 'RC/2026/000001' },
  '../utils/auditLogger': { writeAuditLog: async () => {} },
  '../utils/asyncHandler': (fn) => fn,
  '../services/sequence.service': { getNextSequence: async () => 1 },
  '../services/programBundle.service': { activateProgrammeBundle: async () => {} },
  '../services/fraud.service': {},
  '../services/directPatientPricing.service': { resolveDirectPatientFee: async () => ({ amount: 2000, source: 'admin_default' }) },
};

const originalLoad = Module._load;
let createDirectOrder;
try {
  Module._load = function(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(models, request)) return models[request];
    return originalLoad.apply(this, arguments);
  };
  ({ createDirectOrder } = require('../src/controllers/directPayment.controller'));
} finally {
  Module._load = originalLoad;
}

test('a cleared clinical-review patient cannot bypass programme sign-off with the direct API', async () => {
  const req = {
    body: { patientId: ID, programId: PROGRAM_ID },
    user: { _id: ID, role: 'patient' },
  };
  const res = { status: () => res, json: () => res };
  await assert.rejects(
    () => createDirectOrder(req, res),
    (error) => error.status === 409 && /clinician must approve/i.test(error.message),
  );
});
