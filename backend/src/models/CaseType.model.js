const mongoose = require('mongoose');

const caseTypeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true, lowercase: true },
  name: { type: String, required: true, trim: true },
  nameHindi: { type: String, trim: true },
  description: { type: String, trim: true },
  requiresSurgeryDetails: { type: Boolean, default: false },
  requiresPhysioReview: { type: Boolean, default: false },
  displayOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

caseTypeSchema.index({ isActive: 1, displayOrder: 1, name: 1 });

module.exports = mongoose.model('CaseType', caseTypeSchema);
