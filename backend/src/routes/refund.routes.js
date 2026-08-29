const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { createRefund, getAllRefunds, getRefundById } = require('../controllers/refund.controller');
const { processRefund } = require('../controllers/admin/refund-processing.controller');
const { validateSchema } = require('../middlewares/validate.middleware');
const { requireRefundsEnabled } = require('../middlewares/financeFeatures.middleware');

router.use(protect, authorize('admin'));

router.post('/', requireRefundsEnabled, validateSchema({
  body: {
    paymentId: { type: 'objectId', required: true },
    refundType: { type: 'enum', values: ['full', 'partial', 'duplicate_payment', 'program_cancellation', 'manual', 'gateway'], required: true },
    refundAmount: { type: 'number', min: 1, required: true },
    reason: { type: 'string', min: 3, max: 500, required: true },
    idempotencyKey: { type: 'string', min: 8, max: 120 },
  },
}), createRefund);
router.post('/:id/process', requireRefundsEnabled, validateSchema({ params: { id: { type: 'objectId', required: true } } }), processRefund);
router.get('/', getAllRefunds);
router.get('/:id', validateSchema({ params: { id: { type: 'objectId', required: true } } }), getRefundById);

module.exports = router;
