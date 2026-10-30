const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const REGION_PROGRAM = '507f1f77bcf86cd799439012';
const agentUser = '507f1f77bcf86cd799439011';
let created = null, audit = null;

const mocks = {
  mongoose: { isValidObjectId: (id) => /^[0-9a-f]{24}$/i.test(String(id)) },
  '../models/Doctor.model': {
    findOne: () => ({ select: () => ({ lean: async () => null }) }),
    create: async (payload) => {
      created = payload;
      return { ...payload, _id: '507f1f77bcf86cd799439013',
        toObject: () => ({ ...payload, _id: '507f1f77bcf86cd799439013' }) };
    },
  },
  '../models/Agent.model': { findOne: () => ({ select: async () => ({ _id: '507f1f77bcf86cd799439014', status: 'active' }) }) },
  '../models/User.model': { exists: async () => false },
  '../models/Program.model': { findOne: () => ({ select: () => ({ lean: async () => ({ _id: REGION_PROGRAM }) }) }) },
  '../services/doctorApproval.service': { provisionApprovedDoctor: async () => ({ temporaryPassword: 'temporary' }) },
  '../utils/auditLogger': { writeAuditLog: async (payload) => { audit = payload; } },
  '../utils/asyncHandler': (fn) => fn,
};

const originalLoad = Module._load;
let registerDoctorSecure;
try {
  Module._load = function(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) return mocks[request];
    return originalLoad.apply(this, arguments);
  };
  ({ registerDoctorSecure } = require('../src/controllers/doctorRegistration.controller'));
} finally {
  Module._load = originalLoad;
}

const base = {
  fullName: 'Clinical Doctor', mobile: '9876543210', qualification: 'MBBS',
  specialization: 'Orthopaedic', medicalRegNumber: 'MCI123', clinicName: 'Physio Care',
  city: 'Bhopal', preferredProgram: REGION_PROGRAM,
  revenueModel: 'split', requestedPatientFee: 999,
};
const invoke = async (role, body) => {
  let status = 200, payload;
  const res = {
    status(code) { status = code; return this; },
    json(value) { payload = value; return this; },
  };
  await registerDoctorSecure({ body, user: { _id: agentUser, role } }, res);
  return { status, payload };
};

test.beforeEach(() => { created = null; audit = null; });

test('Agent doctor registration always saves 50% even if client sends fixed or 80%', async () => {
  const { status, payload } = await invoke('agent', {
    ...base, requestedFeeShareType: 'fixed',
    requestedFixedFeeShareAmount: 700, requestedFeeSharePercentage: 80,
  });
  assert.equal(status, 201);
  assert.equal(created.feeSharePercentage, 50);
  assert.equal(created.requestedFeeSharePercentage, 50);
  assert.equal(created.feeShareType, 'percentage');
  assert.equal(created.requestedFeeShareType, 'percentage');
  assert.equal(created.requestedFixedFeeShareAmount, undefined);
  assert.equal(created.approvedPatientFee, 999);
  assert.equal(payload.feeSharePercentage, 50);
  assert.equal(audit.newValue.requestedFeeSharePercentage, 50);
});

test('new Agent registration does not require an editable percentage input', async () => {
  const result = await invoke('agent', base);
  assert.equal(result.status, 201);
  assert.equal(created.feeSharePercentage, 50);
  assert.equal(created.revenueModel, 'split');
});

test('Admin doctor registration also cannot create a custom split', async () => {
  const result = await invoke('admin', { ...base, requestedFeeSharePercentage: 90,
    requestedFeeShareType: 'percentage' });
  assert.equal(result.status, 201);
  assert.equal(created.feeSharePercentage, 50);
});

test('Platform Fee registration remains 100% PhysioQR with 0 doctor share', async () => {
  const result = await invoke('agent', { ...base, revenueModel: 'platform_fee', requestedFeeSharePercentage: 80 });
  assert.equal(result.status, 201);
  assert.equal(created.feeSharePercentage, 0);
  assert.equal(created.requestedFeeShareType, undefined);
});

test('Agent registration still validates patient pricing', async () => {
  const result = await invoke('agent', { ...base, requestedPatientFee: 0 });
  assert.equal(result.status, 400);
  assert.equal(created, null);
});
