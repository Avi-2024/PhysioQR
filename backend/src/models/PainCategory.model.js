const mongoose = require('mongoose');

const painCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  nameHindi: String,
  description: String,
  isActive: { type: Boolean, default: true },
  // Independent rollout switches for new general and post-operative assessments.
  // Missing fields use the Phase 1 defaults (see assessmentVisibility.service).
  assessmentVisibility: { general: Boolean, postOperative: Boolean },
}, { timestamps: true });

module.exports = mongoose.model('PainCategory', painCategorySchema);
