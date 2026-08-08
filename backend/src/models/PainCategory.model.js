const mongoose = require('mongoose');

const painCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  nameHindi: String,
  description: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('PainCategory', painCategorySchema);
