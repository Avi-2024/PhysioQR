const test = require('node:test');
const assert = require('node:assert/strict');
const { isReleasedForPatient } = require('../src/services/patientProgrammePublication.service');

test('unpublished clinically gated draft never reaches patient programme content', () => {
  assert.equal(isReleasedForPatient(null), false);
  assert.equal(isReleasedForPatient({
    clinicalApprovalRequired: true, isActive: false,
    clinicalApproval: { approvedAt: new Date() },
  }), false);
  assert.equal(isReleasedForPatient({
    clinicalApprovalRequired: true, isActive: true, clinicalApproval: {},
  }), false);
  assert.equal(isReleasedForPatient({
    clinicalApprovalRequired: true, isActive: false, clinicalApproval: {},
  }), false);
});

test('clinically gated programme requires both publication and recorded approval', () => {
  assert.equal(isReleasedForPatient({
    clinicalApprovalRequired: true, isActive: true,
    clinicalApproval: { approvedAt: new Date(), clinicianName: 'Clinician' },
  }), true);
});

test('legacy programme release logic stays compatible', () => {
  assert.equal(isReleasedForPatient({
    clinicalApprovalRequired: false, isActive: true,
  }), true);
  assert.equal(isReleasedForPatient({
    clinicalApprovalRequired: false, isActive: false,
  }), true); // Legacy programme release enforcement is a separate migration.
});
