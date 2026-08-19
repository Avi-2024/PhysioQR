const mongoose = require('mongoose');
const { WithdrawalRequest } = require('../models/FeeShare.model');
const { DoctorWallet, WalletTransaction } = require('../models/Wallet.model');
const Payout = require('../models/Payout.model');
const Doctor = require('../models/Doctor.model');
const { writeAuditLog } = require('../utils/auditLogger');
const asyncHandler = require('../utils/asyncHandler');

const getMyWithdrawals = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });

  res.json(await WithdrawalRequest.find({ doctor: doctor._id }).sort({ createdAt: -1 }));
});

const requestWithdrawal = asyncHandler(async (req, res) => {
  const requestedAmount = Number(req.body.requestedAmount);
  if (!requestedAmount || requestedAmount <= 0) {
    return res.status(400).json({ message: 'requestedAmount must be a positive number' });
  }

  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });
  if (doctor.status !== 'approved') return res.status(400).json({ message: 'Doctor account must be active to withdraw' });
  if (doctor.kycStatus !== 'approved') return res.status(400).json({ message: 'KYC must be approved before withdrawal' });
  if (!doctor.bankVerified) return res.status(400).json({ message: 'Bank account must be verified before withdrawal' });

  const wallet = await DoctorWallet.findOne({ doctor: doctor._id });
  if (!wallet) return res.status(404).json({ message: 'Wallet not found' });

  const minWithdrawal = doctor.minWithdrawal || 1000;
  const maxWithdrawal = doctor.maxWithdrawal || 50000;
  if (wallet.availableBalance < requestedAmount) return res.status(400).json({ message: 'Insufficient available balance' });
  if (requestedAmount < minWithdrawal) return res.status(400).json({ message: `Minimum withdrawal is ₹${minWithdrawal}` });
  if (requestedAmount > maxWithdrawal) return res.status(400).json({ message: `Maximum withdrawal is ₹${maxWithdrawal}` });

  const activePending = await WithdrawalRequest.findOne({
    doctor: doctor._id,
    status: { $in: ['requested', 'under_review', 'approved', 'processing'] },
  });
  if (activePending) return res.status(400).json({ message: 'You already have a pending withdrawal request' });

  const session = await mongoose.startSession();
  let request;
  try {
    await session.withTransaction(async () => {
      const lockedWallet = await DoctorWallet.findOne({ doctor: doctor._id }).session(session);
      if (!lockedWallet) throw Object.assign(new Error('Wallet not found'), { status: 404 });
      if (lockedWallet.availableBalance < requestedAmount) throw Object.assign(new Error('Insufficient available balance'), { status: 400 });

      [request] = await WithdrawalRequest.create([{
        doctor: doctor._id,
        wallet: lockedWallet._id,
        requestedAmount,
        bankAccountHolder: doctor.bankAccountHolder,
        bankAccountNumber: doctor.bankAccountNumber,
        ifscCode: doctor.ifscCode,
        upiId: doctor.upiId,
      }], { session });

      const previousBalance = lockedWallet.availableBalance;
      lockedWallet.availableBalance -= requestedAmount;
      lockedWallet.withdrawalRequestedAmount += requestedAmount;
      await lockedWallet.save({ session });

      await WalletTransaction.create([{
        doctor: doctor._id,
        wallet: lockedWallet._id,
        type: 'withdrawal_request',
        amount: -requestedAmount,
        previousBalance,
        newBalance: lockedWallet.availableBalance,
        reason: `Withdrawal request submitted. Request ID: ${request._id}`,
      }], { session });
    });
  } finally {
    await session.endSession();
  }

  res.status(201).json({ message: 'Withdrawal request submitted', request });
});

const getWithdrawals = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const requests = await WithdrawalRequest.find(filter)
    .populate('doctor', 'fullName doctorId clinicName kycStatus bankVerified status')
    .select('-bankAccountNumber')
    .sort({ createdAt: -1 });

  res.json(requests);
});

