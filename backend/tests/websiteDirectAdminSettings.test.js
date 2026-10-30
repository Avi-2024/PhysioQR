const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

// Finance settings tests without MongoDB or real patient payments.
let stored, changes, audit;
const AppSetting = {
  find: () => ({
    populate: () => ({
      lean: async () => stored ? [{ key: 'finance', value: stored, updatedAt: new Date() }] : [],
    }),
  }),
  findOne: () => ({ lean: async () => stored ? { _id: 'setting1', value: stored } : null }),
  findOneAndUpdate: (_filter, update) => {
    changes = update.$set.value;
    stored = changes;
    return { populate: async () => ({
      _id: 'setting1', value: stored, updatedAt: new Date(), updatedBy: null,
    }) };
  },
};
const mocks = {
  '../../models/AppSetting.model': AppSetting,
  '../../utils/asyncHandler': (fn) => fn,
  '../../utils/auditLogger': { writeAuditLog: async (event) => { audit = event; } },
  '../../middlewares/platformSettings.middleware': { invalidatePlatformSettingsCache: () => {} },
  '../../middlewares/financeFeatures.middleware': { invalidateFinanceSettingsCache: () => {} },
};
let getSettings, updateSettingsSection;
const originalLoad = Module._load;
try {
  Module._load = function (request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) return mocks[request];
    return originalLoad.apply(this, arguments);
  };
  ({ getSettings, updateSettingsSection } = require('../src/controllers/admin/settings.controller'));
} finally {
  Module._load = originalLoad;
}
const request = (body = {}) => {
  let status = 200;
  let payload;
  const req = { params: { section: 'finance' }, body, user: { _id: '507f1f77bcf86cd799439016' } };
  const res = {
    status: (code) => { status = code; return res; },
    json: (obj) => { payload = obj; return res; },
  };
  return { req, res, outcome: () => ({ status, payload }) };
};

test.beforeEach(() => { stored = undefined; changes = null; audit = null; });

test('website-direct Admin setting defaults to ₹300 independently of legacy price', async () => {
  stored = { currency: 'INR', directPatientDefaultFee: 1800 };
  const { req, res, outcome } = request();
  await getSettings(req, res);
  assert.equal(outcome().status, 200);
  assert.equal(outcome().payload.settings.finance.websiteDirectRegistrationFee, 300);
  assert.equal(outcome().payload.settings.finance.directPatientDefaultFee, 1800);
});

test('Admin can edit website-direct fee without changing old direct price', async () => {
  stored = { currency: 'INR', directPatientDefaultFee: 1800, websiteDirectRegistrationFee: 300 };
  const { req, res, outcome } = request({ websiteDirectRegistrationFee: 750, reason: 'New website price' });
  await updateSettingsSection(req, res);
  assert.equal(outcome().status, 200);
  assert.equal(stored.websiteDirectRegistrationFee, 750);
  assert.equal(stored.directPatientDefaultFee, 1800);
  assert.equal(audit.action, 'app_settings_updated');
  assert.equal(audit.metadata.section, 'finance');
});

test('Admin cannot set zero or invalid website direct fee', async () => {
  stored = { currency: 'INR', directPatientDefaultFee: 0, websiteDirectRegistrationFee: 300 };
  for (const amount of [0, -5, 1000001, 300.001]) {
    const { req, res, outcome } = request({ websiteDirectRegistrationFee: amount });
    await updateSettingsSection(req, res);
    assert.equal(outcome().status, 400);
    assert.equal(changes, null);
  }
});

test('Existing legacy direct-patient default remains editable independently', async () => {
  stored = { currency: 'INR', directPatientDefaultFee: 0, websiteDirectRegistrationFee: 300 };
  const { req, res, outcome } = request({ directPatientDefaultFee: 950 });
  await updateSettingsSection(req, res);
  assert.equal(outcome().status, 200);
  assert.equal(stored.directPatientDefaultFee, 950);
  assert.equal(stored.websiteDirectRegistrationFee, 300);
});
