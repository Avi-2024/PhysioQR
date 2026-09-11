const mongoose = require('mongoose');

const surgeryTypeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true, lowercase: true },
  name: { type: String, required: true, trim: true },
  nameHindi: { type: String, trim: true },
  bodyRegion: { type: mongoose.Schema.Types.ObjectId, ref: 'PainCategory', required: true },
  description: { type: String, trim: true },
  requiresPhysioReview: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

surgeryTypeSchema.index({ bodyRegion: 1, isActive: 1, displayOrder: 1, name: 1 });

module.exports = mongoose.model('SurgeryType', surgeryTypeSchema);
