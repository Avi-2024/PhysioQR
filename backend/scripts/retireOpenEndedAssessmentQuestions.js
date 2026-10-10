// One-time, non-destructive cleanup for existing MongoDB assessments.
// Mark free-writing / unsupported image-answer questions inactive. Do not
// delete questions: historical PatientAssessment.answers may reference them.
require('dotenv').config();
const mongoose = require('mongoose');
const AssessmentQuestion = require('../src/models/AssessmentQuestion.model');
const { HIDDEN_PATIENT_QUESTION_TYPES } = require('../src/services/patientAssessmentQuestions.service');

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGO_URI or MONGODB_URI is required');

  await mongoose.connect(uri);
  try {
    const filter = {
      questionType: { $in: [...HIDDEN_PATIENT_QUESTION_TYPES] },
      isActive: true,
    };
    const count = await AssessmentQuestion.countDocuments(filter);
    if (!count) {
      console.log('No active descriptive assessment questions found. Nothing to change.');
      return;
    }
    const result = await AssessmentQuestion.updateMany(filter, { $set: { isActive: false } });
    console.log(`Retired ${result.modifiedCount} of ${count} active descriptive assessment questions.`);
    console.log('Questions and historical patient answers were retained; no documents were deleted.');
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error('Assessment question retirement failed:', error.message);
  process.exitCode = 1;
});
