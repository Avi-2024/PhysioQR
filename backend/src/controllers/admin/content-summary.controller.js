const PainCategory = require('../../models/PainCategory.model');
const Program = require('../../models/Program.model');
const { Exercise } = require('../../models/Exercise.model');
const Coupon = require('../../models/Coupon.model');
const Refund = require('../../models/Refund.model');
const asyncHandler = require('../../utils/asyncHandler');

const getContentSummary = asyncHandler(async (_req, res) => {
  const [
    painCategories,
    activePainCategories,
    programs,
    activePrograms,
    exercises,
    activeExercises,
    coupons,
    activeCoupons,
    refunds,
  ] = await Promise.all([
    PainCategory.countDocuments(),
    PainCategory.countDocuments({ isActive: true }),
    Program.countDocuments(),
    Program.countDocuments({ isActive: true }),
    Exercise.countDocuments(),
    Exercise.countDocuments({ isActive: true }),
    Coupon.countDocuments(),
    Coupon.countDocuments({ isActive: true }),
    Refund.countDocuments(),
  ]);

  res.json({
    painCategories,
    activePainCategories,
    programs,
    activePrograms,
    exercises,
    activeExercises,
    coupons,
    activeCoupons,
    refunds,
  });
});

module.exports = { getContentSummary };
