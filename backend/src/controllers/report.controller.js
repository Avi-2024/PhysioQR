const mongoose = require('mongoose');
const { Payment } = require('../models/Payment.model');
const Patient = require('../models/Patient.model');
const Doctor = require('../models/Doctor.model');
const ClinicVisit = require('../models/ClinicVisit.model');
const PatientProgram = require('../models/PatientProgram.model');
const QrScan = require('../models/QrScan.model');
const asyncHandler = require('../utils/asyncHandler');

const dateFilter = (startDate, endDate) => {
  if (!startDate && !endDate) return {};
  const filter = {};
  if (startDate) filter.$gte = new Date(startDate);
  if (endDate) filter.$lte = new Date(endDate);
  return { createdAt: filter };
};

const financialReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const match = { status: 'successful', ...dateFilter(startDate, endDate) };

  const result = await Payment.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        grossRevenue: { $sum: '$paidAmount' },
        totalDiscount: { $sum: '$discountAmount' },
        totalTax: { $sum: '$taxAmount' },
        totalGatewayCharges: { $sum: '$gatewayCharges' },
        totalDoctorShare: { $sum: '$doctorFeeShare' },
        totalPlatformShare: { $sum: '$platformShare' },
        totalRefunds: { $sum: '$refundAmount' },
        count: { $sum: 1 },
      },
    },
  ]);

  res.json(result[0] || {});
});

const doctorReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const doctorObjectId = new mongoose.Types.ObjectId(req.params.doctorId);
  const match = { doctor: doctorObjectId, status: 'successful', ...dateFilter(startDate, endDate) };

  const payments = await Payment.find(match)
    .populate('patient', 'patientId fullName mobile')
    .populate('program', 'programCode name');

  const totalRevenue = payments.reduce((sum, payment) => sum + (payment.paidAmount || 0), 0);
  const totalFeeShare = payments.reduce((sum, payment) => sum + (payment.doctorFeeShare || 0), 0);
  const totalRefunds = payments.reduce((sum, payment) => sum + (payment.refundAmount || 0), 0);
  const [totalScans, totalRegistrations] = await Promise.all([
    QrScan.countDocuments({ doctor: doctorObjectId }),
    Patient.countDocuments({ referringDoctor: doctorObjectId }),
  ]);

  res.json({
    totalRevenue,
    totalFeeShare,
    totalRefunds,
    totalScans,
    totalRegistrations,
    conversionRate: totalScans > 0 ? `${((payments.length / totalScans) * 100).toFixed(1)}%` : '0%',
    payments,
  });
});

const agentReport = asyncHandler(async (req, res) => {
  const agentDoctors = await Doctor.find({ agent: req.params.agentId }, '_id');
  const doctorIds = agentDoctors.map((doctor) => doctor._id);

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
    totalDoctors,
    approvedDoctors,
    totalPatients,
    totalPaidPatients,
    clinicVisits,
    pendingFollowUps,
    revenueGenerated: revenueResult[0]?.total || 0,
  });
});

const patientReport = asyncHandler(async (req, res) => {
  const [total, paid, activePrograms, completedPrograms] = await Promise.all([
    Patient.countDocuments(),
    Payment.countDocuments({ status: 'successful' }),
    PatientProgram.countDocuments({ status: 'active' }),
    PatientProgram.countDocuments({ status: 'completed' }),
  ]);

  res.json({ total, paid, unpaid: total - paid, activePrograms, completedPrograms });
});

const programReport = asyncHandler(async (req, res) => {
  const programStats = await Payment.aggregate([
    { $match: { status: 'successful' } },
    { $group: { _id: '$program', totalPurchases: { $sum: 1 }, totalRevenue: { $sum: '$paidAmount' } } },
    { $sort: { totalPurchases: -1 } },
    { $lookup: { from: 'programs', localField: '_id', foreignField: '_id', as: 'program' } },
    { $unwind: '$program' },
    { $project: { programName: '$program.name', programCode: '$program.programCode', totalPurchases: 1, totalRevenue: 1 } },
  ]);

  res.json(programStats);
});

module.exports = {
  financialReport,
  doctorReport,
  agentReport,
  patientReport,
  programReport,
};
