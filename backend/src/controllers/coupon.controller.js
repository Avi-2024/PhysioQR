const Coupon = require('../models/Coupon.model');
const asyncHandler = require('../utils/asyncHandler');

const createCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json(coupon);
});

const getCoupons = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status === 'active') filter.isActive = true;
  if (req.query.status === 'inactive') filter.isActive = false;
  res.json(await Coupon.find(filter).sort({ createdAt: -1 }));
});

const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
  res.json(coupon);
});

const validateCoupon = asyncHandler(async (req, res) => {
  const { couponCode, doctorId, programId, amount } = req.body;
  const coupon = await Coupon.findOne({ couponCode: couponCode?.toUpperCase(), isActive: true });

  if (!coupon) return res.status(404).json({ message: 'Invalid coupon code' });
  if (coupon.startDate && coupon.startDate > new Date()) return res.status(400).json({ message: 'Coupon is not active yet' });
  if (coupon.expiryDate && coupon.expiryDate < new Date()) return res.status(400).json({ message: 'Coupon has expired' });
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return res.status(400).json({ message: 'Coupon usage limit reached' });
  if (coupon.minPaymentAmount && amount < coupon.minPaymentAmount) return res.status(400).json({ message: `Minimum order amount is ₹${coupon.minPaymentAmount}` });

  if (coupon.eligibleDoctors?.length && !coupon.eligibleDoctors.some((id) => id.toString() === doctorId)) {
    return res.status(400).json({ message: 'Coupon is not valid for this doctor' });
  }
  if (coupon.eligiblePrograms?.length && !coupon.eligiblePrograms.some((id) => id.toString() === programId)) {
    return res.status(400).json({ message: 'Coupon is not valid for this program' });
  }

  const discountAmount = coupon.discountType === 'fixed'
    ? Math.min(coupon.discountValue, amount)
    : Math.min((amount * coupon.discountValue) / 100, coupon.maxDiscount || Infinity);

  res.json({
    valid: true,
    couponId: coupon._id,
    couponCode: coupon.couponCode,
    discountAmount,
    finalAmount: Math.max(amount - discountAmount, 0),
    feeShareCalculatedAfterDiscount: coupon.feeShareCalculatedAfterDiscount,
  });
});

module.exports = {
  createCoupon,
  getCoupons,
  updateCoupon,
  validateCoupon,
};
