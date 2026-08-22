const Doctor = require('../../models/Doctor.model');
const Patient = require('../../models/Patient.model');
const Agent = require('../../models/Agent.model');
const QrScan = require('../../models/QrScan.model');
const PatientProgram = require('../../models/PatientProgram.model');
const PatientAssessment = require('../../models/PatientAssessment.model');
const SupportTicket = require('../../models/SupportTicket.model');
const { Payment } = require('../../models/Payment.model');
const Refund = require('../../models/Refund.model');
const { FeeShare, WithdrawalRequest } = require('../../models/FeeShare.model');
const Payout = require('../../models/Payout.model');
const asyncHandler = require('../../utils/asyncHandler');

const VERIFIED_PAYMENT_STATUSES = ['successful', 'manually_verified'];
const clampRange = (value, min, max) => Math.min(Math.max(Number(value) || min, min), max);
const startOfDay = (value) => { const d = new Date(value); d.setHours(0,0,0,0); return d; };
const endOfDay = (value) => { const d = new Date(value); d.setHours(23,59,59,999); return d; };
const sum = (rows, key) => Number(rows?.[0]?.[key] || 0);

const resolveRange = (query) => {
  const days = clampRange(query.days || 30, 1, 365);
  const to = query.to ? endOfDay(query.to) : endOfDay(new Date());
  const from = query.from ? startOfDay(query.from) : startOfDay(new Date(to.getTime() - (days - 1) * 86400000));
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    const error = new Error('Invalid report date range'); error.status = 400; throw error;
  }
  return { from, to };
};

const getReports = asyncHandler(async (req, res) => {
  const { from, to } = resolveRange(req.query);
  const matchDate = { createdAt: { $gte: from, $lte: to } };
  const [
    payments, refunds, feeShares, withdrawals, payouts,
    newPatients, newDoctors, newAgents, qrScans,
    activatedPrograms, completedPrograms, highRiskAssessments,
    supportOpen, supportResolved, revenueTrend, paymentStatus,
    programStatus, supportByCategory, doctorsByStatus
  ] = await Promise.all([
    Payment.aggregate([{ $match: { ...matchDate, status: { $in: VERIFIED_PAYMENT_STATUSES } } }, { $group: { _id:null, count:{ $sum:1 }, amount:{ $sum:'$paidAmount' }, doctorShare:{ $sum:'$doctorFeeShare' }, platformShare:{ $sum:'$platformShare' } } }]),
    Refund.aggregate([{ $match: { ...matchDate, status:'completed' } }, { $group: { _id:null, count:{ $sum:1 }, amount:{ $sum:'$refundAmount' } } }]),
    FeeShare.aggregate([{ $match: matchDate }, { $group: { _id:null, count:{ $sum:1 }, amount:{ $sum:'$amount' } } }]),
    WithdrawalRequest.aggregate([{ $match: matchDate }, { $group: { _id:null, count:{ $sum:1 }, amount:{ $sum:'$requestedAmount' } } }]),
    Payout.aggregate([{ $match: { ...matchDate, status:'completed' } }, { $group: { _id:null, count:{ $sum:1 }, amount:{ $sum:'$amount' } } }]),
    Patient.countDocuments(matchDate), Doctor.countDocuments(matchDate), Agent.countDocuments(matchDate), QrScan.countDocuments(matchDate),
    PatientProgram.countDocuments({ ...matchDate, status:{ $in:['active','completed'] } }),
    PatientProgram.countDocuments({ ...matchDate, status:'completed' }),
    PatientAssessment.countDocuments({ ...matchDate, hasRedFlag:true }),
    SupportTicket.countDocuments({ ...matchDate, status:{ $in:['open','in_progress','waiting_for_user','reopened'] } }),
    SupportTicket.countDocuments({ ...matchDate, status:{ $in:['resolved','closed'] } }),
    Payment.aggregate([
      { $match: { ...matchDate, status:{ $in:VERIFIED_PAYMENT_STATUSES } } },
      { $group: { _id:{ $dateToString:{ format:'%Y-%m-%d', date:'$createdAt' } }, revenue:{ $sum:'$paidAmount' }, payments:{ $sum:1 } } },
      { $sort:{ _id:1 } }
    ]),
    Payment.aggregate([{ $match:matchDate }, { $group:{ _id:'$status', count:{ $sum:1 }, amount:{ $sum:'$paidAmount' } } }, { $sort:{ count:-1 } }]),
    PatientProgram.aggregate([{ $match:matchDate }, { $group:{ _id:'$status', count:{ $sum:1 } } }, { $sort:{ count:-1 } }]),
    SupportTicket.aggregate([{ $match:matchDate }, { $group:{ _id:'$category', count:{ $sum:1 } } }, { $sort:{ count:-1 } }]),
    Doctor.aggregate([{ $match:matchDate }, { $group:{ _id:'$status', count:{ $sum:1 } } }, { $sort:{ count:-1 } }])
  ]);

  res.json({
    range:{ from, to },
    summary:{
      verifiedPayments:sum(payments,'count'), grossRevenue:sum(payments,'amount'), doctorFeeShare:sum(payments,'doctorShare'), platformShare:sum(payments,'platformShare'),
      completedRefunds:sum(refunds,'count'), refundAmount:sum(refunds,'amount'), feeShareEntries:sum(feeShares,'count'), feeShareAmount:sum(feeShares,'amount'),
      withdrawals:sum(withdrawals,'count'), withdrawalAmount:sum(withdrawals,'amount'), completedPayouts:sum(payouts,'count'), payoutAmount:sum(payouts,'amount'),
      newPatients,newDoctors,newAgents,qrScans,activatedPrograms,completedPrograms,highRiskAssessments,supportOpen,supportResolved
    },
    trends:{ revenue:revenueTrend },
    breakdowns:{ paymentStatus,programStatus,supportByCategory,doctorsByStatus }
  });
});

module.exports = { getReports };
