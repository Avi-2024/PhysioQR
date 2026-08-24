const mongoose = require('mongoose');
const Refund = require('../models/Refund.model');
const { Payment } = require('../models/Payment.model');
const { FeeShare } = require('../models/FeeShare.model');
const { DoctorWallet, WalletTransaction } = require('../models/Wallet.model');
const PatientProgram = require('../models/PatientProgram.model');
const { writeAuditLog } = require('../utils/auditLogger');
const asyncHandler = require('../utils/asyncHandler');

const money2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const createDuplicateChargeRefundRequest = async ({ paymentId, refundAmount, refundType, reason, idempotencyKey, req }) => {
  const duplicatePayment = await Payment.findById(paymentId).lean();
  if (!duplicatePayment) throw Object.assign(new Error('Payment not found'), { status: 404 });
  if (duplicatePayment.status !== 'duplicate_captured') {
    throw Object.assign(new Error('This endpoint path is only for a duplicate captured charge'), { status: 400 });
  }
  if (refundType !== 'duplicate_payment') {
    throw Object.assign(new Error('Duplicate captured charges must use refundType duplicate_payment'), { status: 400 });
  }
  if (money2(duplicatePayment.paidAmount) !== refundAmount) {
    throw Object.assign(new Error('Duplicate captured charge must be refunded for the full captured amount'), { status: 400 });
  }

  const existing = await Refund.findOne({
    payment: duplicatePayment._id,
    refundType: 'duplicate_payment',
    status: { $in: ['requested', 'approved', 'processing', 'completed'] },
  }).lean();
  if (existing) {
    return { refund: existing, idempotent: true };
  }

  let refund;
  try {
    refund = await Refund.create({
      payment: duplicatePayment._id,
      patient: duplicatePayment.patient,
      doctor: duplicatePayment.doctor,
      order: duplicatePayment.order,
      refundType: 'duplicate_payment',
      refundAmount,
      idempotencyKey,
      reason,
      status: 'requested',
      requestedBy: req.user._id,
      feeShareReversal: 0,
      feeShareAlreadyWithdrawn: false,
    });
  } catch (error) {
    if (error?.code === 11000) {
      const retry = idempotencyKey
        ? await Refund.findOne({ idempotencyKey }).lean()
        : await Refund.findOne({ payment: duplicatePayment._id, refundType: 'duplicate_payment', status: { $in: ['requested', 'approved', 'processing', 'completed'] } }).lean();
      if (retry) return { refund: retry, idempotent: true };
    }
    throw error;
  }

  await writeAuditLog({
    req,
    action: 'duplicate_charge_refund_requested',
    module: 'Payment',
    recordId: duplicatePayment._id,
    newValue: {
      refundId: refund._id,
      refundAmount: refund.refundAmount,
      gatewayTransactionId: duplicatePayment.gatewayTransactionId,
      duplicateOf: duplicatePayment.duplicateOf,
    },
    reason,
  });

  return { refund, idempotent: false };
};

// POST /api/refunds creates a completed refund for a verified primary payment.
// Duplicate captured charges are different: they never earned fee share or created
// entitlement, so this endpoint queues a refund request and leaves the original
// verified payment/program untouched until gateway processing is completed.
const createRefund = asyncHandler(async (req, res) => {
  const { paymentId, refundType, reason } = req.body;
  const refundAmount = money2(req.body.refundAmount);
  const idempotencyKey = req.body.idempotencyKey ? String(req.body.idempotencyKey).trim() : undefined;

  if (!refundAmount || refundAmount <= 0) {
    return res.status(400).json({ message: 'refundAmount must be a positive number' });
  }

  const paymentState = await Payment.findById(paymentId).select('status').lean();
  if (!paymentState) return res.status(404).json({ message: 'Payment not found' });

  if (paymentState.status === 'duplicate_captured') {
    const result = await createDuplicateChargeRefundRequest({ paymentId, refundAmount, refundType, reason, idempotencyKey, req });
    return res.status(result.idempotent ? 200 : 202).json({
      message: result.idempotent ? 'Duplicate charge refund request already exists' : 'Duplicate charge refund queued for gateway processing',
      refund: result.refund,
      idempotent: result.idempotent,
      queued: true,
    });
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
        requestedBy: req.user._id,
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

        const alreadyReversed = money2(previousReversalRows.reduce((sum, item) => sum + Number(item.feeShareReversal || 0), 0));
        const targetTotalReversal = money2((nextRefundAmount / paidAmount) * Number(feeShare.amount || 0));
        const reversalAmount = Math.max(0, money2(targetTotalReversal - alreadyReversed));

        if (reversalAmount > 0) {
          const wallet = await DoctorWallet.findOne({ doctor: lockedPayment.doctor }).session(session);
          if (!wallet) throw Object.assign(new Error('Doctor wallet not found for fee-share reversal'), { status: 409 });

          const alreadyWithdrawn = ['withdrawal_requested', 'approved_for_payout', 'paid'].includes(feeShare.status);
          refund.feeShareAlreadyWithdrawn = alreadyWithdrawn;

          const balanceField = ['estimated', 'pending', 'on_hold'].includes(feeShare.status) ? 'pendingBalance' : 'availableBalance';
          const previousBalance = Number(wallet[balanceField] || 0);
          wallet[balanceField] = money2(previousBalance - reversalAmount);
          wallet.reversedBalance = money2(Number(wallet.reversedBalance || 0) + reversalAmount);
          await wallet.save({ session });

          await WalletTransaction.create([{
            doctor: lockedPayment.doctor,
            wallet: wallet._id,
            relatedPayment: lockedPayment._id,
            relatedRefund: refund._id,
            eventKey: `refund:${refund._id}:fee-share-reversal`,
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
  } catch (error) {
    if (error?.code === 11000 && idempotencyKey) {
      const existingRefund = await Refund.findOne({ idempotencyKey }).lean();
      if (existingRefund && String(existingRefund.payment) === String(paymentId) && money2(existingRefund.refundAmount) === refundAmount) {
        return res.status(200).json({ message: 'Refund already processed', refund: existingRefund, idempotent: true });
      }
    }
    throw error;
  } finally {
    await session.endSession();
  }

  if (!refund) return res.status(409).json({ message: 'Refund could not be completed' });

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
    .populate('requestedBy', 'email mobile role')
    .select('-idempotencyKey')
    .sort({ createdAt: -1 });
  res.json(refunds);
});

const getRefundById = asyncHandler(async (req, res) => {
  const refund = await Refund.findById(req.params.id)
    .populate('patient doctor payment')
    .populate('requestedBy', 'email mobile role')
    .select('-idempotencyKey');
  if (!refund) return res.status(404).json({ message: 'Refund not found' });
  res.json(refund);
});

module.exports = { createRefund, getAllRefunds, getRefundById };
