const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { requireFields } = require('../middlewares/validate.middleware');
const {
  getDashboard,
  getAuditLogs,
  getAgents,
  getAgentById,
  getDoctors,
  getDoctorById,
  getPatients,
  getPatientById,
  getPayments,
  getOrders,
  getWithdrawals,
  getWallets,
  getWalletLedger,
  getFeeShares,
  getRiskReviews,
  updateRiskReview,
  getContentSummary,
} = require('../controllers/admin.controller');

router.use(protect, authorize('admin'));

router.get('/dashboard', getDashboard);
router.get('/audit-logs', getAuditLogs);

router.get('/agents', getAgents);
router.get('/agents/:id', getAgentById);

router.get('/doctors', getDoctors);
router.get('/doctors/:id', getDoctorById);

router.get('/patients', getPatients);
router.get('/patients/:id', getPatientById);

router.get('/payments', getPayments);
router.get('/orders', getOrders);
router.get('/withdrawals', getWithdrawals);

router.get('/wallets', getWallets);
router.get('/wallets/:doctorId/ledger', getWalletLedger);
router.get('/fee-shares', getFeeShares);

router.get('/risk-reviews', getRiskReviews);
router.patch('/risk-reviews/:id', requireFields('status'), updateRiskReview);

router.get('/content-summary', getContentSummary);

module.exports = router;
