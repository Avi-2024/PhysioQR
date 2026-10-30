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
  // Legacy primary programme retained for backward compatibility with older
  // payment/reporting code. New clinical reviews can approve multiple programmes.
  approvedProgram: { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },
  approvedPrograms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Program' }],
  answers: [
    {
      question: { type: mongoose.Schema.Types.ObjectId, ref: 'AssessmentQuestion' },
      answer: mongoose.Schema.Types.Mixed,
    },
  ],
  // Private health documents. Hidden from ordinary patient/clinical list queries.
  // Documents are never public URLs; access requires an authorization check.
  assessmentDocuments: {
    type: [{
      documentType: { type: String, enum: ['doctor_prescription', 'investigation_report'], required: true },
      storageProvider: { type: String, enum: ['s3'], required: true },
      bucket: { type: String, required: true },
      key: { type: String, required: true },
      originalName: String,
      mimeType: String,
      size: Number,
      uploadedAt: Date,
    }],
    select: false,
    default: undefined,
  },
  hasRedFlag: { type: Boolean, default: false },
  // Set explicitly on NEW assessments; missing for historical records.
  clinicalSelectionRequired: Boolean,
  routineFlagCount: { type: Number, default: 0 },
  criticalFlagCount: { type: Number, default: 0 },
  redFlagDetails: [
    {
      question: { type: mongoose.Schema.Types.ObjectId, ref: 'AssessmentQuestion' },
      questionText: String,
      answer: mongoose.Schema.Types.Mixed,
      reason: String,
      safetyMessage: String,
      severity: { type: String, enum: ['critical', 'routine'], default: 'critical' },
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
