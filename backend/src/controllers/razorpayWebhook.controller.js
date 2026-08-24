const crypto = require('crypto');
const { razorpayWebhook: paymentWebhook } = require('./payment.controller');
const { applyRazorpayRefundEvent } = require('../services/refundGateway.service');
const { writeAuditLog } = require('../utils/auditLogger');

const safeCompare = (actual, expected) => {
  if (!actual || !expected) return false;
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const verify = (rawBody, signature) => {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) throw Object.assign(new Error('Razorpay webhook secret is not configured'), { status: 503 });
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');
  if (!safeCompare(signature, expected)) throw Object.assign(new Error('Webhook verification failed - invalid signature'), { status: 400 });
};

const razorpayWebhook = async (req, res, next) => {
  try {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
    const payload = Buffer.isBuffer(req.body) ? JSON.parse(rawBody.toString('utf8')) : req.body;
    const eventName = payload?.event;

    if (!['refund.created', 'refund.processed', 'refund.failed', 'refund.speed_changed'].includes(eventName)) {
      return paymentWebhook(req, res, next);
    }

    verify(rawBody, req.headers['x-razorpay-signature']);
    const entity = payload?.payload?.refund?.entity;
    const result = await applyRazorpayRefundEvent(entity, eventName);

    if (result.matched) {
      await writeAuditLog({
        req,
        action: `razorpay_${eventName.replace('.', '_')}`,
        module: 'Refund',
        recordId: result.refund._id,
        newValue: { gatewayRefundId: entity.id, gatewayStatus: entity.status, status: result.refund.status },
        metadata: { gatewayPaymentId: entity.payment_id, event: eventName },
      });
    }

    return res.json({ received: true, matched: result.matched });
  } catch (error) {
    return next(error);
  }
};

module.exports = { razorpayWebhook };
