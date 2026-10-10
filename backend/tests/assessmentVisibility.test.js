const test = require('node:test');
const assert = require('node:assert/strict');
const { getRegionVisibility, isRegionVisibleForCase, isSurgeryVisible } =
  require('../src/services/assessmentVisibility.service');

const general = { requiresSurgeryDetails: false, isActive: true };
const postOperative = { requiresSurgeryDetails: true, isActive: true };
const region = (name) => ({ name, isActive: true });

test('phase 1 displays exactly four seeded general body regions', () => {
  const seeded = [
    'Neck', 'Shoulder', 'Elbow', 'Wrist/Hand', 'Upper Back', 'Lower Back',
    'Spine', 'Hip', 'Thigh', 'Knee', 'Lower Leg', 'Ankle/Foot', 'Other',
  ];
  assert.deepEqual(
    seeded.filter((name) => isRegionVisibleForCase(region(name), general)),
    ['Neck', 'Shoulder', 'Spine', 'Knee'],
  );
});

test('phase 1 shows only knee and shoulder for post-op', () => {
  const seeded = ['Neck', 'Shoulder', 'Spine', 'Hip', 'Knee', 'Ankle/Foot'];
  assert.deepEqual(
    seeded.filter((name) => isRegionVisibleForCase(region(name), postOperative)),
    ['Shoulder', 'Knee'],
  );
});

test('legacy region spellings remain understandable', () => {
  assert.equal(getRegionVisibility(region('neck Pain')).general, true);
  assert.equal(getRegionVisibility(region('Back Pain (Spine)')).general, true);
  assert.equal(getRegionVisibility(region('Knee Joint')).postOperative, true);
});

test('only replacement surgeries initially published, not other procedures', () => {
  const surgeries = [
    { code: 'total_knee_replacement', isActive: true },
    { code: 'acl_reconstruction', isActive: true },
    { code: 'rotator_cuff_repair', isActive: true },
    { code: 'shoulder_replacement', isActive: true },
    { code: 'total_hip_replacement', isActive: true },
  ];
  assert.deepEqual(surgeries.filter(isSurgeryVisible).map((item) => item.code), [
    'total_knee_replacement', 'shoulder_replacement',
  ]);
});

test('admin switches override phase 1 defaults independently', () => {
  const spine = { ...region('Spine'), assessmentVisibility: { general: false, postOperative: true } };
  assert.equal(isRegionVisibleForCase(spine, general), false);
  assert.equal(isRegionVisibleForCase(spine, postOperative), true);
  const hip = { ...region('Hip'), assessmentVisibility: { general: true, postOperative: false } };
  assert.equal(isRegionVisibleForCase(hip, general), true);
  assert.equal(isRegionVisibleForCase(hip, postOperative), false);
});

test('inactive records are not available even if toggles say published', () => {
  assert.equal(isRegionVisibleForCase({ ...region('Knee'), isActive: false }, general), false);
  assert.equal(isRegionVisibleForCase(region('Knee'), { ...postOperative, isActive: false }), false);
  assert.equal(isSurgeryVisible({ code: 'total_knee_replacement', isActive: false }), false);
});

test('admin can publish new surgeries and hide default surgeries', () => {
  assert.equal(isSurgeryVisible({ code: 'acl_reconstruction', isActive: true, assessmentPublished: true }), true);
  assert.equal(isSurgeryVisible({ code: 'total_knee_replacement', isActive: true, assessmentPublished: false }), false);
});
