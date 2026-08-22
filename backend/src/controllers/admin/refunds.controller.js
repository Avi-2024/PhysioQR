const mongoose = require('mongoose');
const Refund = require('../../models/Refund.model');
const { getPagination } = require('../../utils/queryHelpers');
const asyncHandler = require('../../utils/asyncHandler');

const buildFilter = (query = {}) => {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.refundType) filter.refundType = query.refundType;
  if (query.doctor) filter.doctor = query.doctor;
  if (query.patient) filter.patient = query.patient;
  if (query.payment && mongoose.isValidObjectId(query.payment)) filter.payment = query.payment;
  return filter;
};

const getRefunds = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = buildFilter(req.query);
  const search = String(req.query.search || '').trim();

  let ids = null;
  if (search) {
    const searchable = await Refund.find(filter)
      .populate('payment', 'invoiceNumber gatewayTransactionId')
      .populate('patient', 'patientId fullName mobile')
      .populate('doctor', 'doctorId fullName clinicName')
      .populate('order', 'orderId gatewayOrderId')
      .lean();
    const needle = search.toLowerCase();
    ids = searchable.filter((refund) => [
      refund.gatewayRefundId,
      refund.reason,
      refund.rejectionReason,
      refund.payment?.invoiceNumber,
      refund.payment?.gatewayTransactionId,
      refund.patient?.patientId,
      refund.patient?.fullName,
      refund.patient?.mobile,
      refund.doctor?.doctorId,
      refund.doctor?.fullName,
      refund.order?.orderId,
      refund.order?.gatewayOrderId,
    ].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle))).map((item) => item._id);
  }

  const finalFilter = ids ? { ...filter, _id: { $in: ids } } : filter;
  const [items, total, summaryRows] = await Promise.all([
    Refund.find(finalFilter)
      .populate('payment', 'invoiceNumber gatewayTransactionId paidAmount refundAmount status')
      .populate('patient', 'patientId fullName mobile')
      .populate('doctor', 'doctorId fullName clinicName')
      .populate('order', 'orderId finalAmount status')
      .populate('processedBy', 'email mobile role')
      .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Refund.countDocuments(finalFilter),
    Refund.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: { $ifNull: ['$refundAmount', 0] } }, feeShareReversal: { $sum: { $ifNull: ['$feeShareReversal', 0] } } } },
    ]),
  ]);

  const byStatus = Object.fromEntries(summaryRows.map((row) => [row._id, row]));
  res.json({
    items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    summary: {
      total: summaryRows.reduce((sum, row) => sum + row.count, 0),
      requested: byStatus.requested?.count || 0,
      processing: (byStatus.approved?.count || 0) + (byStatus.processing?.count || 0),
      completed: byStatus.completed?.count || 0,
      completedAmount: byStatus.completed?.amount || 0,
      rejectedOrFailed: (byStatus.rejected?.count || 0) + (byStatus.failed?.count || 0),
      feeShareReversal: summaryRows.reduce((sum, row) => sum + row.feeShareReversal, 0),
    },
  });
});

const getRefundById = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid refund id' });
  const refund = await Refund.findById(req.params.id)
    .populate({ path: 'payment', select: 'invoiceNumber gatewayTransactionId gatewayOrderId paymentMethod paidAmount refundAmount doctorFeeShare platformShare status verifiedAt createdAt program', populate: { path: 'program', select: 'programCode name' } })
    .populate('patient', 'patientId fullName mobile email city state referralLocked')
    .populate('doctor', 'doctorId fullName clinicName city revenueModel')
    .populate('order', 'orderId originalAmount discountAmount taxAmount gatewayCharges finalAmount currency couponCode status paidAt createdAt')
    .populate('processedBy', 'email mobile role')
    .lean();
  if (!refund) return res.status(404).json({ message: 'Refund not found' });

  res.json({
    refund,
    integrity: {
      paymentWasVerified: ['successful', 'manually_verified', 'refunded', 'partially_refunded'].includes(refund.payment?.status),
      completed: refund.status === 'completed',
      feeShareReversalRecorded: Number(refund.feeShareReversal || 0) > 0,
      feeShareAlreadyWithdrawn: Boolean(refund.feeShareAlreadyWithdrawn),
    },
  });
});

module.exports = { getRefunds, getRefundById };
