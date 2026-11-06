const test = require('node:test');
const assert = require('node:assert/strict');
const { decidePatientAssessmentClearance, requiresClinicalProgrammeSelection } =
  require('../src/services/patientAssessmentClearance.service');

const flags = (count) => Array.from({ length: count }, (_, i) => ({
  question: String(i + 1), answer: 'yes', safetyMessage: 'Seek review',
}));

const routineFlags = (count) => flags(count).map((flag) => ({ ...flag, severity: 'routine' }));

test('normal non-operative assessment with zero red flags clears instantly', () => {
  const result = decidePatientAssessmentClearance({
    redFlagDetails: flags(0), requiresPhysioReview: false, isPostOperative: false,
  });
  assert.deepEqual(result, {
    redFlagCount: 0, criticalFlagCount: 0, routineFlagCount: 0,
    hasRedFlag: false, requiresPhysioReview: false, clinicalSelectionRequired: false,
    reviewRequired: false, autoCleared: true, status: 'cleared', reviewType: undefined,
  });
});

test('red flags are auto-cleared under universal auto-approval', () => {
  for (const n of [1, 2, 3]) {
    const result = decidePatientAssessmentClearance({
      redFlagDetails: flags(n), requiresPhysioReview: false, isPostOperative: false,
    });
    assert.equal(result.redFlagCount, n);
    assert.equal(result.hasRedFlag, true);
    assert.equal(result.reviewRequired, false);
    assert.equal(result.autoCleared, true);
    assert.equal(result.status, 'cleared');
    assert.equal(result.clinicalSelectionRequired, false);
  }
});

test('0, 1, 2 and 3+ routine concerns clear automatically without individual approval', () => {
  for (const n of [0, 1, 2, 3, 5]) {
    const result = decidePatientAssessmentClearance({
      redFlagDetails: routineFlags(n), isPostOperative: false,
    });
    assert.equal(result.redFlagCount, n);
    assert.equal(result.routineFlagCount, n);
    assert.equal(result.criticalFlagCount, 0);
    assert.equal(result.reviewRequired, false);
    assert.equal(result.clinicalSelectionRequired, false);
    assert.equal(result.status, 'cleared');
    assert.equal(result.autoCleared, true);
  }
});

test('critical red flags are auto-cleared without holding assessment in pending_review', () => {
  const result = decidePatientAssessmentClearance({
    redFlagDetails: [...routineFlags(1), ...flags(1)],
  });
  assert.equal(result.criticalFlagCount, 1);
  assert.equal(result.routineFlagCount, 1);
  assert.equal(result.hasRedFlag, true);
  assert.equal(result.status, 'cleared');
  assert.equal(result.autoCleared, true);
  assert.equal(result.reviewRequired, false);
});

test('postoperative pathway auto-clears under universal auto-approval', () => {
  const result = decidePatientAssessmentClearance({
    redFlagDetails: routineFlags(1), isPostOperative: true,
  });
  assert.equal(result.reviewRequired, false);
  assert.equal(result.autoCleared, true);
  assert.equal(result.status, 'cleared');
  assert.equal(result.clinicalSelectionRequired, false);
});

test('post-operative cases auto-clear even without red flags', () => {
  const result = decidePatientAssessmentClearance({
    redFlagDetails: [], requiresPhysioReview: false, isPostOperative: true,
  });
  assert.equal(result.reviewRequired, false);
  assert.equal(result.autoCleared, true);
  assert.equal(result.status, 'cleared');
  assert.equal(result.clinicalSelectionRequired, false);
});

test('explicit clinical review pathway auto-clears with zero red flags', () => {
  const result = decidePatientAssessmentClearance({
    redFlagDetails: [], requiresPhysioReview: true, isPostOperative: false,
  });
  assert.equal(result.reviewRequired, false);
  assert.equal(result.autoCleared, true);
  assert.equal(result.status, 'cleared');
  assert.equal(result.clinicalSelectionRequired, false);
});

test('requiresClinicalProgrammeSelection allows auto-cleared assessments to proceed', () => {
  // Auto-cleared assessment with clinicalSelectionRequired: false can proceed to auto programme mapping
  assert.equal(requiresClinicalProgrammeSelection({
    hasRedFlag: true, clinicalSelectionRequired: false, requiresPhysioReview: false,
  }), false);

  // Explicitly review-required record still enforces clinical programme selection if set to true
  assert.equal(requiresClinicalProgrammeSelection({
    hasRedFlag: true, clinicalSelectionRequired: true,
  }), true);

  // Standard auto-cleared assessment without clinicalSelectionRequired allows automatic programme assignment
  assert.equal(requiresClinicalProgrammeSelection({ hasRedFlag: true }), false);
  assert.equal(requiresClinicalProgrammeSelection({ hasRedFlag: false, requiresPhysioReview: false }), false);
  assert.equal(requiresClinicalProgrammeSelection(null), false);
});

test('missing or invalid redFlagDetails never invent red flags and clear safely', () => {
  const result = decidePatientAssessmentClearance({});
  assert.equal(result.status, 'cleared');
  assert.equal(result.autoCleared, true);
  const invalid = decidePatientAssessmentClearance({ redFlagDetails: null });
  assert.equal(invalid.redFlagCount, 0);
  assert.equal(invalid.status, 'cleared');
  assert.equal(invalid.autoCleared, true);
});
