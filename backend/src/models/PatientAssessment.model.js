const mongoose = require('mongoose');

const patientAssessmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  caseType: { type: mongoose.Schema.Types.ObjectId, ref: 'CaseType' },
  painCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'PainCategory' },
  surgeryType: { type: mongoose.Schema.Types.ObjectId, ref: 'SurgeryType' },
  surgeryDate: Date,
  side: {
    type: String,
    enum: ['right', 'left', 'both', 'not_applicable'],
  },
  postOpDayAtAssessment: Number,
  requiresPhysioReview: { type: Boolean, default: false },
  reviewType: {
    type: String,
    enum: ['red_flag', 'physio_review'],
  },
  // For pathways that require clinical review (especially post-operative cases),
  // programme selection is explicit and audited instead of being auto-prescribed.
  approvedProgram: { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },
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

patientAssessmentSchema.index({ patient: 1, createdAt: -1 });
patientAssessmentSchema.index({ status: 1, reviewType: 1, createdAt: -1 });

module.exports = mongoose.model('PatientAssessment', patientAssessmentSchema);
