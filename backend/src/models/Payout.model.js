const mongoose = require('mongoose');

// SRS §46 — Payout record (created when Admin processes an approved withdrawal)
const payoutSchema = new mongoose.Schema({
  withdrawalRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'WithdrawalRequest', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  amount: { type: Number, required: true },
  transactionReference: String,   // bank transfer / NEFT / IMPS ref
  payoutMethod: { type: String, enum: ['bank_transfer', 'upi', 'manual'], default: 'bank_transfer' },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed', 'reversed'],
    default: 'processing',
  },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processedAt: Date,
  failureReason: String,
  notes: String,
}, { timestamps: true });

module.exports = mongoose.model('Payout', payoutSchema);
