const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const { createOrder, verifyPayment, razorpayWebhook, getPaymentById, getReceipt } = require('../controllers/payment.controller');
const { validateSchema } = require('../middlewares/validate.middleware');
const { paymentLimiter } = require('../middlewares/rateLimit.middleware');

router.post('/webhook/razorpay', razorpayWebhook);

router.use(protect);

router.post('/create-order', paymentLimiter, validateSchema({
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
