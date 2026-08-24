const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const { createOrder, verifyPayment, getPaymentById, getReceipt } = require('../controllers/payment.controller');
const { razorpayWebhook } = require('../controllers/razorpayWebhook.controller');
const { validateSchema } = require('../middlewares/validate.middleware');
const { paymentLimiter } = require('../middlewares/rateLimit.middleware');
const { requirePaymentsEnabled } = require('../middlewares/financeFeatures.middleware');

// Webhooks must remain available even when new payment initiation is disabled so
// already-created gateway orders and asynchronous refunds can reconcile safely.
router.post('/webhook/razorpay', razorpayWebhook);

router.use(protect);

router.post('/create-order', requirePaymentsEnabled, paymentLimiter, validateSchema({
  body: {
    patientId: { type: 'objectId', required: true },
    programId: { type: 'objectId', required: true },
    doctorId: { type: 'objectId', required: true },
    couponCode: { type: 'string', min: 2, max: 50 },
    idempotencyKey: { type: 'string', min: 8, max: 120 },
  },
}), createOrder);

router.post('/verify', paymentLimiter, validateSchema({
  body: {
    razorpay_order_id: { type: 'string', min: 6, max: 120, required: true },
    razorpay_payment_id: { type: 'string', min: 6, max: 120, required: true },
    razorpay_signature: { type: 'string', min: 8, max: 256, required: true },
  },
}), verifyPayment);
router.get('/:id/receipt', validateSchema({ params: { id: { type: 'objectId', required: true } } }), getReceipt);
router.get('/:id', validateSchema({ params: { id: { type: 'objectId', required: true } } }), getPaymentById);

module.exports = router;
