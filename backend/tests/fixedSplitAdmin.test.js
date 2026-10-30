const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const ID = '507f1f77bcf86cd799439012';
let doctor, audit;
const makeDoctor = () => ({
  _id: ID, revenueModel: 'split', feeShareType: 'slab',
  feeSharePercentage: 87, feeShareSlabs: [{ minPatients: 1, maxPatients: null, percentage: 87 }],
  fixedFeeShareAmount: 400, approvedPatientFee: 999,
  feeShareCalculationBasis: 'net_after_charges', status: 'submitted',
  save: async () => {},
});
const mocks = {
  mongoose: { isValidObjectId: (value) => value === ID },
  '../../models/Doctor.model': {
    findById: async () => doctor,
    find: () => ({
      select: () => ({
        sort: () => ({
          skip: () => ({
            limit: () => ({ lean: async () => [{ ...makeDoctor(), feeSharePercentage: 87 }] }),
          }),
        }),
      }),
    }),
    countDocuments: async () => 1,
  },
  '../../models/FeeShare.model': { FeeShare: {} },
  '../../models/Refund.model': {},
  '../../services/doctorApproval.service': { provisionApprovedDoctor: async () => ({ temporaryPassword: undefined }) },
  '../../utils/auditLogger': { writeAuditLog: async (event) => { audit = event; } },
  '../../utils/queryHelpers': {
    buildSearchFilter: () => ({}),
    getPagination: () => ({ page: 1, limit: 20, skip: 0 }),
  },
  '../../utils/asyncHandler': (fn) => fn,
};
const originalLoad = Module._load;
let approveDoctor, updateRevenueModel, getRevenueModels;
try {
  Module._load = function(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) return mocks[request];
    return originalLoad.apply(this, arguments);
  };
  ({ approveDoctor } = require('../src/controllers/admin/doctor-approval.controller'));
  ({ updateRevenueModel, getRevenueModels } = require('../src/controllers/admin/revenue.controller'));
} finally {
  Module._load = originalLoad;
}
const request = (body = {}) => ({
  body, params: { id: ID, doctorId: ID }, query: {},
  user: { role: 'admin', _id: '507f1f77bcf86cd799439011' },
});
const invoke = async (handler, req = request()) => {
  let status = 200, payload;
  const res = {
    status(code) { status = code; return this; },
    json(value) { payload = value; return this; },
  };
  await handler(req, res);
  return { status, payload };
};
test.beforeEach(() => { doctor = makeDoctor(); audit = null; });

test('admin revenue-model changes cannot restore legacy percentage/slab or alternate basis', async () => {
  const result = await invoke(updateRevenueModel, request({
    revenueModel: 'split', feeSharePercentage: 99,
    feeShareType: 'slab', fixedFeeShareAmount: 800,
    feeShareCalculationBasis: 'net_after_charges',
  }));
  assert.equal(result.status, 200);
  assert.equal(doctor.feeSharePercentage, 50);
  assert.equal(doctor.feeShareType, 'percentage');
  assert.deepEqual(doctor.feeShareSlabs, []);
  assert.equal(doctor.feeShareCalculationBasis, 'gross');
  assert.equal(doctor.fixedFeeShareAmount, undefined);
  assert.equal(audit.newValue.feeSharePercentage, 50, 'audit must record the actual 50% value');
});

test('admin approval cannot override fixed 50:50 with a fixed commission', async () => {
  const result = await invoke(approveDoctor, request({
    revenueModel: 'split', feeSharePercentage: 77,
    feeShareType: 'fixed', fixedFeeShareAmount: 500,
  }));
  assert.equal(result.status, 200);
  assert.equal(result.payload.doctor.feeSharePercentage, 50);
  assert.equal(result.payload.doctor.feeShareType, 'percentage');
  assert.equal(result.payload.doctor.fixedFeeShareAmount, undefined);
});

test('admin switch to Platform Fee produces zero doctor commission', async () => {
  const result = await invoke(updateRevenueModel, request({ revenueModel: 'platform_fee' }));
  assert.equal(result.status, 200);
  assert.equal(doctor.feeSharePercentage, 0);
  assert.equal(doctor.fixedFeeShareAmount, undefined);
});

test('Admin Finance report displays effective 50%, not stale legacy database settings', async () => {
  const result = await invoke(getRevenueModels);
  assert.equal(result.status, 200);
  assert.equal(result.payload.items[0].feeSharePercentage, 50);
  assert.equal(result.payload.items[0].feeShareType, 'percentage');
  assert.equal(result.payload.items[0].feeShareCalculationBasis, 'gross');
});