const approveWithdrawal = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  let request;
  try {
    await session.withTransaction(async () => {
      request = await WithdrawalRequest.findById(req.params.id).session(session);
      if (!request) throw Object.assign(new Error('Request not found'), { status: 404 });
      if (!['requested', 'under_review'].includes(request.status)) {
        throw Object.assign(new Error(`Cannot approve a request with status: ${request.status}`), { status: 400 });
      }

      const doctor = await Doctor.findById(request.doctor).session(session);
      if (!doctor || doctor.status !== 'approved' || doctor.kycStatus !== 'approved' || !doctor.bankVerified) {
        throw Object.assign(new Error('Doctor KYC, bank verification, and active status are required for payout approval'), { status: 400 });
      }

      request.status = 'approved';
      request.processedBy = req.user._id;
      request.processedAt = new Date();
      await request.save({ session });

      await Payout.findOneAndUpdate(
        { withdrawalRequest: request._id },
        {
          $setOnInsert: {
            withdrawalRequest: request._id,
            doctor: request.doctor,
            amount: request.requestedAmount,
          },
          status: 'processing',
          processedBy: req.user._id,
        },
        { upsert: true, new: true, session }
      );
    });
  } finally {
    await session.endSession();
  }

  await writeAuditLog({
    req,
    action: 'withdrawal_approved',
    module: 'Withdrawal',
    recordId: request._id,
    newValue: { status: 'approved' },
  });

  res.json({ message: 'Withdrawal approved and payout created', request });
});

const markWithdrawalPaid = asyncHandler(async (req, res) => {
  const { transactionReference } = req.body;
  if (!transactionReference || String(transactionReference).trim().length < 4) {
    return res.status(400).json({ message: 'A valid transactionReference is required' });
  }
  const duplicateRef = await Payout.findOne({ transactionReference });
  if (duplicateRef) return res.status(409).json({ message: 'Payout transaction reference already exists' });

  const session = await mongoose.startSession();
  let request;
  try {
    await session.withTransaction(async () => {
      request = await WithdrawalRequest.findById(req.params.id).session(session);
      if (!request) throw Object.assign(new Error('Request not found'), { status: 404 });
      if (!['approved', 'processing'].includes(request.status)) {
        throw Object.assign(new Error(`Cannot mark paid for status: ${request.status}`), { status: 400 });
      }

      request.status = 'paid';
      request.payoutTransactionRef = transactionReference;
      request.processedBy = req.user._id;
      request.processedAt = new Date();
      await request.save({ session });

      await Payout.findOneAndUpdate(
        { withdrawalRequest: request._id },
        { status: 'completed', transactionReference, processedAt: new Date(), processedBy: req.user._id },
        { new: true, session }
      );

      const wallet = await DoctorWallet.findById(request.wallet).session(session);
      if (!wallet) throw Object.assign(new Error('Wallet not found'), { status: 404 });

      const previousBalance = wallet.withdrawalRequestedAmount;
      wallet.withdrawalRequestedAmount = Math.max(wallet.withdrawalRequestedAmount - request.requestedAmount, 0);
      wallet.paidBalance += request.requestedAmount;
      await wallet.save({ session });

      await WalletTransaction.create([{
        doctor: request.doctor,
        wallet: wallet._id,
        type: 'payout_completed',
        amount: -request.requestedAmount,
        previousBalance,
        newBalance: wallet.withdrawalRequestedAmount,
        reason: `Payout completed. Ref: ${transactionReference}`,
        createdBy: req.user._id,
      }], { session });
    });
  } finally {
    await session.endSession();
  }

  await writeAuditLog({
    req,
    action: 'payout_completed',
    module: 'Withdrawal',
    recordId: request._id,
    newValue: { transactionReference },
  });

  res.json({ message: 'Payout marked as completed' });
});

