const Refund = require('../models/Refund.model');
const { Payment } = require('../models/Payment.model');
const { writeAuditLog } = require('../utils/auditLogger');
const asyncHandler = require('../utils/asyncHandler');

const money2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const createRefund = asyncHandler(async (req, res) => {
  const { paymentId, refundType, reason } = req.body;
  const refundAmount = money2(req.body.refundAmount);
  const idempotencyKey = req.body.idempotencyKey ? String(req.body.idempotencyKey).trim() : undefined;
  if (!refundAmount || refundAmount <= 0) return res.status(400).json({ message: 'refundAmount must be a positive number' });

  const payment = await Payment.findById(paymentId).lean();
  if (!payment) return res.status(404).json({ message: 'Payment not found' });
  const duplicate = payment.status === 'duplicate_captured';
  if (duplicate && refundType !== 'duplicate_payment') return res.status(400).json({ message: 'Duplicate captured charges must use refundType duplicate_payment' });
  if (!duplicate && !['successful', 'manually_verified', 'partially_refunded'].includes(payment.status)) return res.status(400).json({ message: `Cannot refund payment with status: ${payment.status}` });
  if (duplicate && money2(payment.paidAmount) !== refundAmount) return res.status(400).json({ message: 'Duplicate captured charge must be refunded for the full captured amount' });

  if (idempotencyKey) {
    const keyed = await Refund.findOne({ idempotencyKey }).lean();
    if (keyed) {
      if (String(keyed.payment) !== String(paymentId) || money2(keyed.refundAmount) !== refundAmount) return res.status(409).json({ message: 'Idempotency key already used for another refund request' });
      return res.status(200).json({ message: 'Refund request already exists', refund: keyed, idempotent: true, queued: keyed.status !== 'completed' });
    }
  }

  const active = await Refund.find({ payment: payment._id, status: { $in: ['requested', 'approved', 'processing', 'completed'] } }).select('refundAmount refundType status').lean();
  if (duplicate) {
    const existing = active.find((row) => row.refundType === 'duplicate_payment');
    if (existing) return res.status(200).json({ message: 'Duplicate charge refund request already exists', refund: existing, idempotent: true, queued: existing.status !== 'completed' });
  } else {
    const reserved = money2(active.reduce((sum, row) => sum + Number(row.refundAmount || 0), 0));
    if (money2(reserved + refundAmount) > money2(payment.paidAmount)) return res.status(400).json({ message: 'Refund amount exceeds remaining refundable amount' });
  }

  let refund;
  try {
    refund = await Refund.create({
      payment: payment._id, patient: payment.patient, doctor: payment.doctor, order: payment.order,
      refundType, refundAmount, idempotencyKey, reason, status: 'requested', requestedBy: req.user._id,
      feeShareReversal: 0, feeShareAlreadyWithdrawn: false,
    });
  } catch (error) {
    if (error?.code === 11000 && idempotencyKey) {
      const retry = await Refund.findOne({ idempotencyKey }).lean();
      if (retry) return res.status(200).json({ message: 'Refund request already exists', refund: retry, idempotent: true, queued: retry.status !== 'completed' });
    }
    throw error;
  }

  await writeAuditLog({
    req,
    action: duplicate ? 'duplicate_charge_refund_requested' : 'refund_requested',
    module: 'Payment', recordId: payment._id,
    newValue: { refundId: refund._id, refundAmount, refundType, gatewayTransactionId: payment.gatewayTransactionId },
    reason,
  });

  return res.status(202).json({
    message: duplicate ? 'Duplicate charge refund queued for gateway processing' : 'Refund request created; financial reversal waits for Razorpay confirmation',
    refund, idempotent: false, queued: true,
  });
});

const getAllRefunds = asyncHandler(async (req, res) => {
  const refunds = await Refund.find().populate('patient', 'fullName mobile').populate('doctor', 'fullName').populate('payment', 'paidAmount invoiceNumber status refundAmount').populate('requestedBy', 'email mobile role').select('-idempotencyKey').sort({ createdAt: -1 });
  res.json(refunds);
});

const getRefundById = asyncHandler(async (req, res) => {
  const refund = await Refund.findById(req.params.id).populate('patient doctor payment').populate('requestedBy', 'email mobile role').select('-idempotencyKey');
  if (!refund) return res.status(404).json({ message: 'Refund not found' });
  res.json(refund);
});

module.exports = { createRefund, getAllRefunds, getRefundById };
