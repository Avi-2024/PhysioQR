const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildRecoveryPipeline, describeUpdate, summarizeOverview,
} = require('../src/services/doctorRecoveryOverview.service');

const DOCTOR_PATIENT = '507f1f77bcf86cd799439011';
const ENROLLMENT = '507f1f77bcf86cd799439012';

test('recent recovery query is scoped by both patient and authorised doctor enrolment', () => {
  const since = new Date('2026-10-01T00:00:00Z');
  const result = buildRecoveryPipeline({ patientIds: [DOCTOR_PATIENT], enrollmentIds: [ENROLLMENT], since });
  assert.deepEqual(result[0].$match.patient, { $in: [DOCTOR_PATIENT] });
  assert.deepEqual(result[0].$match.patientProgram, { $in: [ENROLLMENT] });
  assert.deepEqual(result[0].$match.updatedAt, { $gte: since });
  assert.ok(result[0].$match.$or.some((filter) => filter.dayStarted === true));
  assert.ok(result[0].$match.$or.every((filter) => !Object.prototype.hasOwnProperty.call(filter, 'dayUnlocked')));
  assert.deepEqual(result[1].$facet.updates[1], { $limit: 8 });
});

test('no assessment of clinical improvement is inferred from reports', () => {
  const update = describeUpdate({
    dayNumber: 3, dayCompleted: true,
    painScoreBefore: 3, painScoreAfter: 6,
    discomfortReported: true, feedbackText: '  Feels more painful after exercises  ',
    updatedAt: '2026-10-30T12:00:00Z',
  });
  assert.equal(update.painBefore, 3);
  assert.equal(update.painAfter, 6);
  assert.equal(update.needsReview, true);
  assert.equal(update.feedback, 'Feels more painful after exercises');
  assert.equal(update.completed, true);
  assert.equal(update.recoveryPercent, undefined);
  const missing = describeUpdate({ dayNumber: 1, painScoreBefore: null, painScoreAfter: null });
  assert.equal(missing.painBefore, null);
  assert.equal(missing.painAfter, null);
  assert.equal(missing.needsReview, false);
});

test('only returned referral and enrolment references can become doctor dashboard updates', () => {
  const result = summarizeOverview({
    since: new Date('2026-10-01T00:00:00Z'),
    patients: [{ _id: DOCTOR_PATIENT, patientId: 'PT00011', fullName: 'Patient Test' }],
    enrollments: [{ _id: ENROLLMENT, patient: DOCTOR_PATIENT, program: { name: 'Knee Rehab' } }],
    result: {
      totals: [{ loggedDays: 2, completedDays: 1, discomfortDays: 1, reportingPatients: [DOCTOR_PATIENT] }],
      updates: [
        { patient: DOCTOR_PATIENT, patientProgram: ENROLLMENT, dayNumber: 3, painScoreAfter: 2 },
        { patient: 'different-patient', patientProgram: ENROLLMENT, dayNumber: 4 },
        { patient: DOCTOR_PATIENT, patientProgram: 'different-programme', dayNumber: 5 },
      ],
    },
  });
  assert.equal(result.periodDays, 30);
  assert.equal(result.totalReferredPatients, 1);
  assert.equal(result.patientsReporting, 1);
  assert.equal(result.loggedDays, 2);
  assert.equal(result.completedDays, 1);
  assert.equal(result.discomfortDays, 1);
  assert.equal(result.recentUpdates.length, 1);
  assert.equal(result.recentUpdates[0].patientId, 'PT00011');
  assert.equal(result.recentUpdates[0].programmeName, 'Knee Rehab');
  assert.equal(JSON.stringify(result).includes('different-patient'), false);
});
