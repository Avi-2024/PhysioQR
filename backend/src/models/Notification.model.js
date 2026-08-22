const mongoose = require('mongoose');

const deliveryAttemptSchema = new mongoose.Schema({
  status: { type: String, enum: ['sent', 'failed'], required: true },
  provider: String,
  providerMessageId: String,
  error: String,
  attemptedAt: { type: Date, default: Date.now },
}, { _id: false });

const notificationSchema = new mongoose.Schema({
  recipientType: { type: String, enum: ['patient', 'doctor', 'agent', 'admin'], required: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  agent: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
  adminUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  type: {
    type: String,
    enum: [
      'registration_completed', 'otp', 'payment_successful', 'payment_failed',
      'program_activated', 'exercise_reminder', 'day_unlocked', 'missed_exercise',
      'program_expiry', 'program_completed', 'refund_completed', 'ticket_updated',
      'account_approved', 'documents_required', 'new_patient', 'new_paid_patient',
      'fee_share_credited', 'fee_share_available', 'withdrawal_submitted',
      'withdrawal_approved', 'withdrawal_rejected', 'payout_completed',
      'fee_share_reversed', 'patient_fee_updated',
      'doctor_submitted', 'doctor_approved', 'doctor_rejected',
      'follow_up_due', 'clinic_visit_reminder', 'monthly_performance',
      'new_doctor_registration', 'doctor_docs_submitted', 'high_risk_assessment',
      'payment_dispute', 'refund_request', 'withdrawal_request',
      'failed_payout', 'suspicious_activity', 'youtube_video_unavailable',
      'support_ticket_created',
    ],
    required: true,
  },

  channel: { type: String, enum: ['whatsapp', 'sms', 'email', 'in_app', 'web_push'], required: true },
  title: String,
  message: { type: String, required: true },
  recipientContact: String,
  metadata: mongoose.Schema.Types.Mixed,
  isRead: { type: Boolean, default: false },
  sentAt: Date,
  status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
  retryCount: { type: Number, default: 0 },
  nextAttemptAt: Date,
  lastAttemptAt: Date,
  provider: String,
  providerMessageId: String,
  failureReason: String,
  deliveryAttempts: [deliveryAttemptSchema],
}, { timestamps: true });

notificationSchema.index({ recipientType: 1, channel: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ status: 1, channel: 1, createdAt: 1 });
notificationSchema.index({ patient: 1, createdAt: -1 });
notificationSchema.index({ doctor: 1, createdAt: -1 });
notificationSchema.index({ agent: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
