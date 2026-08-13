const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { requireFields, validateEnum, validateNumberRange } = require('../middlewares/validate.middleware');
const {
  createCoupon,
  getCoupons,
  updateCoupon,
  validateCoupon,
} = require('../controllers/coupon.controller');

router.use(protect);

router.post(
  '/',
  authorize('admin'),
  requireFields('couponCode', 'discountType', 'discountValue'),
  validateEnum('discountType', ['fixed', 'percentage']),
  validateNumberRange('discountValue', { min: 0 }),
  validateNumberRange('maxDiscount', { min: 0 }),
  validateNumberRange('minPaymentAmount', { min: 0 }),
  createCoupon
);
router.get('/', authorize('admin'), getCoupons);
router.put('/:id', authorize('admin'), updateCoupon);

router.post('/validate', requireFields('couponCode', 'amount'), validateNumberRange('amount', { min: 0 }), validateCoupon);

module.exports = router;
