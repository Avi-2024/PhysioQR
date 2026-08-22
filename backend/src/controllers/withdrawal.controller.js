const mongoose = require('mongoose');
const { WithdrawalRequest } = require('../models/FeeShare.model');
const { DoctorWallet, WalletTransaction } = require('../models/Wallet.model');
const Payout = require('../models/Payout.model');
const Doctor = require('../models/Doctor.model');
const { writeAuditLog } = require('../utils/auditLogger');
const asyncHandler = require('../utils/asyncHandler');

const ACTIVE_WITHDRAWAL_STATUSES = ['requested', 'under_review', 'approved', 'processing'];
const money2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const getMyWithdrawals = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });

  res.json(await WithdrawalRequest.find({ doctor: doctor._id })
    .select('-bankAccountNumber')
    .sort({ createdAt: -1 }));
});

const requestWithdrawal = asyncHandler(async (req, res) => {
  const requestedAmount = money2(req.body.requestedAmount);
  if (!requestedAmount || requestedAmount <= 0) {
    return res.status(400).json({ message: 'requestedAmount must be a positive number' });
  }

  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });
  if (doctor.status !== 'approved') return res.status(400).json({ message: 'Doctor account must be active to withdraw' });
  if (doctor.kycStatus !== 'approved') return res.status(400).json({ message: 'KYC must be approved before withdrawal' });
  if (!doctor.bankVerified) return res.status(400).json({ message: 'Bank account must be verified before withdrawal' });

  const minWithdrawal = doctor.minWithdrawal ?? 1000;
  const maxWithdrawal = doctor.maxWithdrawal ?? 50000;
  if (requestedAmount < minWithdrawal) return res.status(400).json({ message: `Minimum withdrawal is ₹${minWithdrawal}` });
  if (requestedAmount > maxWithdrawal) return res.status(400).json({ message: `Maximum withdrawal is ₹${maxWithdrawal}` });

  const session = await mongoose.startSession();
  let request;
  try {
    await session.withTransaction(async () => {
      const activePending = await WithdrawalRequest.findOne({
        doctor: doctor._id,
        status: { $in: ACTIVE_WITHDRAWAL_STATUSES },
      }).session(session);
      if (activePending) {
        throw Object.assign(new Error('You already have a pending withdrawal request'), { status: 409 });
      }

      const lockedWallet = await DoctorWallet.findOne({ doctor: doctor._id }).session(session);
      if (!lockedWallet) throw Object.assign(new Error('Wallet not found'), { status: 404 });
      if (Number(lockedWallet.availableBalance || 0) < requestedAmount) {
        throw Object.assign(new Error('Insufficient available balance'), { status: 400 });
      }

      [request] = await WithdrawalRequest.create([{
        doctor: doctor._id,
        wallet: lockedWallet._id,
        requestedAmount,
        bankAccountHolder: doctor.bankAccountHolder,
        bankAccountNumber: doctor.bankAccountNumber,
        ifscCode: doctor.ifscCode,
        upiId: doctor.upiId,
      }], { session });

      const previousBalance = Number(lockedWallet.availableBalance || 0);
      lockedWallet.availableBalance = money2(previousBalance - requestedAmount);
      lockedWallet.withdrawalRequestedAmount = money2(Number(lockedWallet.withdrawalRequestedAmount || 0) + requestedAmount);
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

  const safeRequest = request.toObject();
  delete safeRequest.bankAccountNumber;
  res.status(201).json({ message: 'Withdrawal request submitted', request: safeRequest });
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
  let alreadyApproved = false;
  try {
    await session.withTransaction(async () => {
      request = await WithdrawalRequest.findById(req.params.id).session(session);
      if (!request) throw Object.assign(new Error('Request not found'), { status: 404 });

      if (['approved', 'processing'].includes(request.status)) {
        alreadyApproved = true;
        return;
      }
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
          $set: { status: 'processing', processedBy: req.user._id },
        },
        { upsert: true, new: true, session },
      );
    });
  } finally {
    await session.endSession();
  }

  if (!alreadyApproved) {
    await writeAuditLog({
      req,
      action: 'withdrawal_approved',
      module: 'Withdrawal',
      recordId: request._id,
      newValue: { status: 'approved' },
    });
  }

  res.json({ message: alreadyApproved ? 'Withdrawal already approved' : 'Withdrawal approved and payout created', request, idempotent: alreadyApproved });
});

