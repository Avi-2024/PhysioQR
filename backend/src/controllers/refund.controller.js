const Refund = require('../models/Refund.model');
const { Payment } = require('../models/Payment.model');
const { FeeShare } = require('../models/FeeShare.model');
const { DoctorWallet, WalletTransaction } = require('../models/Wallet.model');
const PatientProgram = require('../models/PatientProgram.model');
const { writeAuditLog } = require('../utils/auditLogger');
const asyncHandler = require('../utils/asyncHandler');

// POST /api/refunds — Admin initiates a refund (SRS §33)
const createRefund = asyncHandler(async (req, res) => {
  const { paymentId, refundType, refundAmount, reason } = req.body;

  const payment = await Payment.findById(paymentId);
  if (!payment) return res.status(404).json({ message: 'Payment not found' });
  if (payment.status === 'refunded') return res.status(400).json({ message: 'Payment already refunded' });

  const refund = await Refund.create({
    payment: payment._id,
    patient: payment.patient,
    doctor: payment.doctor,
    order: payment.order,
    refundType,
    refundAmount,
    reason,
    status: 'approved',
    processedBy: req.user._id,
    processedAt: new Date(),
  });

  // Update payment status
  const isFullRefund = refundAmount >= payment.paidAmount;
  payment.status = isFullRefund ? 'refunded' : 'partially_refunded';
  payment.refundAmount = (payment.refundAmount || 0) + refundAmount;
  await payment.save();

  // SRS §33.3 — Reverse the doctor fee share
  const feeShare = await FeeShare.findOne({ payment: payment._id, status: { $nin: ['reversed', 'cancelled'] } });

  if (feeShare) {
    const reversalAmount = isFullRefund
      ? feeShare.amount
      : parseFloat(((refundAmount / payment.paidAmount) * feeShare.amount).toFixed(2));

    const wallet = await DoctorWallet.findOne({ doctor: payment.doctor });

    if (wallet) {
      // SRS §33.4 — If fee share already withdrawn, create negative entry
      const alreadyWithdrawn = feeShare.status === 'paid';
      refund.feeShareAlreadyWithdrawn = alreadyWithdrawn;

      const balanceField = alreadyWithdrawn ? 'availableBalance' : 'pendingBalance';
      const prev = wallet[balanceField];
      wallet[balanceField] = Math.max(0, wallet[balanceField] - reversalAmount);
      await wallet.save();

      await WalletTransaction.create({
        doctor: payment.doctor,
        wallet: wallet._id,
        relatedPayment: payment._id,
        type: 'refund_reversal',
        amount: -reversalAmount,
        previousBalance: prev,
        newBalance: wallet[balanceField],
        reason: `Fee share reversed due to refund. Refund ID: ${refund._id}`,
      });
    }

    feeShare.status = isFullRefund ? 'reversed' : 'adjusted';
    await feeShare.save();

    refund.feeShareReversal = reversalAmount;
    await refund.save();
  }

  // Deactivate patient program on full refund
  if (isFullRefund) {
    await PatientProgram.findOneAndUpdate(
      { payment: payment._id },
      { status: 'cancelled' }
    );
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

// GET /api/refunds — Admin views all refunds
const getAllRefunds = asyncHandler(async (req, res) => {
  const refunds = await Refund.find()
    .populate('patient', 'fullName mobile')
    .populate('doctor', 'fullName')
    .populate('payment', 'paidAmount invoiceNumber')
    .sort({ createdAt: -1 });
  res.json(refunds);
});

// GET /api/refunds/:id
const getRefundById = asyncHandler(async (req, res) => {
  const refund = await Refund.findById(req.params.id)
    .populate('patient doctor payment');
  if (!refund) return res.status(404).json({ message: 'Refund not found' });
  res.json(refund);
});

module.exports = { createRefund, getAllRefunds, getRefundById };
