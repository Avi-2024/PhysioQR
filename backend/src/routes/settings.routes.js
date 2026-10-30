const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { getSettings, updateSettings } = require('../controllers/settings.controller');
const { resolveDirectPatientFee } = require('../services/directPatientPricing.service');
const asyncHandler = require('../utils/asyncHandler');

// Public read-only display price; never used as payment authority. Patient-
// specific overrides are resolved by the authenticated checkout endpoints.
router.get('/direct-registration-fee', asyncHandler(async (_req, res) => {
  const price = await resolveDirectPatientFee({ referralSource: 'direct', referringDoctor: null });
  res.set('Cache-Control', 'no-store');
  res.json({ amount: price.amount, currency: 'INR', source: price.source });
}));

router.use(protect, authorize('admin'));

router.get('/', getSettings);
router.put('/', updateSettings);

module.exports = router;
