const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveProgrammeAccessWindow, calculateProgrammeExpiry, hasReplayAccess } = require('../src/services/programmeAccessValidity.service');

test('25 exercise days and 90-day access are independent of one another', () => {
  const programme = { durationDays: 25, accessValidityDays: 90 };
  assert.equal(programme.durationDays, 25);
  assert.deepEqual(resolveProgrammeAccessWindow(programme), {
    validityDays: 90, gracePeriodDays: 0, explicit: true,
  });
  const activated = new Date('2026-11-04T00:00:00.000Z');
  const result = calculateProgrammeExpiry(programme, activated);
  assert.equal(result.expiryDate.toISOString(), '2027-02-02T00:00:00.000Z');
});

test('legacy programmes retain their duration plus existing grace window', () => {
  assert.deepEqual(resolveProgrammeAccessWindow({ durationDays: 25 }), {
    validityDays: 28, gracePeriodDays: 3, explicit: false,
  });
  assert.equal(calculateProgrammeExpiry({ durationDays: 25 }, new Date('2026-11-04T00:00:00Z')).validityDays, 28);
});

test('programme completion does not end a still-valid replay entitlement', () => {
  const expires = new Date('2027-02-02T00:00:00.000Z');
  const active = { status: 'active', expiryDate: expires };
  const completed = { status: 'completed', expiryDate: expires };
  assert.equal(hasReplayAccess(active, Date.parse('2026-11-25T00:00:00Z')), true);
  assert.equal(hasReplayAccess(completed, Date.parse('2026-12-01T00:00:00Z')), true);
  assert.equal(hasReplayAccess(completed, expires.getTime()), false);
  assert.equal(hasReplayAccess(active, expires.getTime() + 1000), false);
  assert.equal(hasReplayAccess({ status: 'cancelled', expiryDate: expires }, Date.parse('2026-11-25T00:00:00Z')), false);
  assert.equal(hasReplayAccess({ status: 'paused', expiryDate: expires }, Date.parse('2026-11-25T00:00:00Z')), false);
});

test('completed legacy programmes with no expiry remain readable until explicitly cancelled', () => {
  assert.equal(hasReplayAccess({status:'completed'}),true);
  assert.equal(hasReplayAccess({status:'inactive'}),false);
});
