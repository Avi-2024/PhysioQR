const mongoose = require('mongoose');

const webPushSubscriptionSchema = new mongoose.Schema({
  recipientType: { type: String, enum: ['patient', 'doctor', 'agent', 'admin'], required: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  agent: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
  adminUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  endpoint: { type: String, required: true, unique: true },
  expirationTime: Number,
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
  userAgent: String,
  isActive: { type: Boolean, default: true },
  lastUsedAt: Date,
}, { timestamps: true });

webPushSubscriptionSchema.index({ recipientType: 1, isActive: 1 });
webPushSubscriptionSchema.index({ patient: 1, isActive: 1 });
webPushSubscriptionSchema.index({ doctor: 1, isActive: 1 });
webPushSubscriptionSchema.index({ agent: 1, isActive: 1 });
webPushSubscriptionSchema.index({ adminUser: 1, isActive: 1 });

module.exports = mongoose.model('WebPushSubscription', webPushSubscriptionSchema);
