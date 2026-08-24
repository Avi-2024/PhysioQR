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
  idempotencyKey: { type: String, trim: true },

  // Fee share reversal linked to this refund
  feeShareReversal: Number,
  feeShareAlreadyWithdrawn: { type: Boolean, default: false },

  reason: String,
  status: {
    type: String,
    enum: ['requested', 'approved', 'processing', 'completed', 'rejected', 'failed'],
    default: 'requested',
  },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processedAt: Date,
  rejectionReason: String,
}, { timestamps: true });

refundSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
refundSchema.index({ payment: 1, createdAt: -1 });
refundSchema.index({ payment: 1, refundType: 1, status: 1 });

module.exports = mongoose.model('Refund', refundSchema);
