const mongoose = require('mongoose');
const { Payment } = require('../../models/Payment.model');
const PatientProgram = require('../../models/PatientProgram.model');
const Refund = require('../../models/Refund.model');
const { getPagination } = require('../../utils/queryHelpers');
const asyncHandler = require('../../utils/asyncHandler');

const VERIFIED = ['successful', 'manually_verified'];
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SAFE_PAYMENT_SELECT = '-gatewaySignature -rawGatewayPayload';

const buildFilter = (query = {}) => {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.doctor) filter.doctor = query.doctor;
  if (query.patient) filter.patient = query.patient;
  if (query.program) filter.program = query.program;
  if (query.search) {
    const value = escapeRegex(String(query.search).trim());
    if (value) {
      filter.$or = [
        { invoiceNumber: { $regex: value, $options: 'i' } },
        { gatewayTransactionId: { $regex: value, $options: 'i' } },
        { gatewayOrderId: { $regex: value, $options: 'i' } },
      ];
    }
  }
  return filter;
};

const getPayments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = buildFilter(req.query);
  const [items, total, summaryRows] = await Promise.all([
    Payment.find(filter)
      .select(SAFE_PAYMENT_SELECT)
      .populate('patient', 'patientId fullName mobile city referralLocked')
      .populate('doctor', 'doctorId fullName clinicName')
      .populate('agent', 'agentId fullName')
      .populate('program', 'programCode name')
      .populate('order', 'orderId finalAmount status')
      .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Payment.countDocuments(filter),
    Payment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: { $ifNull: ['$paidAmount', 0] } }, refunds: { $sum: { $ifNull: ['$refundAmount', 0] } } } }]),
  ]);
  const byStatus = Object.fromEntries(summaryRows.map((row) => [row._id, row]));
  const verifiedCount = VERIFIED.reduce((sum, status) => sum + (byStatus[status]?.count || 0), 0);
  const verifiedAmount = VERIFIED.reduce((sum, status) => sum + (byStatus[status]?.amount || 0), 0);
  res.json({ items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) }, summary: { total: summaryRows.reduce((s,r)=>s+r.count,0), verified: verifiedCount, verifiedAmount, failed: byStatus.failed?.count || 0, refunded: (byStatus.refunded?.count || 0) + (byStatus.partially_refunded?.count || 0), refundAmount: summaryRows.reduce((s,r)=>s+r.refunds,0) } });
});

const getPaymentById = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid payment id' });
  const payment = await Payment.findById(req.params.id)
    .select(SAFE_PAYMENT_SELECT)
    .populate('patient', 'patientId fullName mobile email city state referralLocked referringDoctor')
    .populate('doctor', 'doctorId fullName clinicName city revenueModel')
    .populate('agent', 'agentId fullName assignedRegion')
    .populate('program', 'programCode name durationDays sessionsPerDay')
    .populate('order', 'orderId originalAmount discountAmount taxAmount gatewayCharges finalAmount currency couponCode status paidAt createdAt')
    .lean();
  if (!payment) return res.status(404).json({ message: 'Payment not found' });
  const [patientProgram, refunds] = await Promise.all([
    PatientProgram.findOne({ payment: payment._id }).select('status startDate expiryDate currentDay completionPercentage unlockMethod').lean(),
    Refund.find({ payment: payment._id }).sort({ createdAt: -1 }).lean(),
  ]);
  res.json({ payment, patientProgram, refunds, integrity: { paymentVerified: VERIFIED.includes(payment.status), programActivated: patientProgram?.status === 'active', referralLocked: Boolean(payment.patient?.referralLocked) } });
});

module.exports = { getPayments, getPaymentById };
