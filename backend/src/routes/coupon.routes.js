const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { requireFields, validateEnum, validateNumberRange, validateSchema } = require('../middlewares/validate.middleware');
const { validateCoupon } = require('../controllers/coupon.controller');
const { createCoupon, getCoupons, updateCoupon } = require('../controllers/admin/coupons.controller');

router.use(protect);

router.post(
  '/',
  authorize('admin'),
  validateSchema({ body: {
    couponCode:{type:'string',max:80,required:true},
    discountType:{type:'enum',values:['fixed','percentage'],required:true},
    discountValue:{type:'number',min:0,required:true},
    maxDiscount:{type:'number',min:0},
    minPaymentAmount:{type:'number',min:0},
    usageLimit:{type:'number',min:0},
    usageLimitPerPatient:{type:'number',min:1},
    feeShareCalculatedAfterDiscount:{type:'boolean'},
    isActive:{type:'boolean'},
    reason:{type:'string',max:500},
  } }),
  createCoupon
);
router.get('/', authorize('admin'), getCoupons);
router.put('/:id', authorize('admin'), validateSchema({ params:{id:{type:'objectId',required:true}}, body:{
  couponCode:{type:'string',max:80},
  discountType:{type:'enum',values:['fixed','percentage']},
  discountValue:{type:'number',min:0},
  maxDiscount:{type:'number',min:0},
  minPaymentAmount:{type:'number',min:0},
  usageLimit:{type:'number',min:0},
  usageLimitPerPatient:{type:'number',min:1},
  feeShareCalculatedAfterDiscount:{type:'boolean'},
  isActive:{type:'boolean'},
  reason:{type:'string',max:500},
} }), updateCoupon);

router.post('/validate', requireFields('couponCode', 'amount'), validateEnum('discountType', ['fixed', 'percentage']), validateNumberRange('amount', { min: 0 }), validateCoupon);

module.exports = router;
