const mongoose = require('mongoose');
const Refund = require('../models/Refund.model');
const { Payment } = require('../models/Payment.model');
const { FeeShare } = require('../models/FeeShare.model');
const { DoctorWallet, WalletTransaction } = require('../models/Wallet.model');
const PatientProgram = require('../models/PatientProgram.model');
const { writeAuditLog } = require('../utils/auditLogger');
const asyncHandler = require('../utils/asyncHandler');

const money2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

// POST /api/refunds creates a completed refund and reverses fee share atomically.
const createRefund = asyncHandler(async (req, res) => {
  const { paymentId, refundType, reason } = req.body;
  const refundAmount = money2(req.body.refundAmount);
  const idempotencyKey = req.body.idempotencyKey ? String(req.body.idempotencyKey).trim() : undefined;

  if (!refundAmount || refundAmount <= 0) {
    return res.status(400).json({ message: 'refundAmount must be a positive number' });
  }

  if (idempotencyKey) {
    const existingRefund = await Refund.findOne({ idempotencyKey }).lean();
    if (existingRefund) {
      if (String(existingRefund.payment) !== String(paymentId) || money2(existingRefund.refundAmount) !== refundAmount) {
        return res.status(409).json({ message: 'Idempotency key already used for another refund request' });
      }
      return res.status(200).json({ message: 'Refund already processed', refund: existingRefund, idempotent: true });
    }
  }

  const session = await mongoose.startSession();
  let refund;
  let paymentForAudit;

  try {
    await session.withTransaction(async () => {
      const lockedPayment = await Payment.findById(paymentId).session(session);
      if (!lockedPayment) throw Object.assign(new Error('Payment not found'), { status: 404 });
      if (!['successful', 'manually_verified', 'partially_refunded'].includes(lockedPayment.status)) {
        throw Object.assign(new Error(`Cannot refund payment with status: ${lockedPayment.status}`), { status: 400 });
      }

      if (idempotencyKey) {
        const retryRefund = await Refund.findOne({ idempotencyKey }).session(session);
        if (retryRefund) {
          refund = retryRefund;
          paymentForAudit = lockedPayment;
          return;
        }
      }

      const previousRefundAmount = money2(lockedPayment.refundAmount);
      const nextRefundAmount = money2(previousRefundAmount + refundAmount);
      const paidAmount = money2(lockedPayment.paidAmount);
      if (nextRefundAmount > paidAmount) {
        throw Object.assign(new Error('Refund amount exceeds remaining paid amount'), { status: 400 });
      }

      const isFullRefund = nextRefundAmount >= paidAmount;

      [refund] = await Refund.create([{
        payment: lockedPayment._id,
        patient: lockedPayment.patient,
        doctor: lockedPayment.doctor,
        order: lockedPayment.order,
        refundType,
        refundAmount,
        idempotencyKey,
        reason,
        status: 'completed',
        processedBy: req.user._id,
        processedAt: new Date(),
      }], { session });

      lockedPayment.refundAmount = nextRefundAmount;
      lockedPayment.status = isFullRefund ? 'refunded' : 'partially_refunded';
      await lockedPayment.save({ session });
      paymentForAudit = lockedPayment;

      const feeShare = await FeeShare.findOne({
        payment: lockedPayment._id,
        status: { $nin: ['reversed', 'cancelled'] },
      }).session(session);

      if (feeShare && paidAmount > 0) {
        const previousReversalRows = await Refund.find({
          payment: lockedPayment._id,
          status: 'completed',
          _id: { $ne: refund._id },
        }).select('feeShareReversal').session(session).lean();

        const alreadyReversed = money2(previousReversalRows.reduce(
          (sum, item) => sum + Number(item.feeShareReversal || 0),
          0,
        ));
        const targetTotalReversal = money2((nextRefundAmount / paidAmount) * Number(feeShare.amount || 0));
        const reversalAmount = Math.max(0, money2(targetTotalReversal - alreadyReversed));

        if (reversalAmount > 0) {
          const wallet = await DoctorWallet.findOne({ doctor: lockedPayment.doctor }).session(session);
          if (!wallet) {
            throw Object.assign(new Error('Doctor wallet not found for fee-share reversal'), { status: 409 });
          }

          const alreadyWithdrawn = ['withdrawal_requested', 'approved_for_payout', 'paid'].includes(feeShare.status);
          refund.feeShareAlreadyWithdrawn = alreadyWithdrawn;

          const balanceField = ['estimated', 'pending', 'on_hold'].includes(feeShare.status)
            ? 'pendingBalance'
            : 'availableBalance';
          const previousBalance = Number(wallet[balanceField] || 0);

          // For already-paid/reserved fee share, a negative available balance represents recoverable doctor debt.
          wallet[balanceField] = money2(previousBalance - reversalAmount);
          wallet.reversedBalance = money2(Number(wallet.reversedBalance || 0) + reversalAmount);
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
            createdBy: req.user._id,
            notes: alreadyWithdrawn ? 'Clawback recorded against available balance because fee share was already reserved or paid.' : undefined,
          }], { session });

          refund.feeShareReversal = reversalAmount;
        } else {
          refund.feeShareReversal = 0;
        }

        feeShare.status = isFullRefund ? 'reversed' : 'adjusted';
        await feeShare.save({ session });
        await refund.save({ session });
      }

      if (isFullRefund) {
        await PatientProgram.findOneAndUpdate(
          { payment: lockedPayment._id, status: { $nin: ['cancelled', 'completed'] } },
          { $set: { status: 'cancelled' } },
          { session },
        );
      }
    });
  } finally {
    await session.endSession();
  }

  if (!refund) {
    return res.status(409).json({ message: 'Refund could not be completed' });
  }

  await writeAuditLog({
    req,
    action: 'refund_processed',
    module: 'Payment',
    recordId: paymentForAudit?._id || paymentId,
    newValue: {
      refundId: refund._id,
      refundAmount: refund.refundAmount,
      refundType: refund.refundType,
      feeShareReversed: refund.feeShareReversal || 0,
      feeShareAlreadyWithdrawn: Boolean(refund.feeShareAlreadyWithdrawn),
      idempotencyKey: refund.idempotencyKey,
    },
    reason,
  });

  res.status(201).json({ message: 'Refund processed and fee share reversed', refund });
});

const getAllRefunds = asyncHandler(async (req, res) => {
  const refunds = await Refund.find()
    .populate('patient', 'fullName mobile')
    .populate('doctor', 'fullName')
    .populate('payment', 'paidAmount invoiceNumber status refundAmount')
    .select('-idempotencyKey')
    .sort({ createdAt: -1 });
  res.json(refunds);
});

const getRefundById = asyncHandler(async (req, res) => {
  const refund = await Refund.findById(req.params.id)
    .populate('patient doctor payment')
    .select('-idempotencyKey');
  if (!refund) return res.status(404).json({ message: 'Refund not found' });
  res.json(refund);
});

module.exports = { createRefund, getAllRefunds, getRefundById };
