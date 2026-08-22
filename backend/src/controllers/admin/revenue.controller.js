const mongoose = require('mongoose');
const Doctor = require('../../models/Doctor.model');
const { FeeShare } = require('../../models/FeeShare.model');
const Refund = require('../../models/Refund.model');
const { writeAuditLog } = require('../../utils/auditLogger');
const { buildSearchFilter, getPagination } = require('../../utils/queryHelpers');
const asyncHandler = require('../../utils/asyncHandler');

const VERIFIED_PAYMENT_STATUSES = ['successful', 'manually_verified'];
const HISTORICALLY_VERIFIED_STATUSES = ['refunded', 'partially_refunded', 'disputed', 'chargeback'];

const getRevenueModels = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.revenueModel) filter.revenueModel = req.query.revenueModel;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) Object.assign(filter, buildSearchFilter(req.query.search, ['doctorId','fullName','clinicName','city']));

  const [items, total, splitCount, platformFeeCount] = await Promise.all([
    Doctor.find(filter)
      .select('doctorId fullName clinicName city status revenueModel approvedPatientFee requestedPatientFee feeSharePercentage feeShareType fixedFeeShareAmount feeShareCalculationBasis feeShareHoldingDays minWithdrawal maxWithdrawal payoutCycle qrCodeActive updatedAt createdAt')
      .sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    Doctor.countDocuments(filter),
    Doctor.countDocuments({ revenueModel: 'split' }),
    Doctor.countDocuments({ revenueModel: 'platform_fee' }),
  ]);

  res.json({ items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }, summary: { splitCount, platformFeeCount, configured: splitCount + platformFeeCount } });
});

const updateRevenueModel = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.doctorId)) return res.status(400).json({ message: 'Invalid doctor id' });
  const doctor = await Doctor.findById(req.params.doctorId);
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

  const allowed = ['revenueModel','approvedPatientFee','feeSharePercentage','feeShareType','fixedFeeShareAmount','feeShareCalculationBasis','feeShareHoldingDays','minWithdrawal','maxWithdrawal','payoutCycle'];
  const previousValue = Object.fromEntries(allowed.map((key) => [key, doctor[key]]));
  const updates = {};
  for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key];
  Object.assign(doctor, updates);
  await doctor.save();
  await writeAuditLog({ req, action: 'doctor_revenue_model_updated', module: 'Doctor', recordId: doctor._id, previousValue, newValue: updates, reason: req.body.reason });
  res.json({ message: 'Revenue model updated', doctor });
});

const getFeeShares = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.doctor) filter.doctor = req.query.doctor;
  const [items, total, summaryRows, reversalRows] = await Promise.all([
    FeeShare.find(filter)
      .populate('doctor', 'doctorId fullName clinicName revenueModel')
      .populate('patient', 'patientId fullName mobile')
      .populate('payment', 'invoiceNumber paidAmount refundAmount doctorFeeShare platformShare status verifiedAt gatewayTransactionId')
      .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    FeeShare.countDocuments(filter),
    FeeShare.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } }]),
    Refund.aggregate([{ $group: { _id: null, amount: { $sum: { $ifNull: ['$feeShareReversal', 0] } } } }]),
  ]);
  const byStatus = Object.fromEntries(summaryRows.map((row) => [row._id, row]));
  const totalAmount = summaryRows.reduce((sum,row)=>sum+row.amount,0);
  res.json({ items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }, summary: { total: summaryRows.reduce((sum,row)=>sum+row.count,0), totalAmount, pendingAmount: (byStatus.pending?.amount||0)+(byStatus.on_hold?.amount||0)+(byStatus.estimated?.amount||0), availableAmount: byStatus.available?.amount||0, paidAmount: byStatus.paid?.amount||0, reversedAmount: reversalRows[0]?.amount||0 } });
});

const getFeeShareById = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid fee share id' });
  const feeShare = await FeeShare.findById(req.params.id)
    .populate('doctor', 'doctorId fullName clinicName revenueModel feeShareType feeSharePercentage fixedFeeShareAmount feeShareCalculationBasis feeShareHoldingDays')
    .populate('patient', 'patientId fullName mobile')
    .populate('payment', 'invoiceNumber paidAmount refundAmount doctorFeeShare platformShare status verifiedAt gatewayTransactionId createdAt')
    .lean();
  if (!feeShare) return res.status(404).json({ message: 'Fee share not found' });
  const refunds = feeShare.payment?._id ? await Refund.find({ payment: feeShare.payment._id }).select('refundType refundAmount feeShareReversal feeShareAlreadyWithdrawn status reason createdAt').sort({ createdAt: -1 }).lean() : [];
  const payment = feeShare.payment;
  const paymentWasVerified = Boolean(payment?.verifiedAt) || VERIFIED_PAYMENT_STATUSES.includes(payment?.status) || HISTORICALLY_VERIFIED_STATUSES.includes(payment?.status);
  res.json({ feeShare, refunds, integrity: { paymentSuccessful: paymentWasVerified, holdingComplete: Boolean(feeShare.availableDate && new Date(feeShare.availableDate) <= new Date()), reversedAmount: refunds.reduce((sum,r)=>sum+(r.feeShareReversal||0),0) } });
});

module.exports = { getRevenueModels, updateRevenueModel, getFeeShares, getFeeShareById };