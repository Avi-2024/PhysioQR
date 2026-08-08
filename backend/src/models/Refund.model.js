const mongoose = require('mongoose');

// SRS §33 — Refund and Fee Share Adjustment
const refundSchema = new mongoose.Schema({
  payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },

  refundType: {
    type: String,
    enum: ['full', 'partial', 'duplicate_payment', 'program_cancellation', 'manual', 'gateway'],
    required: true,
  },
  refundAmount: { type: Number, required: true },
  gatewayRefundId: String,

  // Fee share reversal linked to this refund
  feeShareReversal: Number,     // amount reversed from doctor wallet
  feeShareAlreadyWithdrawn: { type: Boolean, default: false },

  reason: String,
  status: {
    type: String,
    enum: ['requested', 'approved', 'processing', 'completed', 'rejected', 'failed'],
    default: 'requested',
  },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processedAt: Date,
  rejectionReason: String,
}, { timestamps: true });

module.exports = mongoose.model('Refund', refundSchema);
