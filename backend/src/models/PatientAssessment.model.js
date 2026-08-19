const mongoose = require('mongoose');

const patientAssessmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  painCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'PainCategory' },
  answers: [
    {
      question: { type: mongoose.Schema.Types.ObjectId, ref: 'AssessmentQuestion' },
      answer: mongoose.Schema.Types.Mixed,
    },
  ],
  hasRedFlag: { type: Boolean, default: false },
  redFlagDetails: [
    {
      question: { type: mongoose.Schema.Types.ObjectId, ref: 'AssessmentQuestion' },
      questionText: String,
      answer: mongoose.Schema.Types.Mixed,
      reason: String,
      safetyMessage: String,
    },
  ],
  redFlagNotes: String,
  status: {
    type: String,
    enum: ['completed', 'pending_review', 'cleared', 'blocked'],
    default: 'completed',
  },
  adminReviewNote: String,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('PatientAssessment', patientAssessmentSchema);
