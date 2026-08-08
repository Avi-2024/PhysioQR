const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const Coupon = require('../models/Coupon.model');
const asyncHandler = require('../utils/asyncHandler');

router.use(protect);

// Admin creates a coupon
router.post('/', authorize('admin'), asyncHandler(async (req, res) => {
  const coupon = await Coupon.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json(coupon);
}));

// Admin views all coupons
router.get('/', authorize('admin'), asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.json(coupons);
}));

// Admin updates a coupon
router.put('/:id', authorize('admin'), asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
  res.json(coupon);
}));

// Validate a coupon code (patient uses this before payment)
router.post('/validate', asyncHandler(async (req, res) => {
  const { couponCode, doctorId, programId, amount } = req.body;
  const coupon = await Coupon.findOne({ couponCode: couponCode?.toUpperCase(), isActive: true });

  if (!coupon) return res.status(404).json({ message: 'Invalid coupon code' });
  if (coupon.expiryDate && coupon.expiryDate < new Date()) return res.status(400).json({ message: 'Coupon has expired' });
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return res.status(400).json({ message: 'Coupon usage limit reached' });
  if (coupon.minPaymentAmount && amount < coupon.minPaymentAmount) return res.status(400).json({ message: `Minimum order amount is ₹${coupon.minPaymentAmount}` });

  let discountAmount = 0;
  if (coupon.discountType === 'fixed') {
    discountAmount = Math.min(coupon.discountValue, amount);
  } else {
    discountAmount = Math.min((amount * coupon.discountValue) / 100, coupon.maxDiscount || Infinity);
  }

  res.json({ valid: true, discountAmount, finalAmount: amount - discountAmount });
}));

module.exports = router;
