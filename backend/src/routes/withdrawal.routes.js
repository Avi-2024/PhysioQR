const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { requireFields, validateNumberRange, validateSchema } = require('../middlewares/validate.middleware');
const { requireWithdrawalsEnabled } = require('../middlewares/financeFeatures.middleware');
const {
  getMyWithdrawals,
  requestWithdrawal,
  getWithdrawals,
  approveWithdrawal,
  markWithdrawalPaid,
  markWithdrawalFailed,
  rejectWithdrawal,
} = require('../controllers/withdrawal.controller');

router.use(protect);

router.get('/me', authorize('doctor'), getMyWithdrawals);
router.post('/request', authorize('doctor'), requireWithdrawalsEnabled, requireFields('requestedAmount'), validateNumberRange('requestedAmount', { min: 1 }), requestWithdrawal);

// Existing requests stay operable when new requests are disabled. This lets
// admins safely settle or reject liabilities already created before the flag changed.
router.get('/', authorize('admin'), getWithdrawals);
router.post('/:id/approve', authorize('admin'), validateSchema({ params: { id: { type: 'objectId', required: true } } }), approveWithdrawal);
router.post('/:id/paid', authorize('admin'), validateSchema({ params: { id: { type: 'objectId', required: true } } }), requireFields('transactionReference'), markWithdrawalPaid);
router.post('/:id/failed', authorize('admin'), validateSchema({ params: { id: { type: 'objectId', required: true } } }), requireFields('reason'), markWithdrawalFailed);
router.post('/:id/reject', authorize('admin'), validateSchema({ params: { id: { type: 'objectId', required: true } } }), requireFields('reason'), rejectWithdrawal);

module.exports = router;
