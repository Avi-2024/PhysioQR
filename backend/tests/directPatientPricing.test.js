const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

// No live MongoDB or patient records are used by these pricing tests.
let configuredAmount;
let configuredWebsiteAmount;
let settingsReads = 0;
const mockSettings = {
  findOne: (query) => {
    assert.deepEqual(query, { key: 'finance' });
    settingsReads += 1;
    return {
      lean: async () => configuredAmount === undefined
        ? null
        : { value: { directPatientDefaultFee: configuredAmount, websiteDirectRegistrationFee: configuredWebsiteAmount } },
    };
  },
};

const originalLoad = Module._load;
let resolveDirectPatientFee;
try {
  Module._load = function(request, parent, isMain) {
    if (request === '../models/AppSetting.model') return mockSettings;
    return originalLoad.apply(this, arguments);
  };
  ({ resolveDirectPatientFee } = require('../src/services/directPatientPricing.service'));
} finally {
  Module._load = originalLoad;
}

test.beforeEach(() => {
  configuredAmount = undefined;
  configuredWebsiteAmount = undefined;
  settingsReads = 0;
});

test('global fee is used for a direct patient without an override', async () => {
  configuredAmount = 1899;
  const price = await resolveDirectPatientFee({ referringDoctor: null });
  assert.deepEqual(price, { amount: 1899, source: 'admin_default' });
  assert.equal(settingsReads, 1);
});

test('individual admin patient fee overrides the global fee', async () => {
  configuredAmount = 1899;
  const price = await resolveDirectPatientFee({ directPatientFee: 1500 });
  assert.deepEqual(price, { amount: 1500, source: 'patient_override' });
  assert.equal(settingsReads, 0);
});

test('when the global fee is absent or disabled, direct checkout stays unpriced', async () => {
  let price = await resolveDirectPatientFee({});
  assert.deepEqual(price, { amount: 0, source: 'not_configured' });
  configuredAmount = 0;
  price = await resolveDirectPatientFee({});
  assert.deepEqual(price, { amount: 0, source: 'not_configured' });
});

test('invalid saved fees are never offered to patients', async () => {
  for (const value of [-100, 'not-a-number', 'Infinity']) {
    configuredAmount = value;
    const price = await resolveDirectPatientFee({});
    assert.deepEqual(price, { amount: 0, source: 'not_configured' });
  }
});

test('an existing positive patient override works even when the default is disabled', async () => {
  configuredAmount = 0;
  const price = await resolveDirectPatientFee({ directPatientFee: 2600 });
  assert.deepEqual(price, { amount: 2600, source: 'patient_override' });
  assert.equal(settingsReads, 0);
});

test('website-direct patient pays ₹300 even when the legacy Admin default is different', async () => {
  configuredAmount = 1899;
  const price = await resolveDirectPatientFee({ referralSource: 'direct', referringDoctor: null });
  assert.deepEqual(price, { amount: 300, source: 'website_direct_default' });
  assert.equal(settingsReads, 1);
});

test('Admin can change the separate website fee without modifying legacy default', async () => {
  configuredAmount = 1899;
  configuredWebsiteAmount = 750;
  const websitePrice = await resolveDirectPatientFee({ referralSource: 'direct', referringDoctor: null });
  assert.deepEqual(websitePrice, { amount: 750, source: 'website_direct_admin' });
  const legacyPrice = await resolveDirectPatientFee({ referralSource: 'legacy_direct', referringDoctor: null });
  assert.deepEqual(legacyPrice, { amount: 1899, source: 'admin_default' });
});

test('Admin per-patient override still takes priority over website fee', async () => {
  configuredAmount = 1899;
  configuredWebsiteAmount = 750;
  const price = await resolveDirectPatientFee({
    referralSource: 'direct', referringDoctor: null, directPatientFee: 1500,
  });
  assert.deepEqual(price, { amount: 1500, source: 'patient_override' });
  assert.equal(settingsReads, 0);
});

test('website direct registration defaults to ₹300 when separate setting is absent', async () => {
  configuredAmount = 0;
  let price = await resolveDirectPatientFee({ referralSource: 'direct', referringDoctor: null });
  assert.deepEqual(price, { amount: 300, source: 'website_direct_default' });
  configuredWebsiteAmount = 0;
  price = await resolveDirectPatientFee({ referralSource: 'direct', referringDoctor: null });
  assert.deepEqual(price, { amount: 300, source: 'website_direct_default' });
});

test('Doctor-linked patients are never classified as website-direct pricing', async () => {
  configuredAmount = 799;
  const patient = { referralSource: 'direct', referringDoctor: 'doctor-id' };
  const price = await resolveDirectPatientFee(patient);
  assert.deepEqual(price, { amount: 799, source: 'admin_default' });
  assert.equal(settingsReads, 1);
});
