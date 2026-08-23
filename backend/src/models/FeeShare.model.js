const mongoose = require('mongoose');

// One fee share entry per successful payment
const feeShareSchema = new mongoose.Schema({
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  amount: { type: Number, required: true },
  percentage: Number,
  calculationBasis: String,
  holdingDays: Number,
  availableDate: Date,
  status: {
    type: String,
    enum: ['estimated', 'pending', 'on_hold', 'available', 'withdrawal_requested', 'approved_for_payout', 'paid', 'reversed', 'adjusted', 'cancelled'],
    default: 'pending',
  },
}, { timestamps: true });

feeShareSchema.index({ payment: 1 }, { unique: true });
feeShareSchema.index({ doctor: 1, status: 1, availableDate: 1 });

const withdrawalRequestSchema = new mongoose.Schema({
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  wallet: { type: mongoose.Schema.Types.ObjectId, ref: 'DoctorWallet' },
  requestedAmount: { type: Number, required: true },
  bankAccountHolder: String,
  bankAccountNumber: String,
  ifscCode: String,
  upiId: String,
  status: {
    type: String,
    enum: ['requested', 'under_review', 'approved', 'rejected', 'processing', 'paid', 'failed', 'cancelled', 'reversed'],
    default: 'requested',
  },
  rejectionReason: String,
  payoutTransactionRef: String,
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processedAt: Date,
}, { timestamps: true });

withdrawalRequestSchema.index(
  { doctor: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['requested', 'under_review', 'approved', 'processing'] },
    },
  },
);
withdrawalRequestSchema.index({ doctor: 1, createdAt: -1 });

const FeeShare = mongoose.model('FeeShare', feeShareSchema);
const WithdrawalRequest = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);

module.exports = { FeeShare, WithdrawalRequest };
