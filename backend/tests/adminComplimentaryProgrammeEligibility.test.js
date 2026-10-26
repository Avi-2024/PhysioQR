const test = require('node:test');
const assert = require('node:assert/strict');
const { assessProgrammeEligibility } = require('../src/services/adminComplimentaryProgramme.service');

const REGION = '507f1f77bcf86cd799439010';
const OTHER_REGION = '507f1f77bcf86cd799439011';
const PROGRAMME = '507f1f77bcf86cd799439012';
const BASE = { _id: PROGRAMME, painCategory: REGION, isActive: true, clinicalApprovalRequired: false };
const CLEAR = { _id: '507f1f77bcf86cd799439013', painCategory: REGION, status: 'cleared', clinicalSelectionRequired: false, createdAt: '2026-10-22T12:00:00Z' };
const check = (programme = BASE, assessments = [CLEAR], enrolledProgrammeIds = []) =>
  assessProgrammeEligibility({ programme, assessments, enrolledProgrammeIds });

test('a cleared matching-region assessment can authorize an additional active programme', () => {
  assert.deepEqual(check(), { eligible: true, assessmentId: CLEAR._id });
});

test('an unrelated neck assessment cannot grant access to a new knee programme', () => {
  assert.match(check(BASE, [{ ...CLEAR, painCategory: OTHER_REGION }]).reason, /assessment is required/);
});

test('the latest body-region assessment must be cleared, even if an older one is cleared', () => {
  const pending = { ...CLEAR, status: 'pending_review', createdAt: '2026-10-25T12:00:00Z' };
  assert.equal(check(BASE, [CLEAR, pending]).eligible, false);
  assert.equal(check(BASE, [pending, CLEAR]).eligible, false);
});

test('clinical selection and red flag review demand an explicit programme approval', () => {
  const review = { ...CLEAR, clinicalSelectionRequired: true, hasRedFlag: true };
  assert.equal(check(BASE, [review]).eligible, false);
  assert.equal(check(BASE, [{ ...review, approvedPrograms: [PROGRAMME] }]).eligible, true);
});

test('rejects unpublished, unsigned and already-enrolled programmes', () => {
  assert.equal(check({ ...BASE, isActive: false }).eligible, false);
  assert.equal(check({ ...BASE, clinicalApprovalRequired: true }).eligible, false);
  assert.equal(check(BASE, [CLEAR], [PROGRAMME]).eligible, false);
});
