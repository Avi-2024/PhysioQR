const mongoose = require('mongoose');
const Coupon = require('../../models/Coupon.model');
const { getPagination } = require('../../utils/queryHelpers');
const { writeAuditLog } = require('../../utils/auditLogger');
const asyncHandler = require('../../utils/asyncHandler');

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizePayload = (body = {}, { partial = false } = {}) => {
  const payload = {};
  if (!partial || body.couponCode !== undefined) payload.couponCode = String(body.couponCode || '').trim().toUpperCase();
  if (!partial || body.discountType !== undefined) payload.discountType = body.discountType;
  if (!partial || body.discountValue !== undefined) payload.discountValue = body.discountValue === '' ? undefined : Number(body.discountValue);
  ['maxDiscount', 'minPaymentAmount', 'usageLimit', 'usageLimitPerPatient'].forEach((key) => {
    if (body[key] !== undefined) payload[key] = body[key] === '' || body[key] === null ? undefined : Number(body[key]);
  });
  ['startDate', 'expiryDate'].forEach((key) => {
    if (body[key] !== undefined) payload[key] = body[key] ? new Date(body[key]) : null;
  });
  if (body.feeShareCalculatedAfterDiscount !== undefined) payload.feeShareCalculatedAfterDiscount = Boolean(body.feeShareCalculatedAfterDiscount);
  if (body.isActive !== undefined) payload.isActive = Boolean(body.isActive);
  return payload;
};

const validatePayload = async (payload, { partial = false, couponId = null } = {}) => {
  if (!partial && !payload.couponCode) return 'Coupon code is required';
  if (payload.couponCode !== undefined && !payload.couponCode) return 'Coupon code is required';
  if (payload.discountType !== undefined && !['fixed', 'percentage'].includes(payload.discountType)) return 'Discount type must be fixed or percentage';
  if (!partial && !['fixed', 'percentage'].includes(payload.discountType)) return 'Discount type is required';
  if (!partial && !Number.isFinite(payload.discountValue)) return 'Discount value is required';
  if (payload.discountValue !== undefined && (!Number.isFinite(payload.discountValue) || payload.discountValue < 0)) return 'Discount value must be zero or greater';
  if (payload.discountType === 'percentage' && payload.discountValue > 100) return 'Percentage discount cannot exceed 100';

  for (const key of ['maxDiscount', 'minPaymentAmount', 'usageLimit', 'usageLimitPerPatient']) {
    if (payload[key] !== undefined && (!Number.isFinite(payload[key]) || payload[key] < 0)) return `${key} must be zero or greater`;
  }
  if (payload.usageLimitPerPatient !== undefined && payload.usageLimitPerPatient < 1) return 'Usage limit per patient must be at least 1';
  if (payload.startDate && Number.isNaN(payload.startDate.getTime())) return 'Invalid start date';
  if (payload.expiryDate && Number.isNaN(payload.expiryDate.getTime())) return 'Invalid expiry date';
  if (payload.startDate && payload.expiryDate && payload.expiryDate < payload.startDate) return 'Expiry date must be after start date';

  if (payload.couponCode) {
    const duplicate = { couponCode: payload.couponCode };
    if (couponId) duplicate._id = { $ne: couponId };
    if (await Coupon.exists(duplicate)) return 'Coupon code already exists';
  }
  return null;
};

const getCoupons = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  const now = new Date();
  const search = String(req.query.search || '').trim();
  if (search) filter.couponCode = { $regex: escapeRegex(search), $options: 'i' };
  if (req.query.status === 'active') filter.isActive = true;
  if (req.query.status === 'inactive') filter.isActive = false;
  if (req.query.lifecycle === 'expired') filter.expiryDate = { $lt: now };
  if (req.query.lifecycle === 'scheduled') filter.startDate = { $gt: now };
  if (req.query.lifecycle === 'live') {
    filter.isActive = true;
    filter.$and = [
      { $or: [{ startDate: null }, { startDate: { $exists: false } }, { startDate: { $lte: now } }] },
      { $or: [{ expiryDate: null }, { expiryDate: { $exists: false } }, { expiryDate: { $gte: now } }] },
    ];
  }

  const [items, total, summaryRows] = await Promise.all([
    Coupon.find(filter)
      .populate('createdBy', 'email mobile role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Coupon.countDocuments(filter),
    Coupon.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } },
          inactive: { $sum: { $cond: ['$isActive', 0, 1] } },
          expired: { $sum: { $cond: [{ $and: [{ $ne: ['$expiryDate', null] }, { $lt: ['$expiryDate', now] }] }, 1, 0] } },
          scheduled: { $sum: { $cond: [{ $and: [{ $ne: ['$startDate', null] }, { $gt: ['$startDate', now] }] }, 1, 0] } },
          redemptions: { $sum: { $ifNull: ['$usedCount', 0] } },
        },
      },
    ]),
  ]);

  res.json({
    items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    summary: summaryRows[0] || { total: 0, active: 0, inactive: 0, expired: 0, scheduled: 0, redemptions: 0 },
  });
});

const createCoupon = asyncHandler(async (req, res) => {
  const payload = normalizePayload(req.body);
  const error = await validatePayload(payload);
  if (error) return res.status(400).json({ message: error });
  const coupon = await Coupon.create({ ...payload, createdBy: req.user._id });
  await writeAuditLog({ req, action: 'coupon_created', module: 'Coupon', recordId: coupon._id, newValue: coupon.toObject(), reason: req.body.reason });
  res.status(201).json(coupon);
});

const updateCoupon = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid coupon id' });
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
  const payload = normalizePayload(req.body, { partial: true });
  const effective = {
    discountType: payload.discountType ?? coupon.discountType,
    discountValue: payload.discountValue ?? coupon.discountValue,
    startDate: payload.startDate !== undefined ? payload.startDate : coupon.startDate,
    expiryDate: payload.expiryDate !== undefined ? payload.expiryDate : coupon.expiryDate,
    ...payload,
  };
  const error = await validatePayload(effective, { partial: true, couponId: coupon._id });
  if (error) return res.status(400).json({ message: error });
  const previousValue = coupon.toObject();
  Object.assign(coupon, payload);
  await coupon.save();
  await writeAuditLog({ req, action: 'coupon_updated', module: 'Coupon', recordId: coupon._id, previousValue, newValue: payload, reason: req.body.reason });
  res.json(coupon);
});

module.exports = { getCoupons, createCoupon, updateCoupon };
