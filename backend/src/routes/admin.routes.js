const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');
const Doctor = require('../models/Doctor.model');
const Patient = require('../models/Patient.model');
const Agent = require('../models/Agent.model');
const QrScan = require('../models/QrScan.model');
const PatientProgram = require('../models/PatientProgram.model');
const PatientAssessment = require('../models/PatientAssessment.model');
const SupportTicket = require('../models/SupportTicket.model');
const { Payment } = require('../models/Payment.model');
const { WithdrawalRequest } = require('../models/FeeShare.model');
const AuditLog = require('../models/AuditLog.model');

router.use(protect, authorize('admin'));

// GET /api/admin/dashboard — SRS §36 complete stats
router.get('/dashboard', asyncHandler(async (req, res) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    totalAgents,
    totalDoctors,
    activeDoctors,
    pendingApprovals,
    suspendedDoctors,
    totalQrScans,
    totalPatients,
    totalPaidPatients,
    activePrograms,
    todayRevenueResult,
    monthlyRevenueResult,
    totalFeeShareResult,
    pendingWithdrawals,
    completedPayouts,
    totalRefunds,
    highRiskAssessments,
    openTickets,
  ] = await Promise.all([
    Agent.countDocuments(),
    Doctor.countDocuments(),
    Doctor.countDocuments({ status: 'approved' }),
    Doctor.countDocuments({ status: 'submitted' }),
    Doctor.countDocuments({ status: 'suspended' }),
    QrScan.countDocuments(),
    Patient.countDocuments(),
    Payment.countDocuments({ status: 'successful' }),
    PatientProgram.countDocuments({ status: 'active' }),
    Payment.aggregate([
      { $match: { status: 'successful', createdAt: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: '$paidAmount' } } },
    ]),
    Payment.aggregate([
      { $match: { status: 'successful', createdAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$paidAmount' } } },
    ]),
    Payment.aggregate([
      { $match: { status: 'successful' } },
      { $group: { _id: null, doctorShare: { $sum: '$doctorFeeShare' }, platformShare: { $sum: '$platformShare' } } },
    ]),
    WithdrawalRequest.countDocuments({ status: 'requested' }),
    WithdrawalRequest.countDocuments({ status: 'paid' }),
    Payment.countDocuments({ status: { $in: ['refunded', 'partially_refunded'] } }),
    PatientAssessment.countDocuments({ hasRedFlag: true, status: 'pending_review' }),
    SupportTicket.countDocuments({ status: 'open' }),
  ]);

  res.json({
    totalAgents,
    totalDoctors,
    activeDoctors,
    pendingApprovals,
    suspendedDoctors,
    totalQrScans,
    totalPatients,
    totalPaidPatients,
    activePrograms,
    todayRevenue: todayRevenueResult[0]?.total || 0,
    monthlyRevenue: monthlyRevenueResult[0]?.total || 0,
    totalDoctorFeeShare: totalFeeShareResult[0]?.doctorShare || 0,
    physioQrEarnings: totalFeeShareResult[0]?.platformShare || 0,
    pendingWithdrawals,
    completedPayouts,
    totalRefunds,
    highRiskAssessments,
    openTickets,
  });
}));

// GET /api/admin/audit-logs — SRS §41
router.get('/audit-logs', asyncHandler(async (req, res) => {
  const { module, action, limit = 100 } = req.query;
  const filter = {};
  if (module) filter.module = module;
  if (action) filter.action = action;
  const logs = await AuditLog.find(filter)
    .populate('performedBy', 'email role')
    .sort({ createdAt: -1 })
    .limit(Number(limit));
  res.json(logs);
}));

module.exports = router;
