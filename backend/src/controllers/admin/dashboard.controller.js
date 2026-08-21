const Doctor = require('../../models/Doctor.model');
const Patient = require('../../models/Patient.model');
const Agent = require('../../models/Agent.model');
const QrScan = require('../../models/QrScan.model');
const PatientProgram = require('../../models/PatientProgram.model');
const PatientAssessment = require('../../models/PatientAssessment.model');
const SupportTicket = require('../../models/SupportTicket.model');
const { Payment } = require('../../models/Payment.model');
const { WithdrawalRequest } = require('../../models/FeeShare.model');
const Refund = require('../../models/Refund.model');
const asyncHandler = require('../../utils/asyncHandler');

const VERIFIED_PAYMENT_STATUSES = ['successful', 'manually_verified'];
const OPEN_WITHDRAWAL_STATUSES = ['requested', 'under_review', 'approved', 'processing'];
const OPEN_SUPPORT_STATUSES = ['open', 'in_progress', 'waiting_for_user', 'reopened'];

const aggregateSingle = (result, key) => Number(result?.[0]?.[key] || 0);

const getDashboard = asyncHandler(async (req, res) => {
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
    paidPatientIds,
    successfulPayments,
    activePrograms,
    todayRevenueResult,
    monthlyRevenueResult,
    totalFeeShareResult,
    pendingWithdrawalResult,
    completedPayoutResult,
    refundedPayments,
    refundAmountResult,
    highRiskAssessments,
    openSupportTickets,
  ] = await Promise.all([
    Agent.countDocuments(),
    Doctor.countDocuments(),
    Doctor.countDocuments({ status: 'approved' }),
    Doctor.countDocuments({ status: 'submitted' }),
    Doctor.countDocuments({ status: 'suspended' }),
    QrScan.countDocuments(),
    Patient.countDocuments(),
    Payment.distinct('patient', { status: { $in: VERIFIED_PAYMENT_STATUSES } }),
    Payment.countDocuments({ status: { $in: VERIFIED_PAYMENT_STATUSES } }),
    PatientProgram.countDocuments({ status: 'active' }),
    Payment.aggregate([
      { $match: { status: { $in: VERIFIED_PAYMENT_STATUSES }, createdAt: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: '$paidAmount' } } },
    ]),
    Payment.aggregate([
      { $match: { status: { $in: VERIFIED_PAYMENT_STATUSES }, createdAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$paidAmount' } } },
    ]),
    Payment.aggregate([
      { $match: { status: { $in: VERIFIED_PAYMENT_STATUSES } } },
      {
        $group: {
          _id: null,
          doctorShare: { $sum: '$doctorFeeShare' },
          platformShare: { $sum: '$platformShare' },
        },
      },
    ]),
    WithdrawalRequest.aggregate([
      { $match: { status: { $in: OPEN_WITHDRAWAL_STATUSES } } },
      { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$requestedAmount' } } },
    ]),
    WithdrawalRequest.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$requestedAmount' } } },
    ]),
    Payment.countDocuments({ status: { $in: ['refunded', 'partially_refunded'] } }),
    Refund.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, amount: { $sum: '$refundAmount' } } },
    ]),
    PatientAssessment.countDocuments({ hasRedFlag: true, status: 'pending_review' }),
    SupportTicket.countDocuments({ status: { $in: OPEN_SUPPORT_STATUSES } }),
  ]);

  res.json({
    totalAgents,
    totalDoctors,
    activeDoctors,
    pendingApprovals,
    suspendedDoctors,
    totalQrScans,
    totalPatients,
    uniquePaidPatients: paidPatientIds.length,
    successfulPayments,
    activePrograms,
    todayRevenue: aggregateSingle(todayRevenueResult, 'total'),
    monthlyRevenue: aggregateSingle(monthlyRevenueResult, 'total'),
    totalDoctorFeeShare: aggregateSingle(totalFeeShareResult, 'doctorShare'),
    physioQrEarnings: aggregateSingle(totalFeeShareResult, 'platformShare'),
    pendingWithdrawals: aggregateSingle(pendingWithdrawalResult, 'count'),
    pendingWithdrawalAmount: aggregateSingle(pendingWithdrawalResult, 'amount'),
    completedPayouts: aggregateSingle(completedPayoutResult, 'count'),
    completedPayoutAmount: aggregateSingle(completedPayoutResult, 'amount'),
    refundedPayments,
    totalRefundAmount: aggregateSingle(refundAmountResult, 'amount'),
    highRiskAssessments,
    openSupportTickets,
  });
});

module.exports = { getDashboard };
