const mongoose = require('mongoose');

// SRS §23 — Coupon and Discount Management
const couponSchema = new mongoose.Schema({
  couponCode: { type: String, required: true, unique: true, uppercase: true },
  discountType: { type: String, enum: ['fixed', 'percentage'], required: true },
  discountValue: { type: Number, required: true },
  maxDiscount: Number,          // cap for percentage coupons
  minPaymentAmount: Number,     // minimum order value to apply coupon
  startDate: Date,
  expiryDate: Date,
  usageLimit: Number,           // total uses allowed
  usageLimitPerPatient: { type: Number, default: 1 },
  usedCount: { type: Number, default: 0 },
  eligibleDoctors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' }],
  eligiblePrograms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Program' }],

  // SRS: Admin must define whether fee share is calculated before or after discount
  feeShareCalculatedAfterDiscount: { type: Boolean, default: true },

  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);
