const Razorpay = require('razorpay');
const mongoose = require('mongoose');
const Refund = require('../models/Refund.model');
const { Payment, Order } = require('../models/Payment.model');
const { FeeShare } = require('../models/FeeShare.model');
const { DoctorWallet, WalletTransaction } = require('../models/Wallet.model');
const PatientProgram = require('../models/PatientProgram.model');

let client;
const isMockGateway = () => process.env.PAYMENT_GATEWAY_MODE === 'mock' && process.env.NODE_ENV !== 'production';
const money2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const gatewayError = (message, status = 400) => Object.assign(new Error(message), { status });
const getClient = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) throw gatewayError('Razorpay credentials are not configured', 503);
  if (!client) client = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
  return client;
};
const mapGatewayStatus = (status) => status === 'processed' ? 'completed' : status === 'failed' ? 'failed' : 'processing';

const initiateRefund = async ({ refundId, adminUserId }) => {
  const refund = await Refund.findOneAndUpdate(
    { _id: refundId, status: { $in: ['requested', 'approved', 'failed'] } },
    { $set: { status: 'processing', processedBy: adminUserId }, $unset: { rejectionReason: 1 } },
    { new: true },
  );
  if (!refund) {
    const current = await Refund.findById(refundId).lean();
    if (!current) throw gatewayError('Refund not found', 404);
    if (['processing', 'completed'].includes(current.status)) return { refund: current, idempotent: true };
    throw gatewayError(`Refund cannot be processed from status: ${current.status}`, 409);
  }

  const payment = await Payment.findById(refund.payment).lean();
  if (!payment?.gatewayTransactionId) {
    await Refund.findByIdAndUpdate(refund._id, { $set: { status: 'failed', rejectionReason: 'Gateway transaction ID is missing' } });
    throw gatewayError('Gateway transaction ID is missing', 409);
  }
  const duplicate = refund.refundType === 'duplicate_payment';
  if (duplicate && (payment.status !== 'duplicate_captured' || !payment.isDuplicate || money2(refund.refundAmount) !== money2(payment.paidAmount))) {
    await Refund.findByIdAndUpdate(refund._id, { $set: { status: 'failed', rejectionReason: 'Duplicate captured payment or refund amount is invalid' } });
    throw gatewayError('Refund is not a valid full duplicate-charge refund', 409);
  }

  try {
    const gatewayRefund = isMockGateway()
      ? { id: `rfnd_mock_${Date.now()}`, status: 'processed', amount: Math.round(refund.refundAmount * 100), payment_id: payment.gatewayTransactionId }
      : await getClient().payments.refund(payment.gatewayTransactionId, {
          amount: Math.round(refund.refundAmount * 100),
          notes: { physioqr_refund_id: String(refund._id), refund_type: refund.refundType },
        });
    const status = mapGatewayStatus(gatewayRefund.status);
    await Refund.findByIdAndUpdate(refund._id, { $set: { gatewayRefundId: gatewayRefund.id, status } });
    if (status === 'completed') await finalizeConfirmedRefund(refund._id);
    return { refund: await Refund.findById(refund._id).lean(), gatewayRefund, idempotent: false };
  } catch (error) {
    await Refund.findByIdAndUpdate(refund._id, { $set: { status: 'failed', rejectionReason: error?.error?.description || error?.description || error?.message || 'Razorpay refund request failed', processedAt: new Date() } });
    throw error;
  }
};

