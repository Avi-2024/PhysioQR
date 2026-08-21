const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { requireFields, validateSchema } = require('../middlewares/validate.middleware');
const { getDashboard } = require('../controllers/admin/dashboard.controller');
const { getAgents } = require('../controllers/admin/agents.controller');
const { getDoctors } = require('../controllers/admin/doctors.controller');
const { getClinics, getClinicById, updateClinic } = require('../controllers/admin/clinics.controller');
const {
  getAuditLogs,
  getAuditLogById,
  exportAuditLogs,
  getAgentById,
  getDoctorById,
  getReferrals,
  getRevenueModels,
  updateRevenueModel,
  getPatients,
  getPatientById,
  getPayments,
  getOrders,
  getWithdrawals,
  getWithdrawalById,
  getWallets,
  getWalletLedger,
  getFeeShares,
  getRiskReviews,
  updateRiskReview,
  getFraudCases,
  getFraudCaseById,
  reviewFraudCase,
  getContentSummary,
} = require('../controllers/admin.controller');

router.use(protect, authorize('admin'));

router.get('/dashboard', getDashboard);
router.get('/audit-logs', getAuditLogs);
router.get('/audit-logs/export', exportAuditLogs);
router.get('/audit-logs/:id', getAuditLogById);

router.get('/agents', getAgents);
router.get('/agents/:id', getAgentById);

router.get('/doctors', getDoctors);
router.get('/doctors/:id', getDoctorById);

router.get('/clinics', getClinics);
router.get('/clinics/:id', getClinicById);
router.patch('/clinics/:id', validateSchema({
  body: {
    clinicName: { type: 'string', max: 160 },
    clinicAddress: { type: 'string', max: 500 },
    city: { type: 'string', max: 100 },
    state: { type: 'string', max: 100 },
    postalCode: { type: 'string', max: 20 },
    clinicContact: { type: 'string', max: 30 },
    clinicEmail: { type: 'string', max: 160 },
    clinicWorkingHours: { type: 'string', max: 200 },
    googleMapsLink: { type: 'string', max: 1000 },
    clinicBranches: { type: 'number', min: 1, max: 1000 },
  },
}), updateClinic);

router.get('/referrals', getReferrals);
router.get('/revenue-models', getRevenueModels);
router.patch('/revenue-models/:doctorId', validateSchema({
  params: {
    doctorId: { type: 'objectId', required: true },
  },
  body: {
    revenueModel: { type: 'enum', values: ['split', 'platform_fee'] },
    approvedPatientFee: { type: 'number', min: 0, max: 1000000 },
    feeSharePercentage: { type: 'number', min: 0, max: 100 },
    feeShareType: { type: 'enum', values: ['percentage', 'fixed', 'slab'] },
    fixedFeeShareAmount: { type: 'number', min: 0, max: 1000000 },
    feeShareCalculationBasis: { type: 'enum', values: ['gross', 'after_discount', 'net_after_charges'] },
    feeShareHoldingDays: { type: 'number', min: 0, max: 365 },
    minWithdrawal: { type: 'number', min: 0, max: 10000000 },
    maxWithdrawal: { type: 'number', min: 0, max: 10000000 },
    payoutCycle: { type: 'string', max: 80 },
    reason: { type: 'string', max: 500 },
  },
}), updateRevenueModel);

router.get('/patients', getPatients);
router.get('/patients/:id', getPatientById);

router.get('/payments', getPayments);
router.get('/orders', getOrders);
router.get('/withdrawals', getWithdrawals);
router.get('/withdrawals/:id', validateSchema({ params: { id: { type: 'objectId', required: true } } }), getWithdrawalById);

router.get('/wallets', getWallets);
router.get('/wallets/:doctorId/ledger', getWalletLedger);
router.get('/fee-shares', getFeeShares);

router.get('/risk-reviews', getRiskReviews);
router.patch('/risk-reviews/:id', requireFields('status'), updateRiskReview);

router.get('/fraud-cases', getFraudCases);
router.get('/fraud-cases/:id', getFraudCaseById);
router.patch('/fraud-cases/:id/review', requireFields('status'), reviewFraudCase);

router.get('/content-summary', getContentSummary);

module.exports = router;
