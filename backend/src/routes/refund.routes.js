const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { createRefund, getAllRefunds, getRefundById } = require('../controllers/refund.controller');
const { validateSchema } = require('../middlewares/validate.middleware');

router.use(protect, authorize('admin'));

router.post('/', validateSchema({
  body: {
    paymentId: { type: 'objectId', required: true },
    refundType: { type: 'enum', values: ['full', 'partial', 'duplicate_payment', 'program_cancellation', 'manual', 'gateway'], required: true },
    refundAmount: { type: 'number', min: 1, required: true },
    reason: { type: 'string', min: 3, max: 500, required: true },
  },
}), createRefund);
router.get('/',     getAllRefunds);
router.get('/:id',  getRefundById);

module.exports = router;
