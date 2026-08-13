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

  const request = await WithdrawalRequest.create({
    doctor: doctor._id,
    wallet: wallet._id,
    requestedAmount,
    bankAccountHolder: doctor.bankAccountHolder,
    bankAccountNumber: doctor.bankAccountNumber,
    ifscCode: doctor.ifscCode,
    upiId: doctor.upiId,
  });

  const previousBalance = wallet.availableBalance;
  wallet.availableBalance -= requestedAmount;
  wallet.withdrawalRequestedAmount += requestedAmount;
  await wallet.save();

  await WalletTransaction.create({
    doctor: doctor._id,
    wallet: wallet._id,
    type: 'withdrawal_request',
    amount: -requestedAmount,
    previousBalance,
    newBalance: wallet.availableBalance,
    reason: `Withdrawal request submitted. Request ID: ${request._id}`,
  });

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
  const request = await WithdrawalRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ message: 'Request not found' });
  if (!['requested', 'under_review'].includes(request.status)) {
    return res.status(400).json({ message: `Cannot approve a request with status: ${request.status}` });
  }

  request.status = 'approved';
  request.processedBy = req.user._id;
  request.processedAt = new Date();
  await request.save();

  await Payout.create({
    withdrawalRequest: request._id,
    doctor: request.doctor,
    amount: request.requestedAmount,
    status: 'processing',
    processedBy: req.user._id,
  });

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
  const request = await WithdrawalRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ message: 'Request not found' });
  if (!['approved', 'processing'].includes(request.status)) {
    return res.status(400).json({ message: `Cannot mark paid for status: ${request.status}` });
  }

  request.status = 'paid';
  request.payoutTransactionRef = transactionReference;
  request.processedBy = req.user._id;
  request.processedAt = new Date();
  await request.save();

  await Payout.findOneAndUpdate(
    { withdrawalRequest: request._id },
    { status: 'completed', transactionReference, processedAt: new Date(), processedBy: req.user._id },
    { new: true }
  );

  const wallet = await DoctorWallet.findById(request.wallet);
  if (wallet) {
    const previousBalance = wallet.withdrawalRequestedAmount;
    wallet.withdrawalRequestedAmount = Math.max(wallet.withdrawalRequestedAmount - request.requestedAmount, 0);
    wallet.paidBalance += request.requestedAmount;
    await wallet.save();

    await WalletTransaction.create({
      doctor: request.doctor,
      wallet: wallet._id,
      type: 'payout_completed',
      amount: -request.requestedAmount,
      previousBalance,
      newBalance: wallet.withdrawalRequestedAmount,
      reason: `Payout completed. Ref: ${transactionReference}`,
      createdBy: req.user._id,
    });
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

  const request = await WithdrawalRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ message: 'Request not found' });
  if (request.status === 'paid') return res.status(400).json({ message: 'Paid requests cannot be rejected' });

  request.status = 'rejected';
  request.rejectionReason = reason;
  request.processedBy = req.user._id;
  request.processedAt = new Date();
  await request.save();

  const wallet = await DoctorWallet.findById(request.wallet);
  if (!wallet) return res.status(404).json({ message: 'Wallet not found' });

  const previousBalance = wallet.availableBalance;
  wallet.availableBalance += request.requestedAmount;
  wallet.withdrawalRequestedAmount = Math.max(wallet.withdrawalRequestedAmount - request.requestedAmount, 0);
  await wallet.save();

  await WalletTransaction.create({
    doctor: request.doctor,
    wallet: wallet._id,
    type: 'withdrawal_request',
    amount: request.requestedAmount,
    previousBalance,
    newBalance: wallet.availableBalance,
    reason: `Withdrawal rejected: ${reason}`,
    createdBy: req.user._id,
  });

  await writeAuditLog({
    req,
    action: 'withdrawal_rejected',
    module: 'Withdrawal',
    recordId: request._id,
    newValue: { reason },
  });

  res.json({ message: 'Withdrawal rejected, amount returned to wallet' });
});

module.exports = {
  getMyWithdrawals,
  requestWithdrawal,
  getWithdrawals,
  approveWithdrawal,
  markWithdrawalPaid,
  rejectWithdrawal,
};
