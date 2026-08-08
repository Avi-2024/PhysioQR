const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const { createOrder, verifyPayment, getPaymentById } = require('../controllers/payment.controller');

router.use(protect);

router.post('/create-order',  createOrder);   // Patient creates a payment order
router.post('/verify',        verifyPayment); // Verify payment after gateway callback
router.get('/:id',            getPaymentById);

module.exports = router;
