const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateFeeShare } = require('../src/utils/feeCalculator');
const { SPLIT_DOCTOR_PERCENTAGE, assertSplitTerms, normalizeRevenueConfiguration } = require('../src/utils/splitModel');
const Doctor = require('../src/models/Doctor.model');

test('Split Model contract is fixed at 50% for doctor', () => {
  assert.equal(SPLIT_DOCTOR_PERCENTAGE, 50);
  assert.doesNotThrow(() => assertSplitTerms({ requestedFeeShareType: 'percentage', requestedFeeSharePercentage: 50 }));
  assert.doesNotThrow(() => assertSplitTerms({ feeShareType: 'percentage', feeSharePercentage: 50, feeShareCalculationBasis: 'gross' }));
  for (const terms of [
    { feeSharePercentage: 65 },
    { requestedFeeSharePercentage: '49' },
    { feeShareType: 'fixed' },
    { requestedFeeShareType: 'fixed' },
    { fixedFeeShareAmount: 300 },
    { requestedFixedFeeShareAmount: 300 },
    { feeShareCalculationBasis: 'after_discount' },
    { feeShareSlabs: [{ minPatients: 1, percentage: 80 }] },
  ]) assert.throws(() => assertSplitTerms(terms), { status: 400 });
});

test('new split registrations are normalized even when commission fields are omitted', () => {
  const doc = normalizeRevenueConfiguration({ revenueModel: 'split' });
  assert.equal(doc.requestedFeeShareType, 'percentage');
  assert.equal(doc.requestedFeeSharePercentage, 50);
  assert.equal(doc.feeShareType, 'percentage');
  assert.equal(doc.feeSharePercentage, 50);
  assert.equal(doc.feeShareCalculationBasis, 'gross');
  assert.deepEqual(doc.feeShareSlabs, []);
  assert.equal(doc.fixedFeeShareAmount, undefined);
});

test('saving a legacy split doctor overwrites variable fee-share terms', async () => {
  const doctor = new Doctor({
    fullName: 'Clinical Test Doctor',
    mobile: '9999999999',
    revenueModel: 'split',
    feeShareType: 'slab',
    feeSharePercentage: 80,
    requestedFeeSharePercentage: 80,
    fixedFeeShareAmount: 200,
    feeShareCalculationBasis: 'net_after_charges',
    feeShareSlabs: [{ minPatients: 1, maxPatients: 10, percentage: 80 }],
  });
  await doctor.validate();
  assert.equal(doctor.feeShareType, 'percentage');
  assert.equal(doctor.feeSharePercentage, 50);
  assert.equal(doctor.requestedFeeSharePercentage, 50);
  assert.equal(doctor.feeShareCalculationBasis, 'gross');
  assert.equal(doctor.feeShareSlabs.length, 0);
});

test('new Split Model payment is exactly 50:50 for an even number of paise', () => {
  assert.deepEqual(calculateFeeShare({ paidAmount: 2000, revenueModel: 'split' }), {
    doctorShare: 1000, platformShare: 1000, eligibleAmount: 2000,
  });
});

test('legacy percentage, fixed and slab snapshots cannot override 50:50', () => {
  for (const override of [
    { feeShareType: 'percentage', percentage: 90 },
    { feeShareType: 'fixed', fixedAmount: 1900 },
    { feeShareType: 'slab', slabs: [{ minPatients: 1, maxPatients: null, percentage: 80 }] },
    { basis: 'net_after_charges', gatewayCharges: 100 },
    { basis: 'after_discount', discountAmount: 150 },
  ]) {
    const result = calculateFeeShare({ paidAmount: 2000, revenueModel: 'split', ...override });
    assert.equal(result.doctorShare, 1000);
    assert.equal(result.platformShare, 1000);
  }
});

test('amount with an odd paise keeps exact total and limits rounding difference to one paise', () => {
  const result = calculateFeeShare({ paidAmount: 99.99, revenueModel: 'split' });
  assert.equal(result.doctorShare, 50);
  assert.equal(result.platformShare, 49.99);
  assert.equal(Math.round((result.doctorShare + result.platformShare) * 100), 9999);
});

test('Platform Fee model still assigns no doctor share', () => {
  const result = calculateFeeShare({ paidAmount: 2000, revenueModel: 'platform_fee', percentage: 50 });
  assert.deepEqual(result, { doctorShare: 0, platformShare: 2000, eligibleAmount: 2000 });
  const doc = normalizeRevenueConfiguration({ revenueModel: 'platform_fee', feeSharePercentage: 50 });
  assert.equal(doc.feeSharePercentage, 0);
});
