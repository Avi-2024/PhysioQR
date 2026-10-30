const test = require('node:test');
const assert = require('node:assert/strict');
const { PATIENT_REGISTRATION_FEE_INR, isCurrentRegistrationOrder } = require('../src/config/patientRegistrationFee');
const { resolveDirectPatientFee } = require('../src/services/directPatientPricing.service');

test('public patient registration is exactly INR 300', () => {
  assert.equal(PATIENT_REGISTRATION_FEE_INR, 300);
});

test('direct patient price is fixed even when legacy admin settings or patient overrides exist', async () => {
  for (const directPatientFee of [undefined, 0, 1500, 1899, -3]) {
    const price = await resolveDirectPatientFee({ directPatientFee });
    assert.deepEqual(price, { amount: 300, source: 'fixed_registration_fee' });
  }
});

test('only a zero-discount INR 300 gateway order can be reused in new checkout', () => {
  assert.equal(isCurrentRegistrationOrder({ currency: 'INR', originalAmount: 300, finalAmount: 300, discountAmount: 0 }), true);
  assert.equal(isCurrentRegistrationOrder({ currency: 'INR', originalAmount: 1899, finalAmount: 1899 }), false);
  assert.equal(isCurrentRegistrationOrder({ currency: 'INR', originalAmount: 300, finalAmount: 200, discountAmount: 100 }), false);
  assert.equal(isCurrentRegistrationOrder({ currency: 'INR', originalAmount: 300, finalAmount: 300, discountAmount: 1 }), false);
  assert.equal(isCurrentRegistrationOrder({ currency: 'USD', originalAmount: 300, finalAmount: 300 }), false);
});
