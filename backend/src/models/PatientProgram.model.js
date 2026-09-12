const mongoose = require('mongoose');

// Tracks a patient's enrollment in a program
const patientProgramSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  program: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  // `payment` remains the primary legacy payment link and therefore stays unique.
  // `activationPayment` can be shared by multiple programmes unlocked by one fee.
  payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  activationPayment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },

  startDate: Date,
  expiryDate: Date,
  gracePeriodDays: { type: Number, default: 0 },
  currentDay: { type: Number, default: 1 },
  completionPercentage: { type: Number, default: 0 },

  status: {
    type: String,
    enum: ['pending_payment', 'active', 'paused', 'completed', 'expired', 'cancelled'],
    default: 'pending_payment',
  },

  unlockMethod: {
    type: String,
    enum: ['all_at_once', 'every_24_hours', 'after_completion', 'calendar_dates', 'manual'],
    default: 'every_24_hours',
  },

  pauseCount: { type: Number, default: 0 },
  pausedAt: Date,
  pauseReason: String,
}, { timestamps: true });

patientProgramSchema.index({ patient: 1, program: 1 }, { unique: true });
patientProgramSchema.index({ payment: 1 }, { unique: true, sparse: true });
patientProgramSchema.index({ activationPayment: 1, status: 1 });
patientProgramSchema.index({ doctor: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('PatientProgram', patientProgramSchema);
