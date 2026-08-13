const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { requireFields, validateNumberRange } = require('../middlewares/validate.middleware');
const {
  getMyWithdrawals,
  requestWithdrawal,
  getWithdrawals,
  approveWithdrawal,
  markWithdrawalPaid,
  rejectWithdrawal,
} = require('../controllers/withdrawal.controller');

router.use(protect);

router.get('/me', authorize('doctor'), getMyWithdrawals);
router.post('/request', authorize('doctor'), requireFields('requestedAmount'), validateNumberRange('requestedAmount', { min: 1 }), requestWithdrawal);

router.get('/', authorize('admin'), getWithdrawals);
router.post('/:id/approve', authorize('admin'), approveWithdrawal);
router.post('/:id/paid', authorize('admin'), requireFields('transactionReference'), markWithdrawalPaid);
router.post('/:id/reject', authorize('admin'), requireFields('reason'), rejectWithdrawal);

module.exports = router;
