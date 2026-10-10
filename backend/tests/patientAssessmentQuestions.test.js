const test = require('node:test');
const assert = require('node:assert/strict');
const {
  HIDDEN_PATIENT_QUESTION_TYPES,
  patientQuestionTypeFilter,
  isStructuredPatientQuestion,
} = require('../src/services/patientAssessmentQuestions.service');

test('new patient assessments exclude free-text and unsupported image answers', () => {
  assert.deepEqual([...HIDDEN_PATIENT_QUESTION_TYPES], ['text', 'image']);
  assert.deepEqual(patientQuestionTypeFilter(), { questionType: { $nin: ['text', 'image'] } });
  assert.equal(isStructuredPatientQuestion({ questionType: 'text' }), false);
  assert.equal(isStructuredPatientQuestion({ questionType: 'image' }), false);
});

test('multiple-choice, yes/no, pain-scale and number questions remain', () => {
  for (const questionType of ['single_choice', 'multiple_choice', 'yes_no', 'pain_scale', 'number', 'date']) {
    assert.equal(isStructuredPatientQuestion({ questionType }), true, `${questionType} should remain available`);
  }
});

test('question filter works as a fresh object for each request', () => {
  const first = patientQuestionTypeFilter();
  first.questionType.$nin.push('multiple_choice');
  assert.deepEqual(patientQuestionTypeFilter().questionType.$nin, ['text', 'image']);
});
