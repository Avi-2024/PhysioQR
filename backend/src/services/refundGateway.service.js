const Razorpay = require('razorpay');
const Refund = require('../models/Refund.model');
const { Payment } = require('../models/Payment.model');

let client;
const isMockGateway = () => process.env.PAYMENT_GATEWAY_MODE === 'mock' && process.env.NODE_ENV !== 'production';
const money2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const getClient = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw Object.assign(new Error('Razorpay credentials are not configured'), { status: 503 });
  }
  if (!client) client = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
  return client;
};

const mapGatewayStatus = (status) => {
  if (status === 'processed') return 'completed';
  if (status === 'failed') return 'failed';
  return 'processing';
};

const initiateDuplicateRefund = async ({ refundId, adminUserId }) => {
  const refund = await Refund.findOneAndUpdate(
    { _id: refundId, refundType: 'duplicate_payment', status: { $in: ['requested', 'approved'] } },
    { $set: { status: 'processing', processedBy: adminUserId } },
    { new: true },
  );
  if (!refund) {
    const current = await Refund.findById(refundId).lean();
    if (!current) throw Object.assign(new Error('Refund not found'), { status: 404 });
    if (['processing', 'completed'].includes(current.status)) return { refund: current, idempotent: true };
    throw Object.assign(new Error(`Refund cannot be processed from status: ${current.status}`), { status: 409 });
  }

  const payment = await Payment.findById(refund.payment).lean();
  if (!payment || payment.status !== 'duplicate_captured' || !payment.isDuplicate) {
    await Refund.findByIdAndUpdate(refund._id, { $set: { status: 'failed', rejectionReason: 'Duplicate captured payment record is invalid' } });
    throw Object.assign(new Error('Refund is not linked to a quarantined duplicate captured payment'), { status: 409 });
  }
  if (!payment.gatewayTransactionId) {
    await Refund.findByIdAndUpdate(refund._id, { $set: { status: 'failed', rejectionReason: 'Gateway transaction ID is missing' } });
    throw Object.assign(new Error('Gateway transaction ID is missing'), { status: 409 });
  }
  if (money2(refund.refundAmount) !== money2(payment.paidAmount)) {
    await Refund.findByIdAndUpdate(refund._id, { $set: { status: 'failed', rejectionReason: 'Duplicate refund amount must equal captured amount' } });
    throw Object.assign(new Error('Duplicate refund amount must equal the captured amount'), { status: 409 });
  }

  try {
    const gatewayRefund = isMockGateway()
      ? { id: `rfnd_mock_${Date.now()}`, status: 'processed', amount: Math.round(refund.refundAmount * 100), payment_id: payment.gatewayTransactionId }
      : await getClient().payments.refund(payment.gatewayTransactionId, {
          amount: Math.round(refund.refundAmount * 100),
          notes: { physioqr_refund_id: String(refund._id), refund_type: 'duplicate_payment' },
        });

    const status = mapGatewayStatus(gatewayRefund.status);
    const update = {
      gatewayRefundId: gatewayRefund.id,
      status,
      rejectionReason: undefined,
    };
    if (status === 'completed') update.processedAt = new Date();
    const saved = await Refund.findByIdAndUpdate(refund._id, { $set: update, $unset: { ...(update.rejectionReason === undefined ? { rejectionReason: 1 } : {}) } }, { new: true }).lean();
    return { refund: saved, gatewayRefund, idempotent: false };
  } catch (error) {
    await Refund.findByIdAndUpdate(refund._id, {
      $set: {
        status: 'failed',
        rejectionReason: error?.error?.description || error?.description || error?.message || 'Razorpay refund request failed',
        processedAt: new Date(),
      },
    });
    throw error;
  }
};

const applyRazorpayRefundEvent = async (entity, eventName) => {
  if (!entity?.id || !entity?.payment_id) throw Object.assign(new Error('Invalid Razorpay refund webhook payload'), { status: 400 });

  let refund = await Refund.findOne({ gatewayRefundId: entity.id });
  if (!refund) {
    const payment = await Payment.findOne({ gatewayTransactionId: entity.payment_id }).select('_id').lean();
    if (payment) {
      refund = await Refund.findOne({ payment: payment._id, status: { $in: ['processing', 'requested', 'approved'] } }).sort({ createdAt: 1 });
    }
  }
  if (!refund) return { matched: false };

  const gatewayStatus = entity.status || (eventName === 'refund.processed' ? 'processed' : eventName === 'refund.failed' ? 'failed' : 'pending');
  const status = mapGatewayStatus(gatewayStatus);
  refund.gatewayRefundId = entity.id;
  refund.status = status;
  if (status === 'completed' || status === 'failed') refund.processedAt = new Date();
  if (status === 'failed') refund.rejectionReason = entity.error_description || entity.error_reason || 'Razorpay reported refund failure';
  else refund.rejectionReason = undefined;
  await refund.save();
  return { matched: true, refund };
};

module.exports = { initiateDuplicateRefund, applyRazorpayRefundEvent };
