const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { Payment } = require('../models/Payment.model');
const { FeeShare } = require('../models/FeeShare.model');
const Patient = require('../models/Patient.model');
const Doctor = require('../models/Doctor.model');
const Agent = require('../models/Agent.model');
const ClinicVisit = require('../models/ClinicVisit.model');
const PatientProgram = require('../models/PatientProgram.model');
const QrScan = require('../models/QrScan.model');
const asyncHandler = require('../utils/asyncHandler');

router.use(protect, authorize('admin'));

// Helper — build date filter from query params
const dateFilter = (startDate, endDate) => {
  if (!startDate && !endDate) return {};
  const filter = {};
  if (startDate) filter.$gte = new Date(startDate);
  if (endDate) filter.$lte = new Date(endDate);
  return { createdAt: filter };
};

// GET /api/reports/financial — SRS §38.4
router.get('/financial', asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const match = { status: 'successful', ...dateFilter(startDate, endDate) };

  const result = await Payment.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        grossRevenue:      { $sum: '$paidAmount' },
        totalDiscount:     { $sum: '$discountAmount' },
        totalTax:          { $sum: '$taxAmount' },
        totalGatewayCharges: { $sum: '$gatewayCharges' },
        totalDoctorShare:  { $sum: '$doctorFeeShare' },
        totalPlatformShare:{ $sum: '$platformShare' },
        totalRefunds:      { $sum: '$refundAmount' },
        count:             { $sum: 1 },
      },
    },
  ]);
  res.json(result[0] || {});
}));

// GET /api/reports/doctor/:doctorId — SRS §38.1
router.get('/doctor/:doctorId', asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const match = { doctor: require('mongoose').Types.ObjectId(req.params.doctorId), status: 'successful', ...dateFilter(startDate, endDate) };

  const payments = await Payment.find(match)
    .populate('patient', 'fullName mobile')
    .populate('program', 'name');

  const totalRevenue = payments.reduce((s, p) => s + p.paidAmount, 0);
  const totalFeeShare = payments.reduce((s, p) => s + (p.doctorFeeShare || 0), 0);
  const totalRefunds = payments.reduce((s, p) => s + (p.refundAmount || 0), 0);

  const totalScans = await QrScan.countDocuments({ doctor: req.params.doctorId });
  const totalRegistrations = await Patient.countDocuments({ referringDoctor: req.params.doctorId });

  res.json({
    totalRevenue, totalFeeShare, totalRefunds,
    totalScans, totalRegistrations,
    conversionRate: totalScans > 0 ? ((payments.length / totalScans) * 100).toFixed(1) + '%' : '0%',
    payments,
  });
}));

// GET /api/reports/agent/:agentId — SRS §38.2
router.get('/agent/:agentId', asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const agentDoctors = await Doctor.find({ agent: req.params.agentId }, '_id');
  const doctorIds = agentDoctors.map(d => d._id);

  const [totalDoctors, approvedDoctors, totalPatients, totalPaidPatients, clinicVisits, pendingFollowUps] = await Promise.all([
    Doctor.countDocuments({ agent: req.params.agentId }),
    Doctor.countDocuments({ agent: req.params.agentId, status: 'approved' }),
    Patient.countDocuments({ referringDoctor: { $in: doctorIds } }),
    Payment.countDocuments({ doctor: { $in: doctorIds }, status: 'successful' }),
    ClinicVisit.countDocuments({ agent: req.params.agentId }),
    ClinicVisit.countDocuments({ agent: req.params.agentId, outcome: 'follow_up_required' }),
  ]);

  const revenueResult = await Payment.aggregate([
    { $match: { doctor: { $in: doctorIds }, status: 'successful' } },
    { $group: { _id: null, total: { $sum: '$paidAmount' } } },
  ]);

  res.json({
    totalDoctors, approvedDoctors, totalPatients, totalPaidPatients,
    clinicVisits, pendingFollowUps,
    revenueGenerated: revenueResult[0]?.total || 0,
  });
}));

// GET /api/reports/patients — SRS §38.3
router.get('/patients', asyncHandler(async (req, res) => {
  const total = await Patient.countDocuments();
  const paid = await Payment.countDocuments({ status: 'successful' });
  const active = await PatientProgram.countDocuments({ status: 'active' });
  const completed = await PatientProgram.countDocuments({ status: 'completed' });

  res.json({ total, paid, unpaid: total - paid, activePrograms: active, completedPrograms: completed });
}));

// GET /api/reports/programs — SRS §38.5
router.get('/programs', asyncHandler(async (req, res) => {
  const programStats = await Payment.aggregate([
    { $match: { status: 'successful' } },
    { $group: { _id: '$program', totalPurchases: { $sum: 1 }, totalRevenue: { $sum: '$paidAmount' } } },
    { $sort: { totalPurchases: -1 } },
    { $lookup: { from: 'programs', localField: '_id', foreignField: '_id', as: 'program' } },
    { $unwind: '$program' },
    { $project: { programName: '$program.name', totalPurchases: 1, totalRevenue: 1 } },
  ]);
  res.json(programStats);
}));

module.exports = router;
