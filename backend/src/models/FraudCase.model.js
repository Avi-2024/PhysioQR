const mongoose = require('mongoose');

const fraudCaseSchema = new mongoose.Schema({
  rule: { type: String, required: true },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  status: { type: String, enum: ['open', 'reviewing', 'resolved', 'dismissed'], default: 'open' },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  relatedRecord: String,
  summary: String,
  evidence: mongoose.Schema.Types.Mixed,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  resolutionNote: String,
}, { timestamps: true });

fraudCaseSchema.index({ rule: 1, doctor: 1, status: 1, createdAt: -1 });
fraudCaseSchema.index({ status: 1, severity: 1, createdAt: -1 });
fraudCaseSchema.index({ payment: 1 });

module.exports = mongoose.model('FraudCase', fraudCaseSchema);
