const mongoose = require('mongoose');

// One wallet per doctor
const doctorWalletSchema = new mongoose.Schema({
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true, unique: true },
  pendingBalance: { type: Number, default: 0 },
  availableBalance: { type: Number, default: 0 },
  withdrawalRequestedAmount: { type: Number, default: 0 },
  paidBalance: { type: Number, default: 0 },
  reversedBalance: { type: Number, default: 0 },
  lifetimeEarnings: { type: Number, default: 0 },
}, { timestamps: true });

// Every credit or debit creates one ledger entry — never overwrite balance directly
const walletTransactionSchema = new mongoose.Schema({
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  wallet: { type: mongoose.Schema.Types.ObjectId, ref: 'DoctorWallet', required: true },
  relatedPayment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  type: {
    type: String,
    enum: [
      'fee_share_pending', 'fee_share_released', 'fee_share_credit',
      'withdrawal_request', 'withdrawal_approved', 'payout_completed',
      'payout_failed',
      'refund_reversal', 'manual_credit', 'manual_debit',
      'tax_deduction', 'promotional_bonus', 'penalty_adjustment',
    ],
    required: true,
  },
  amount: { type: Number, required: true },
  previousBalance: Number,
  newBalance: Number,
  reason: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String,
}, { timestamps: true });

const DoctorWallet = mongoose.model('DoctorWallet', doctorWalletSchema);
const WalletTransaction = mongoose.model('WalletTransaction', walletTransactionSchema);

module.exports = { DoctorWallet, WalletTransaction };
