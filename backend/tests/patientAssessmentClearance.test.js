const test = require('node:test');
const assert = require('node:assert/strict');
const { decidePatientAssessmentClearance } = require('../src/services/patientAssessmentClearance.service');

const flags = (count) => Array.from({ length: count }, (_, i) => ({
  question: String(i + 1), answer: 'yes', safetyMessage: 'Seek review',
}));

test('normal non-operative assessment with zero red flags clears instantly', () => {
  const result = decidePatientAssessmentClearance({
    redFlagDetails: flags(0), requiresPhysioReview: false, isPostOperative: false,
  });
  assert.deepEqual(result, {
    redFlagCount: 0, hasRedFlag: false, requiresPhysioReview: false,
    reviewRequired: false, autoCleared: true, status: 'cleared', reviewType: undefined,
  });
});

test('one red flag, not three, requires clinical safety review', () => {
  for (const n of [1, 2, 3]) {
    const result = decidePatientAssessmentClearance({
      redFlagDetails: flags(n), requiresPhysioReview: false, isPostOperative: false,
    });
    assert.equal(result.redFlagCount, n);
    assert.equal(result.hasRedFlag, true);
    assert.equal(result.reviewRequired, true);
    assert.equal(result.autoCleared, false);
    assert.equal(result.status, 'pending_review');
    assert.equal(result.reviewType, 'red_flag');
  }
});

test('post-operative cases always require review even without red flags', () => {
  const result = decidePatientAssessmentClearance({
    redFlagDetails: [], requiresPhysioReview: false, isPostOperative: true,
  });
  assert.equal(result.requiresPhysioReview, true);
  assert.equal(result.reviewRequired, true);
  assert.equal(result.status, 'pending_review');
  assert.equal(result.reviewType, 'physio_review');
});

test('explicit clinical review pathway stays review-gated with zero red flags', () => {
  const result = decidePatientAssessmentClearance({
    redFlagDetails: [], requiresPhysioReview: true, isPostOperative: false,
  });
  assert.equal(result.reviewRequired, true);
  assert.equal(result.reviewType, 'physio_review');
});

test('red flags take priority over post-operative review classification', () => {
  const result = decidePatientAssessmentClearance({
    redFlagDetails: flags(1), requiresPhysioReview: true, isPostOperative: true,
  });
  assert.equal(result.reviewType, 'red_flag');
});

test('missing or invalid redFlagDetails never invent red flags', () => {
  const result = decidePatientAssessmentClearance({});
  assert.equal(result.status, 'cleared');
  const invalid = decidePatientAssessmentClearance({ redFlagDetails: null });
  assert.equal(invalid.redFlagCount, 0);
});
