const mongoose = require('mongoose');
const { Order, Payment } = require('../../models/Payment.model');
const PatientProgram = require('../../models/PatientProgram.model');
const asyncHandler = require('../../utils/asyncHandler');

const VERIFIED_PAYMENT_STATUSES = ['successful', 'manually_verified'];
const escapeRegex = (value) => String(value ?? '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parsePagination = (query = {}) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

const buildOrderFilter = (query = {}) => {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.doctor && mongoose.isValidObjectId(query.doctor)) filter.doctor = query.doctor;
  if (query.patient && mongoose.isValidObjectId(query.patient)) filter.patient = query.patient;
  if (query.program && mongoose.isValidObjectId(query.program)) filter.program = query.program;
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [
      { orderId: regex },
      { gatewayOrderId: regex },
      { gatewayReceipt: regex },
      { couponCode: regex },
    ];
  }
  return filter;
};

const getOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = buildOrderFilter(req.query);
  const sortField = ['createdAt', 'updatedAt', 'finalAmount', 'status', 'paidAt'].includes(req.query.sortBy) ? req.query.sortBy : 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  const [orders, total, summaryRows, totalCollectedRows] = await Promise.all([
    Order.find(filter)
      .populate('patient', 'patientId fullName mobile city status referralLocked')
      .populate('doctor', 'doctorId fullName clinicName city status')
      .populate('agent', 'agentId fullName assignedRegion')
      .populate('program', 'programCode name durationDays defaultPrice isActive')
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { status: { $in: VERIFIED_PAYMENT_STATUSES } } },
      { $group: { _id: null, total: { $sum: '$finalAmount' } } },
    ]),
  ]);

  const orderIds = orders.map((order) => order._id);
  const payments = orderIds.length ? await Payment.find({ order: { $in: orderIds } })
    .select('order status paidAmount invoiceNumber gatewayTransactionId verifiedAt createdAt')
    .sort({ createdAt: -1 })
    .lean() : [];

  const paymentIds = payments.map((payment) => payment._id);
  const enrollments = paymentIds.length ? await PatientProgram.find({ payment: { $in: paymentIds } })
    .select('payment status startDate expiryDate currentDay completionPercentage')
    .lean() : [];

  const paymentsByOrder = new Map();
  for (const payment of payments) {
    const key = String(payment.order);
    const list = paymentsByOrder.get(key) || [];
    list.push(payment);
    paymentsByOrder.set(key, list);
  }
  const enrollmentByPayment = new Map(enrollments.map((item) => [String(item.payment), item]));

  const items = orders.map((order) => {
    const attempts = paymentsByOrder.get(String(order._id)) || [];
    const verifiedPayment = attempts.find((payment) => VERIFIED_PAYMENT_STATUSES.includes(payment.status));
    const enrollment = verifiedPayment ? enrollmentByPayment.get(String(verifiedPayment._id)) : undefined;
    return {
      ...order,
      id: order.orderId || order._id,
      payment: {
        attempts: attempts.length,
        latestStatus: attempts[0]?.status || null,
        latestPaymentId: attempts[0]?._id || null,
        verifiedPaymentId: verifiedPayment?._id || null,
        invoiceNumber: verifiedPayment?.invoiceNumber || null,
      },
      activation: enrollment ? {
        status: enrollment.status,
        startDate: enrollment.startDate,
        expiryDate: enrollment.expiryDate,
        currentDay: enrollment.currentDay,
        completionPercentage: enrollment.completionPercentage,
      } : null,
    };
  });

  const summaryMap = Object.fromEntries(summaryRows.map((row) => [row._id, row.count]));
  const paid = (summaryMap.successful || 0) + (summaryMap.manually_verified || 0);
  const pending = (summaryMap.created || 0) + (summaryMap.pending || 0);
  const failed = (summaryMap.failed || 0) + (summaryMap.cancelled || 0);
  const refunded = (summaryMap.refunded || 0) + (summaryMap.partially_refunded || 0);

  res.json({
    items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    summary: {
      total: Object.values(summaryMap).reduce((sum, value) => sum + value, 0),
      paid,
      pending,
      failed,
      refunded,
      totalCollected: totalCollectedRows[0]?.total || 0,
    },
  });
});

const getOrderById = asyncHandler(async (req, res) => {
  const identifier = String(req.params.id || '').trim();
  const lookup = mongoose.isValidObjectId(identifier)
    ? { $or: [{ _id: identifier }, { orderId: identifier }] }
    : { orderId: identifier };

  const order = await Order.findOne(lookup)
    .populate('patient', 'patientId fullName mobile email city state status referralLocked referringDoctor')
    .populate('doctor', 'doctorId fullName clinicName city state status revenueModel approvedPatientFee')
    .populate('agent', 'agentId fullName assignedRegion')
    .populate('program', 'programCode name painCategory durationDays sessionsPerDay defaultPrice isActive')
    .lean();

  if (!order) return res.status(404).json({ message: 'Order not found' });

  const payments = await Payment.find({ order: order._id })
    .select('-rawGatewayPayload -gatewaySignature')
    .sort({ createdAt: -1 })
    .lean();

  const paymentIds = payments.map((payment) => payment._id);
  const enrollment = paymentIds.length ? await PatientProgram.findOne({ payment: { $in: paymentIds } })
    .populate('payment', 'invoiceNumber paidAmount status gatewayTransactionId verifiedAt')
    .select('patient program doctor payment startDate expiryDate currentDay completionPercentage status unlockMethod pauseCount pausedAt pauseReason createdAt updatedAt')
    .lean() : null;

  const verifiedPayment = payments.find((payment) => VERIFIED_PAYMENT_STATUSES.includes(payment.status));

  res.json({
    order: { ...order, id: order.orderId || order._id },
    payments,
    verifiedPayment: verifiedPayment || null,
    activation: enrollment || null,
    integrity: {
      paymentVerified: Boolean(verifiedPayment),
      programActivated: Boolean(enrollment && ['active', 'paused', 'completed', 'expired'].includes(enrollment.status)),
      paymentAttemptCount: payments.length,
    },
  });
});

module.exports = { getOrders, getOrderById };
