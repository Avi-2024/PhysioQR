const mongoose = require('mongoose');

const programSchema = new mongoose.Schema({
  programCode: { type: String, unique: true },
  name: { type: String, required: true },
  nameHindi: String,
  painCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'PainCategory' },
  description: String,
  objective: String,
  difficultyLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'senior_friendly', 'post_operative', 'general_mobility', 'condition_specific'],
  },
  durationDays: { type: Number, required: true },
  sessionsPerDay: { type: Number, default: 1 },
  recommendedAgeGroup: String,
  eligibleConditions: [String],
  excludedConditions: [String],
  instructions: String,
  precautions: String,
  requiredEquipment: [String],
  defaultPrice: Number,
  thumbnail: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Program', programSchema);