const finalizeConfirmedRefund = async (refundId) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const refund = await Refund.findById(refundId).session(session);
      if (!refund) throw gatewayError('Refund not found', 404);
      if (refund.processedAt && refund.status === 'completed') return;

      const payment = await Payment.findById(refund.payment).session(session);
      if (!payment) throw gatewayError('Payment not found', 404);

      if (refund.refundType === 'duplicate_payment') {
        refund.status = 'completed'; refund.processedAt = new Date(); await refund.save({ session }); return;
      }

      const completedOthers = await Refund.find({ payment: payment._id, status: 'completed', _id: { $ne: refund._id } }).select('refundAmount feeShareReversal').session(session).lean();
      const previousRefundAmount = money2(completedOthers.reduce((sum, row) => sum + Number(row.refundAmount || 0), 0));
      const nextRefundAmount = money2(previousRefundAmount + refund.refundAmount);
      const paidAmount = money2(payment.paidAmount);
      if (nextRefundAmount > paidAmount) throw gatewayError('Confirmed refunds exceed paid amount', 409);
      const isFullRefund = nextRefundAmount >= paidAmount;

      payment.refundAmount = nextRefundAmount;
      payment.status = isFullRefund ? 'refunded' : 'partially_refunded';
      await payment.save({ session });
      await Order.findByIdAndUpdate(payment.order, { $set: { status: isFullRefund ? 'refunded' : 'partially_refunded' } }, { session });

      const feeShare = await FeeShare.findOne({ payment: payment._id, status: { $nin: ['reversed', 'cancelled'] } }).session(session);
      if (feeShare && paidAmount > 0) {
        const alreadyReversed = money2(completedOthers.reduce((sum, row) => sum + Number(row.feeShareReversal || 0), 0));
        const targetTotal = money2((nextRefundAmount / paidAmount) * Number(feeShare.amount || 0));
        const reversal = Math.max(0, money2(targetTotal - alreadyReversed));
        if (reversal > 0) {
          const wallet = await DoctorWallet.findOne({ doctor: payment.doctor }).session(session);
          if (!wallet) throw gatewayError('Doctor wallet not found for fee-share reversal', 409);
          const alreadyWithdrawn = ['withdrawal_requested', 'approved_for_payout', 'paid'].includes(feeShare.status);
          const balanceField = ['estimated', 'pending', 'on_hold'].includes(feeShare.status) ? 'pendingBalance' : 'availableBalance';
          const previousBalance = Number(wallet[balanceField] || 0);
          wallet[balanceField] = money2(previousBalance - reversal);
          wallet.reversedBalance = money2(Number(wallet.reversedBalance || 0) + reversal);
          await wallet.save({ session });
          await WalletTransaction.create([{ doctor: payment.doctor, wallet: wallet._id, relatedPayment: payment._id, relatedRefund: refund._id, eventKey: `refund:${refund._id}:fee-share-reversal`, type: 'refund_reversal', amount: -reversal, previousBalance, newBalance: wallet[balanceField], reason: `Fee share reversed after confirmed gateway refund. Refund ID: ${refund._id}`, createdBy: refund.processedBy, notes: alreadyWithdrawn ? 'Clawback recorded because fee share was already reserved or paid.' : undefined }], { session });
          refund.feeShareReversal = reversal;
          refund.feeShareAlreadyWithdrawn = alreadyWithdrawn;
        }
        feeShare.status = isFullRefund ? 'reversed' : 'adjusted';
        await feeShare.save({ session });
      }
      if (isFullRefund) await PatientProgram.findOneAndUpdate({ payment: payment._id, status: { $nin: ['cancelled', 'completed'] } }, { $set: { status: 'cancelled' } }, { session });
      refund.status = 'completed'; refund.processedAt = new Date(); await refund.save({ session });
    });
  } finally { await session.endSession(); }
};

const applyRazorpayRefundEvent = async (entity, eventName) => {
  if (!entity?.id || !entity?.payment_id) throw gatewayError('Invalid Razorpay refund webhook payload');
  let refund = await Refund.findOne({ gatewayRefundId: entity.id });
  if (!refund) {
    const payment = await Payment.findOne({ gatewayTransactionId: entity.payment_id }).select('_id').lean();
    if (payment) refund = await Refund.findOne({ payment: payment._id, status: { $in: ['processing', 'requested', 'approved'] } }).sort({ createdAt: 1 });
  }
  if (!refund) return { matched: false };
  const gatewayStatus = entity.status || (eventName === 'refund.processed' ? 'processed' : eventName === 'refund.failed' ? 'failed' : 'pending');
  const status = mapGatewayStatus(gatewayStatus);
  await Refund.findByIdAndUpdate(refund._id, { $set: { gatewayRefundId: entity.id, status, ...(status === 'failed' ? { rejectionReason: entity.error_description || entity.error_reason || 'Razorpay reported refund failure', processedAt: new Date() } : {}) }, ...(status !== 'failed' ? { $unset: { rejectionReason: 1 } } : {}) });
  if (status === 'completed') await finalizeConfirmedRefund(refund._id);
  return { matched: true, refund: await Refund.findById(refund._id) };
};

module.exports = { initiateRefund, initiateDuplicateRefund: initiateRefund, finalizeConfirmedRefund, applyRazorpayRefundEvent };
