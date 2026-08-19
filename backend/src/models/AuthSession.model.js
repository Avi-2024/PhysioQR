const mongoose = require('mongoose');

const authSessionSchema = new mongoose.Schema({
  ownerType: { type: String, enum: ['user', 'patient'], required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  role: { type: String, required: true },
  tokenHash: { type: String, required: true, unique: true },
  tokenVersion: { type: Number, required: true, default: 0 },
  userAgent: String,
  ipAddress: String,
  expiresAt: { type: Date, required: true },
  lastUsedAt: Date,
  revokedAt: Date,
  revokedReason: String,
  replacedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AuthSession' },
}, { timestamps: true });

authSessionSchema.index({ ownerType: 1, user: 1, revokedAt: 1, expiresAt: 1 });
authSessionSchema.index({ ownerType: 1, patient: 1, revokedAt: 1, expiresAt: 1 });
authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('AuthSession', authSessionSchema);
