const test = require('node:test');
const assert = require('node:assert/strict');
const { NON_DOWNGRADABLE_SAFETY_KEYS, effectiveRedFlagSeverity, isNonDowngradableSafetyQuestion } =
  require('../src/services/assessmentFlagSeverity.service');
const { decidePatientAssessmentClearance } = require('../src/services/patientAssessmentClearance.service');

test('serious seed red flags retain critical severity classification but auto-clear under universal auto-approval', () => {
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
    // Universal auto-approval: patient is cleared immediately
    assert.equal(clearance.autoCleared, true, seedKey);
    assert.equal(clearance.status, 'cleared', seedKey);
    assert.equal(clearance.reviewRequired, false, seedKey);
  }
});

test('new routine warning classifies severity correctly and auto-clears', () => {
  const unreviewed = { questionText: 'Routine observation', redFlagSeverity: 'routine' };
  assert.equal(effectiveRedFlagSeverity(unreviewed), 'critical');
  const reviewed = { ...unreviewed, redFlagClassification: { clinicianName: 'Review Clinician' } };
  assert.equal(effectiveRedFlagSeverity(reviewed), 'routine');
  assert.equal(decidePatientAssessmentClearance({
    redFlagDetails: Array.from({ length: 2 }, () => ({ severity: effectiveRedFlagSeverity(reviewed) })),
  }).status, 'cleared');
  // Universal auto-approval: 3+ routine warnings also clear immediately
  assert.equal(decidePatientAssessmentClearance({
    redFlagDetails: Array.from({ length: 3 }, () => ({ severity: effectiveRedFlagSeverity(reviewed) })),
  }).status, 'cleared');
});

test('invalid, absent and unknown severity fail closed to critical severity tag', () => {
  assert.equal(effectiveRedFlagSeverity(null), 'critical');
  assert.equal(effectiveRedFlagSeverity({ redFlagSeverity: 'routine', redFlagClassification: { clinicianName: ' ' } }), 'critical');
  assert.equal(effectiveRedFlagSeverity({ redFlagSeverity: 'unexpected' }), 'critical');
});