const rejectWithdrawal = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ message: 'Rejection reason is required' });

  const session = await mongoose.startSession();
  let request;
  try {
    await session.withTransaction(async () => {
      request = await WithdrawalRequest.findById(req.params.id).session(session);
      if (!request) throw Object.assign(new Error('Request not found'), { status: 404 });
      if (request.status === 'paid') throw Object.assign(new Error('Paid requests cannot be rejected'), { status: 400 });
      if (['rejected', 'failed', 'cancelled', 'reversed'].includes(request.status)) {
        throw Object.assign(new Error(`Request already closed with status: ${request.status}`), { status: 400 });
      }

      request.status = 'rejected';
      request.rejectionReason = reason;
      request.processedBy = req.user._id;
      request.processedAt = new Date();
      await request.save({ session });

      await Payout.findOneAndUpdate(
        { withdrawalRequest: request._id },
        { status: 'reversed', failureReason: reason, processedAt: new Date(), processedBy: req.user._id },
        { session }
      );

      const wallet = await DoctorWallet.findById(request.wallet).session(session);
      if (!wallet) throw Object.assign(new Error('Wallet not found'), { status: 404 });

      const previousBalance = wallet.availableBalance;
      wallet.availableBalance += request.requestedAmount;
      wallet.withdrawalRequestedAmount = Math.max(wallet.withdrawalRequestedAmount - request.requestedAmount, 0);
      await wallet.save({ session });

      await WalletTransaction.create([{
        doctor: request.doctor,
        wallet: wallet._id,
        type: 'withdrawal_request',
        amount: request.requestedAmount,
        previousBalance,
        newBalance: wallet.availableBalance,
        reason: `Withdrawal rejected: ${reason}`,
        createdBy: req.user._id,
      }], { session });
    });
  } finally {
    await session.endSession();
  }

  await writeAuditLog({
    req,
    action: 'withdrawal_rejected',
    module: 'Withdrawal',
    recordId: request._id,
    newValue: { reason },
  });

  res.json({ message: 'Withdrawal rejected, amount returned to wallet' });
});

const markWithdrawalFailed = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ message: 'Failure reason is required' });

  const session = await mongoose.startSession();
  let request;
  try {
    await session.withTransaction(async () => {
      request = await WithdrawalRequest.findById(req.params.id).session(session);
      if (!request) throw Object.assign(new Error('Request not found'), { status: 404 });
      if (!['approved', 'processing'].includes(request.status)) {
        throw Object.assign(new Error(`Cannot fail payout for status: ${request.status}`), { status: 400 });
      }

      request.status = 'failed';
      request.rejectionReason = reason;
      request.processedBy = req.user._id;
      request.processedAt = new Date();
      await request.save({ session });

      await Payout.findOneAndUpdate(
        { withdrawalRequest: request._id },
        { status: 'failed', failureReason: reason, processedAt: new Date(), processedBy: req.user._id },
        { session }
      );

      const wallet = await DoctorWallet.findById(request.wallet).session(session);
      if (!wallet) throw Object.assign(new Error('Wallet not found'), { status: 404 });

      const previousBalance = wallet.availableBalance;
      wallet.availableBalance += request.requestedAmount;
      wallet.withdrawalRequestedAmount = Math.max(wallet.withdrawalRequestedAmount - request.requestedAmount, 0);
      await wallet.save({ session });

      await WalletTransaction.create([{
        doctor: request.doctor,
        wallet: wallet._id,
        type: 'payout_failed',
        amount: request.requestedAmount,
        previousBalance,
        newBalance: wallet.availableBalance,
        reason: `Payout failed: ${reason}`,
        createdBy: req.user._id,
      }], { session });
    });
  } finally {
    await session.endSession();
  }

  await writeAuditLog({
    req,
    action: 'payout_failed',
    module: 'Withdrawal',
    recordId: request._id,
    newValue: { reason },
  });

  res.json({ message: 'Payout marked failed, amount returned to wallet' });
});

module.exports = {
  getMyWithdrawals,
  requestWithdrawal,
  getWithdrawals,
  approveWithdrawal,
  markWithdrawalPaid,
  markWithdrawalFailed,
  rejectWithdrawal,
};
