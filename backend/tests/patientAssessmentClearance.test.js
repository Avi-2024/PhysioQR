const test = require('node:test');
const assert = require('node:assert/strict');
const { decidePatientAssessmentClearance, requiresClinicalProgrammeSelection } =
  require('../src/services/patientAssessmentClearance.service');

const flags = (count) => Array.from({ length: count }, (_, i) => ({
  question: String(i + 1), answer: 'yes', safetyMessage: 'Seek review',
}));

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

const routineFlags = (count) => flags(count).map((flag) => ({ ...flag, severity: 'routine' }));

test('0, 1 and 2 clinician-classified routine concerns clear without individual approval', () => {
  for (const n of [0, 1, 2]) {
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

test('3 routine concerns require review but no false critical count', () => {
  const result = decidePatientAssessmentClearance({
    redFlagDetails: routineFlags(3),
  });
  assert.equal(result.redFlagCount, 3);
  assert.equal(result.criticalFlagCount, 0);
  assert.equal(result.routineFlagCount, 3);
  assert.equal(result.reviewRequired, true);
  assert.equal(result.clinicalSelectionRequired, true);
  assert.equal(result.reviewType, 'red_flag');
});

test('even 1 critical red flag overrides routine threshold', () => {
  const result = decidePatientAssessmentClearance({
    redFlagDetails: [...routineFlags(1), ...flags(1)],
  });
  assert.equal(result.criticalFlagCount, 1);
  assert.equal(result.routineFlagCount, 1);
  assert.equal(result.status, 'pending_review');
});

test('invalid and missing severity must fail closed as critical', () => {
  for (const redFlagDetails of [[{ answer: 'yes' }], [{ answer: 'yes', severity: 'unknown' }]]) {
    const result = decidePatientAssessmentClearance({ redFlagDetails });
    assert.equal(result.criticalFlagCount, 1);
    assert.equal(result.reviewRequired, true);
  }
});

test('postoperative pathway still requires approval with 0–2 routine concerns', () => {
  const result = decidePatientAssessmentClearance({
    redFlagDetails: routineFlags(1), isPostOperative: true,
  });
  assert.equal(result.reviewRequired, true);
  assert.equal(result.reviewType, 'physio_review');
});

test('new auto-cleared routine assessments can use an automatically matched programme', () => {
  assert.equal(requiresClinicalProgrammeSelection({
    hasRedFlag: true, clinicalSelectionRequired: false, requiresPhysioReview: false,
  }), false);
  assert.equal(requiresClinicalProgrammeSelection({
    hasRedFlag: true, clinicalSelectionRequired: true,
  }), true);
  // Historical records missing the new field preserve their old safety rule.
  assert.equal(requiresClinicalProgrammeSelection({ hasRedFlag: true }), true);
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

test('only low-risk assessments may receive an automatically selected programme', () => {
  assert.equal(requiresClinicalProgrammeSelection({ hasRedFlag: false, requiresPhysioReview: false }), false);
  assert.equal(requiresClinicalProgrammeSelection({ hasRedFlag: true, requiresPhysioReview: false }), true);
  assert.equal(requiresClinicalProgrammeSelection({ hasRedFlag: false, requiresPhysioReview: true }), true);
  assert.equal(requiresClinicalProgrammeSelection({ hasRedFlag: true, requiresPhysioReview: true }), true);
  assert.equal(requiresClinicalProgrammeSelection(null), false);
});
