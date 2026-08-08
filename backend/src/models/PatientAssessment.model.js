const mongoose = require('mongoose');

const patientAssessmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  painCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'PainCategory' },
  answers: [
    {
      question: { type: mongoose.Schema.Types.ObjectId, ref: 'AssessmentQuestion' },
      answer: mongoose.Schema.Types.Mixed,  // string, number, array — flexible
    },
  ],
  hasRedFlag: { type: Boolean, default: false },
  redFlagNotes: String,
  status: {
    type: String,
    enum: ['completed', 'pending_review', 'cleared', 'blocked'],
    default: 'completed',
  },
  adminReviewNote: String,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('PatientAssessment', patientAssessmentSchema);
