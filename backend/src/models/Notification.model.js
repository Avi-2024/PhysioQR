const mongoose = require('mongoose');

// SRS §39 — Notifications (WhatsApp, SMS, Email, In-app)
const notificationSchema = new mongoose.Schema({
  recipientType: { type: String, enum: ['patient', 'doctor', 'agent', 'admin'], required: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  agent: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },

  type: {
    type: String,
    enum: [
      // Patient
      'registration_completed', 'otp', 'payment_successful', 'payment_failed',
      'program_activated', 'exercise_reminder', 'day_unlocked', 'missed_exercise',
      'program_expiry', 'program_completed', 'refund_completed', 'ticket_updated',
      // Doctor
      'account_approved', 'documents_required', 'new_patient', 'new_paid_patient',
      'fee_share_credited', 'fee_share_available', 'withdrawal_submitted',
      'withdrawal_approved', 'withdrawal_rejected', 'payout_completed',
      'fee_share_reversed', 'patient_fee_updated',
      // Agent
      'doctor_submitted', 'doctor_approved', 'doctor_rejected',
      'follow_up_due', 'clinic_visit_reminder', 'monthly_performance',
      // Admin
      'new_doctor_registration', 'doctor_docs_submitted', 'high_risk_assessment',
      'payment_dispute', 'refund_request', 'withdrawal_request',
      'failed_payout', 'suspicious_activity', 'youtube_video_unavailable',
    ],
    required: true,
  },

  channel: { type: String, enum: ['whatsapp', 'sms', 'email', 'in_app'], required: true },
  title: String,
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  sentAt: Date,
  status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
  failureReason: String,
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
