const mongoose = require('mongoose');
const Refund = require('../models/Refund.model');
const { Payment } = require('../models/Payment.model');
const { FeeShare } = require('../models/FeeShare.model');
const { DoctorWallet, WalletTransaction } = require('../models/Wallet.model');
const PatientProgram = require('../models/PatientProgram.model');
const { writeAuditLog } = require('../utils/auditLogger');
const asyncHandler = require('../utils/asyncHandler');

// POST /api/refunds creates an approved refund and reverses fee share atomically.
const createRefund = asyncHandler(async (req, res) => {
  const { paymentId, refundType, reason } = req.body;
  const refundAmount = Number(req.body.refundAmount);
  if (!refundAmount || refundAmount <= 0) return res.status(400).json({ message: 'refundAmount must be a positive number' });

  const payment = await Payment.findById(paymentId);
  if (!payment) return res.status(404).json({ message: 'Payment not found' });
  if (payment.status === 'refunded') return res.status(400).json({ message: 'Payment already refunded' });
  if (!['successful', 'partially_refunded'].includes(payment.status)) {
    return res.status(400).json({ message: `Cannot refund payment with status: ${payment.status}` });
  }
  if ((payment.refundAmount || 0) + refundAmount > payment.paidAmount) {
    return res.status(400).json({ message: 'Refund amount exceeds remaining paid amount' });
  }

  const session = await mongoose.startSession();
  let refund;
  try {
    await session.withTransaction(async () => {
      const lockedPayment = await Payment.findById(paymentId).session(session);
      if (!lockedPayment) throw Object.assign(new Error('Payment not found'), { status: 404 });
      if ((lockedPayment.refundAmount || 0) + refundAmount > lockedPayment.paidAmount) {
        throw Object.assign(new Error('Refund amount exceeds remaining paid amount'), { status: 400 });
      }

      [refund] = await Refund.create([{
        payment: lockedPayment._id,
        patient: lockedPayment.patient,
        doctor: lockedPayment.doctor,
        order: lockedPayment.order,
        refundType,
        refundAmount,
        reason,
        status: 'completed',
        processedBy: req.user._id,
        processedAt: new Date(),
      }], { session });

      lockedPayment.refundAmount = (lockedPayment.refundAmount || 0) + refundAmount;
      const isFullRefund = lockedPayment.refundAmount >= lockedPayment.paidAmount;
      lockedPayment.status = isFullRefund ? 'refunded' : 'partially_refunded';
      await lockedPayment.save({ session });

      const feeShare = await FeeShare.findOne({
        payment: lockedPayment._id,
        status: { $nin: ['reversed', 'cancelled'] },
      }).session(session);

      if (feeShare) {
        const reversalAmount = isFullRefund
          ? feeShare.amount
          : parseFloat(((refundAmount / lockedPayment.paidAmount) * feeShare.amount).toFixed(2));

        const wallet = await DoctorWallet.findOne({ doctor: lockedPayment.doctor }).session(session);
        if (wallet) {
          const alreadyWithdrawn = feeShare.status === 'paid';
          refund.feeShareAlreadyWithdrawn = alreadyWithdrawn;
          const balanceField = alreadyWithdrawn ? 'availableBalance' : 'pendingBalance';
          const previousBalance = wallet[balanceField];
          wallet[balanceField] = Math.max(0, wallet[balanceField] - reversalAmount);
          wallet.reversedBalance += reversalAmount;
          await wallet.save({ session });

          await WalletTransaction.create([{
            doctor: lockedPayment.doctor,
            wallet: wallet._id,
            relatedPayment: lockedPayment._id,
            type: 'refund_reversal',
            amount: -reversalAmount,
            previousBalance,
            newBalance: wallet[balanceField],
            reason: `Fee share reversed due to refund. Refund ID: ${refund._id}`,
          }], { session });
        }

        feeShare.status = isFullRefund ? 'reversed' : 'adjusted';
        await feeShare.save({ session });

        refund.feeShareReversal = reversalAmount;
        await refund.save({ session });
      }

      if (isFullRefund) {
        await PatientProgram.findOneAndUpdate({ payment: lockedPayment._id }, { status: 'cancelled' }, { session });
      }
    });
  } finally {
    await session.endSession();
  }

  await writeAuditLog({
    req,
    action: 'refund_processed',
    module: 'Payment',
    recordId: payment._id,
    newValue: { refundAmount, refundType, feeShareReversed: refund.feeShareReversal },
  });

  res.status(201).json({ message: 'Refund processed and fee share reversed', refund });
});

// GET /api/refunds returns all refunds for admin review.
const getAllRefunds = asyncHandler(async (req, res) => {
  const refunds = await Refund.find()
    .populate('patient', 'fullName mobile')
    .populate('doctor', 'fullName')
    .populate('payment', 'paidAmount invoiceNumber status refundAmount')
    .sort({ createdAt: -1 });
  res.json(refunds);
});

// GET /api/refunds/:id returns one refund record.
const getRefundById = asyncHandler(async (req, res) => {
  const refund = await Refund.findById(req.params.id).populate('patient doctor payment');
  if (!refund) return res.status(404).json({ message: 'Refund not found' });
  res.json(refund);
});

module.exports = { createRefund, getAllRefunds, getRefundById };
