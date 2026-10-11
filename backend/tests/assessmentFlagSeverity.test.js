const test = require('node:test');
const assert = require('node:assert/strict');
const { NON_DOWNGRADABLE_SAFETY_KEYS, effectiveRedFlagSeverity, isNonDowngradableSafetyQuestion } =
  require('../src/services/assessmentFlagSeverity.service');
const { decidePatientAssessmentClearance } = require('../src/services/patientAssessmentClearance.service');

test('serious seed red flags never become routine even with a claimed clinician classification', () => {
  for (const seedKey of NON_DOWNGRADABLE_SAFETY_KEYS) {
    const question = {
      seedKey, redFlagSeverity: 'routine',
      redFlagClassification: { clinicianName: 'Signed Clinician', justification: 'Example only' },
    };
    assert.equal(isNonDowngradableSafetyQuestion(question), true);
    assert.equal(effectiveRedFlagSeverity(question), 'critical');
    const clearance = decidePatientAssessmentClearance({
      redFlagDetails: [{ severity: effectiveRedFlagSeverity(question) }],
    });
    assert.equal(clearance.reviewRequired, true, seedKey);
  }
});

test('new routine warning requires a documented clinician before count-based fast-track', () => {
  const unreviewed = { questionText: 'Routine observation', redFlagSeverity: 'routine' };
  assert.equal(effectiveRedFlagSeverity(unreviewed), 'critical');
  const reviewed = { ...unreviewed, redFlagClassification: { clinicianName: 'Review Clinician' } };
  assert.equal(effectiveRedFlagSeverity(reviewed), 'routine');
  assert.equal(decidePatientAssessmentClearance({
    redFlagDetails: Array.from({ length: 2 }, () => ({ severity: effectiveRedFlagSeverity(reviewed) })),
  }).status, 'cleared');
  assert.equal(decidePatientAssessmentClearance({
    redFlagDetails: Array.from({ length: 3 }, () => ({ severity: effectiveRedFlagSeverity(reviewed) })),
  }).status, 'pending_review');
});

test('invalid, absent and unknown severity fail closed', () => {
  assert.equal(effectiveRedFlagSeverity(null), 'critical');
  assert.equal(effectiveRedFlagSeverity({ redFlagSeverity: 'routine', redFlagClassification: { clinicianName: ' ' } }), 'critical');
  assert.equal(effectiveRedFlagSeverity({ redFlagSeverity: 'unexpected' }), 'critical');
});
