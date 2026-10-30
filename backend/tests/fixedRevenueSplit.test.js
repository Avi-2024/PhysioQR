const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateFeeShare } = require('../src/utils/feeCalculator');
const { applyFixedSplitConfiguration, splitPaidAmount } = require('../src/utils/splitPolicy');

test('Split Model allocates exactly 50:50 of verified paid amount', () => {
  const result = calculateFeeShare({ paidAmount: 1000, revenueModel: 'split', percentage: 80 });
  assert.equal(result.doctorShare, 500);
  assert.equal(result.platformShare, 500);
  assert.equal(result.eligibleAmount, 1000);
  assert.equal(result.appliedPercentage, 50);
});

test('historical fixed, slab, and alternate fee-basis snapshot cannot change new split payments', () => {
  for (const feeShareType of ['fixed', 'slab', 'percentage']) {
    const result = calculateFeeShare({
      paidAmount: 900, discountAmount: 100, gatewayCharges: 35,
      revenueModel: 'split', feeShareType, percentage: 90,
      fixedAmount: 800, slabs: [{ minPatients: 0, maxPatients: null, percentage: 75 }],
      totalPaidPatients: 200, basis: 'net_after_charges',
    });
    assert.equal(result.doctorShare, 450);
    assert.equal(result.platformShare, 450);
    assert.equal(result.eligibleAmount, 900);
  }
});

test('odd paise are rounded exactly and both shares sum to paid amount', () => {
  const cases = [[100.01, 50.01, 50], [100.03, 50.02, 50.01], [0.01, 0.01, 0], [999.99, 500, 499.99], [123.46, 61.73, 61.73]];
  for (const [amount, doctor, platform] of cases) {
    const result = splitPaidAmount(amount);
    assert.equal(result.doctorShare, doctor, `doctor share for ${amount}`);
    assert.equal(result.platformShare, platform, `platform share for ${amount}`);
    assert.equal(Math.round((result.doctorShare + result.platformShare) * 100), Math.round(amount * 100));
  }
  assert.throws(() => splitPaidAmount(-1), RangeError);
  assert.throws(() => splitPaidAmount(Infinity), RangeError);
});

test('Platform Fee remains 100% PhysioQR and 0% doctor', () => {
  const result = calculateFeeShare({ paidAmount: 999, revenueModel: 'platform_fee', percentage: 70, fixedAmount: 200 });
  assert.equal(result.doctorShare, 0);
  assert.equal(result.platformShare, 999);
});

test('registration and admin config normalize custom fields; platform fee stays zero', () => {
  const split = applyFixedSplitConfiguration({
    revenueModel: 'split', feeShareType: 'slab', feeSharePercentage: 95,
    requestedFeeShareType: 'fixed', requestedFixedFeeShareAmount: 600, fixedFeeShareAmount: 300,
    feeShareSlabs: [{ percentage: 80 }], feeShareCalculationBasis: 'net_after_charges',
  });
  assert.equal(split.feeShareType, 'percentage');
  assert.equal(split.feeSharePercentage, 50);
  assert.equal(split.requestedFeeSharePercentage, 50);
  assert.equal(split.requestedFeeShareType, 'percentage');
  assert.equal(split.requestedFixedFeeShareAmount, undefined);
  assert.equal(split.fixedFeeShareAmount, undefined);
  assert.deepEqual(split.feeShareSlabs, []);
  assert.equal(split.feeShareCalculationBasis, 'gross');

  const platform = applyFixedSplitConfiguration({ revenueModel: 'platform_fee', feeSharePercentage: 50, fixedFeeShareAmount: 400 });
  assert.equal(platform.feeSharePercentage, 0);
  assert.equal(platform.fixedFeeShareAmount, undefined);
});
