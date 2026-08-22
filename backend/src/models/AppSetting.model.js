const mongoose = require('mongoose');

const appSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  description: { type: String, trim: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

appSettingSchema.index({ key: 1 }, { unique: true });

module.exports = mongoose.model('AppSetting', appSettingSchema);
