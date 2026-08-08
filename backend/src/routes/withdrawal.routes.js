const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { WithdrawalRequest } = require('../models/FeeShare.model');
const { DoctorWallet, WalletTransaction } = require('../models/Wallet.model');
const Payout = require('../models/Payout.model');
const Doctor = require('../models/Doctor.model');
const { writeAuditLog } = require('../utils/auditLogger');
const asyncHandler = require('../utils/asyncHandler');

router.use(protect);

// ⚠️ Static /me route before dynamic /:id routes
// Doctor views their withdrawal history
router.get('/me', authorize('doctor'), asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });
  const requests = await WithdrawalRequest.find({ doctor: doctor._id }).sort({ createdAt: -1 });
  res.json(requests);
}));

// Doctor requests a withdrawal — SRS §32.1 eligibility checks
router.post('/request', authorize('doctor'), asyncHandler(async (req, res) => {
  const { requestedAmount } = req.body;

  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });

  // SRS §32.1 — Eligibility checks
  if (doctor.status !== 'approved') {
    return res.status(400).json({ message: 'Doctor account must be active to withdraw' });
  }
  if (doctor.kycStatus !== 'approved') {
    return res.status(400).json({ message: 'KYC must be approved before withdrawal' });
  }
  if (!doctor.bankVerified) {
    return res.status(400).json({ message: 'Bank account must be verified before withdrawal' });
  }

  const wallet = await DoctorWallet.findOne({ doctor: doctor._id });
  if (!wallet) return res.status(404).json({ message: 'Wallet not found' });

  const minWithdrawal = doctor.minWithdrawal || 1000;
  const maxWithdrawal = doctor.maxWithdrawal || 50000;

  if (wallet.availableBalance < requestedAmount) {
    return res.status(400).json({ message: 'Insufficient available balance' });
  }
  if (requestedAmount < minWithdrawal) {
    return res.status(400).json({ message: `Minimum withdrawal is ₹${minWithdrawal}` });
  }
  if (requestedAmount > maxWithdrawal) {
    return res.status(400).json({ message: `Maximum withdrawal is ₹${maxWithdrawal}` });
  }

  // SRS §32.1 — No active pending request allowed
  const activePending = await WithdrawalRequest.findOne({
    doctor: doctor._id,
    status: { $in: ['requested', 'under_review', 'approved', 'processing'] },
  });
  if (activePending) {
    return res.status(400).json({ message: 'You already have a pending withdrawal request' });
  }

  const request = await WithdrawalRequest.create({
    doctor: doctor._id,
    wallet: wallet._id,
    requestedAmount,
    bankAccountHolder: doctor.bankAccountHolder,
    bankAccountNumber: doctor.bankAccountNumber,
    ifscCode: doctor.ifscCode,
    upiId: doctor.upiId,
  });

  // Block amount from available balance — SRS §31.1 ledger entry
  const prev = wallet.availableBalance;
  wallet.availableBalance -= requestedAmount;
  wallet.withdrawalRequestedAmount += requestedAmount;
  await wallet.save();

  await WalletTransaction.create({
    doctor: doctor._id,
    wallet: wallet._id,
    type: 'withdrawal_request',
    amount: -requestedAmount,
    previousBalance: prev,
    newBalance: wallet.availableBalance,
    reason: `Withdrawal request submitted. Request ID: ${request._id}`,
  });

  res.status(201).json({ message: 'Withdrawal request submitted', request });
}));

// Admin views all withdrawal requests
router.get('/', authorize('admin'), asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status) filter.status = status;
  const requests = await WithdrawalRequest.find(filter)
    .populate('doctor', 'fullName doctorId')
    .sort({ createdAt: -1 });
  res.json(requests);
}));

// Admin approves a withdrawal — SRS §32.3
router.post('/:id/approve', authorize('admin'), asyncHandler(async (req, res) => {
  const request = await WithdrawalRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ message: 'Request not found' });
  if (request.status !== 'requested' && request.status !== 'under_review') {
    return res.status(400).json({ message: `Cannot approve a request with status: ${request.status}` });
  }

  request.status = 'approved';
  request.processedBy = req.user._id;
  request.processedAt = new Date();
  await request.save();

  // Create a Payout record
  await Payout.create({
    withdrawalRequest: request._id,
    doctor: request.doctor,
    amount: request.requestedAmount,
    status: 'processing',
    processedBy: req.user._id,
  });

  await writeAuditLog({ req, action: 'withdrawal_approved', module: 'Withdrawal', recordId: request._id, newValue: { status: 'approved' } });

  res.json({ message: 'Withdrawal approved and payout created', request });
}));

// Admin marks payout as completed — SRS §32.3
router.post('/:id/paid', authorize('admin'), asyncHandler(async (req, res) => {
  const { transactionReference } = req.body;
  const request = await WithdrawalRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ message: 'Request not found' });

  request.status = 'paid';
  request.payoutTransactionRef = transactionReference;
  await request.save();

  // Update payout record
  await Payout.findOneAndUpdate(
    { withdrawalRequest: request._id },
    { status: 'completed', transactionReference, processedAt: new Date() }
  );

  // SRS §31.1 — Ledger entry for payout completed
  const wallet = await DoctorWallet.findById(request.wallet);
  if (wallet) {
    const prev = wallet.withdrawalRequestedAmount;
    wallet.withdrawalRequestedAmount -= request.requestedAmount;
    wallet.paidBalance += request.requestedAmount;
    await wallet.save();

    await WalletTransaction.create({
      doctor: request.doctor,
      wallet: wallet._id,
      type: 'payout_completed',
      amount: -request.requestedAmount,
      previousBalance: prev,
      newBalance: wallet.withdrawalRequestedAmount,
      reason: `Payout completed. Ref: ${transactionReference}`,
      createdBy: req.user._id,
    });
  }

  await writeAuditLog({ req, action: 'payout_completed', module: 'Withdrawal', recordId: request._id, newValue: { transactionReference } });

  res.json({ message: 'Payout marked as completed' });
}));

// Admin rejects a withdrawal — SRS §32.5
router.post('/:id/reject', authorize('admin'), asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ message: 'Rejection reason is required' });

  const request = await WithdrawalRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ message: 'Request not found' });

  request.status = 'rejected';
  request.rejectionReason = reason;
  await request.save();

  // Return amount to available balance — SRS §32.5
  const wallet = await DoctorWallet.findById(request.wallet);
  if (!wallet) return res.status(404).json({ message: 'Wallet not found' });

  const prev = wallet.availableBalance;
  wallet.availableBalance += request.requestedAmount;
  wallet.withdrawalRequestedAmount -= request.requestedAmount;
  await wallet.save();

  await WalletTransaction.create({
    doctor: request.doctor,
    wallet: wallet._id,
    type: 'withdrawal_request',
    amount: request.requestedAmount,
    previousBalance: prev,
    newBalance: wallet.availableBalance,
    reason: `Withdrawal rejected: ${reason}`,
    createdBy: req.user._id,
  });

  await writeAuditLog({ req, action: 'withdrawal_rejected', module: 'Withdrawal', recordId: request._id, newValue: { reason } });

  res.json({ message: 'Withdrawal rejected, amount returned to wallet' });
}));

module.exports = router;
