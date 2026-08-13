const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const { createOrder, verifyPayment, getPaymentById, getReceipt } = require('../controllers/payment.controller');
const { requireFields } = require('../middlewares/validate.middleware');

router.use(protect);

router.post('/create-order',  requireFields('patientId', 'programId', 'doctorId'), createOrder);   // Patient creates a payment order
router.post('/verify',        requireFields('razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature'), verifyPayment); // Verify payment after gateway callback
router.get('/:id/receipt',    getReceipt);
router.get('/:id',            getPaymentById);

module.exports = router;