const markWithdrawalPaid = asyncHandler(async (req, res) => {
  const transactionReference = String(req.body.transactionReference || '').trim();
  if (transactionReference.length < 4) {
    return res.status(400).json({ message: 'A valid transactionReference is required' });
  }

  const existingReference = await Payout.findOne({ transactionReference }).lean();
  if (existingReference && String(existingReference.withdrawalRequest) !== String(req.params.id)) {
    return res.status(409).json({ message: 'Payout transaction reference already exists' });
  }

  const session = await mongoose.startSession();
  let request;
  let alreadyPaid = false;
  try {
    await session.withTransaction(async () => {
      request = await WithdrawalRequest.findById(req.params.id).session(session);
      if (!request) throw Object.assign(new Error('Request not found'), { status: 404 });

      if (request.status === 'paid') {
        if (request.payoutTransactionRef === transactionReference) {
          alreadyPaid = true;
          return;
        }
        throw Object.assign(new Error('Withdrawal is already paid with a different transaction reference'), { status: 409 });
      }
      if (!['approved', 'processing'].includes(request.status)) {
        throw Object.assign(new Error(`Cannot mark paid for status: ${request.status}`), { status: 400 });
      }

      const payout = await Payout.findOne({ withdrawalRequest: request._id }).session(session);
      if (!payout) throw Object.assign(new Error('Payout record not found. Approve withdrawal before marking paid.'), { status: 409 });
      if (payout.transactionReference && payout.transactionReference !== transactionReference) {
        throw Object.assign(new Error('Payout already has a different transaction reference'), { status: 409 });
      }

      request.status = 'paid';
      request.payoutTransactionRef = transactionReference;
      request.processedBy = req.user._id;
      request.processedAt = new Date();
      await request.save({ session });

      payout.status = 'completed';
      payout.transactionReference = transactionReference;
      payout.processedAt = new Date();
      payout.processedBy = req.user._id;
      await payout.save({ session });

      const wallet = await DoctorWallet.findById(request.wallet).session(session);
      if (!wallet) throw Object.assign(new Error('Wallet not found'), { status: 404 });
      if (Number(wallet.withdrawalRequestedAmount || 0) < Number(request.requestedAmount || 0)) {
        throw Object.assign(new Error('Wallet reserved withdrawal balance is inconsistent'), { status: 409 });
      }

      const previousBalance = Number(wallet.withdrawalRequestedAmount || 0);
      wallet.withdrawalRequestedAmount = money2(previousBalance - request.requestedAmount);
      wallet.paidBalance = money2(Number(wallet.paidBalance || 0) + request.requestedAmount);
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

  if (!alreadyPaid) {
    await writeAuditLog({
      req,
      action: 'payout_completed',
      module: 'Withdrawal',
      recordId: request._id,
      newValue: { transactionReference },
    });
  }

  res.json({ message: alreadyPaid ? 'Payout already marked as completed' : 'Payout marked as completed', idempotent: alreadyPaid });
});

const restoreReservedAmount = async ({ request, session, type, reason, createdBy }) => {
  const wallet = await DoctorWallet.findById(request.wallet).session(session);
  if (!wallet) throw Object.assign(new Error('Wallet not found'), { status: 404 });
  if (Number(wallet.withdrawalRequestedAmount || 0) < Number(request.requestedAmount || 0)) {
    throw Object.assign(new Error('Wallet reserved withdrawal balance is inconsistent'), { status: 409 });
  }

  const previousBalance = Number(wallet.availableBalance || 0);
  wallet.availableBalance = money2(previousBalance + request.requestedAmount);
  wallet.withdrawalRequestedAmount = money2(Number(wallet.withdrawalRequestedAmount || 0) - request.requestedAmount);
  await wallet.save({ session });

  await WalletTransaction.create([{
    doctor: request.doctor,
    wallet: wallet._id,
    type,
    amount: request.requestedAmount,
    previousBalance,
    newBalance: wallet.availableBalance,
    reason,
    createdBy,
  }], { session });
};

const rejectWithdrawal = asyncHandler(async (req, res) => {
  const reason = String(req.body.reason || '').trim();
  if (!reason) return res.status(400).json({ message: 'Rejection reason is required' });

  const session = await mongoose.startSession();
  let request;
  let alreadyRejected = false;
  try {
    await session.withTransaction(async () => {
      request = await WithdrawalRequest.findById(req.params.id).session(session);
      if (!request) throw Object.assign(new Error('Request not found'), { status: 404 });
      if (request.status === 'rejected') {
        alreadyRejected = true;
        return;
      }
      if (request.status === 'paid') throw Object.assign(new Error('Paid requests cannot be rejected'), { status: 400 });
      if (['failed', 'cancelled', 'reversed'].includes(request.status)) {
        throw Object.assign(new Error(`Request already closed with status: ${request.status}`), { status: 400 });
      }

      request.status = 'rejected';
      request.rejectionReason = reason;
      request.processedBy = req.user._id;
      request.processedAt = new Date();
      await request.save({ session });

      const payout = await Payout.findOne({ withdrawalRequest: request._id }).session(session);
      if (payout) {
        payout.status = 'reversed';
        payout.failureReason = reason;
        payout.processedAt = new Date();
        payout.processedBy = req.user._id;
        await payout.save({ session });
      }

      await restoreReservedAmount({
        request,
        session,
        type: 'withdrawal_request',
        reason: `Withdrawal rejected: ${reason}`,
        createdBy: req.user._id,
      });
    });
  } finally {
    await session.endSession();
  }

  if (!alreadyRejected) {
    await writeAuditLog({
      req,
      action: 'withdrawal_rejected',
      module: 'Withdrawal',
      recordId: request._id,
      newValue: { reason },
    });
  }

  res.json({ message: alreadyRejected ? 'Withdrawal already rejected' : 'Withdrawal rejected, amount returned to wallet', idempotent: alreadyRejected });
});

const markWithdrawalFailed = asyncHandler(async (req, res) => {
  const reason = String(req.body.reason || '').trim();
  if (!reason) return res.status(400).json({ message: 'Failure reason is required' });

  const session = await mongoose.startSession();
  let request;
  let alreadyFailed = false;
  try {
    await session.withTransaction(async () => {
      request = await WithdrawalRequest.findById(req.params.id).session(session);
      if (!request) throw Object.assign(new Error('Request not found'), { status: 404 });
      if (request.status === 'failed') {
        alreadyFailed = true;
        return;
      }
      if (!['approved', 'processing'].includes(request.status)) {
        throw Object.assign(new Error(`Cannot fail payout for status: ${request.status}`), { status: 400 });
      }

      request.status = 'failed';
      request.rejectionReason = reason;
      request.processedBy = req.user._id;
      request.processedAt = new Date();
      await request.save({ session });

      const payout = await Payout.findOne({ withdrawalRequest: request._id }).session(session);
      if (!payout) throw Object.assign(new Error('Payout record not found'), { status: 409 });
      payout.status = 'failed';
      payout.failureReason = reason;
      payout.processedAt = new Date();
      payout.processedBy = req.user._id;
      await payout.save({ session });

      await restoreReservedAmount({
        request,
        session,
        type: 'payout_failed',
        reason: `Payout failed: ${reason}`,
        createdBy: req.user._id,
      });
    });
  } finally {
    await session.endSession();
  }

  if (!alreadyFailed) {
    await writeAuditLog({
      req,
      action: 'payout_failed',
      module: 'Withdrawal',
      recordId: request._id,
      newValue: { reason },
    });
  }

  res.json({ message: alreadyFailed ? 'Payout already marked failed' : 'Payout marked failed, amount returned to wallet', idempotent: alreadyFailed });
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
