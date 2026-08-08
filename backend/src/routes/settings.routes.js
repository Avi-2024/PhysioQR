const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const SystemSettings = require('../models/SystemSettings.model');
const asyncHandler = require('../utils/asyncHandler');
const { writeAuditLog } = require('../utils/auditLogger');

router.use(protect, authorize('admin'));

// GET /api/settings — Get current settings (singleton)
router.get('/', asyncHandler(async (req, res) => {
  let settings = await SystemSettings.findOne();
  if (!settings) settings = await SystemSettings.create({});
  res.json(settings);
}));

// PUT /api/settings — Update settings
router.put('/', asyncHandler(async (req, res) => {
  let settings = await SystemSettings.findOne();
  const prev = settings ? settings.toObject() : {};

  if (!settings) {
    settings = await SystemSettings.create(req.body);
  } else {
    Object.assign(settings, req.body);
    await settings.save();
  }

  await writeAuditLog({
    req,
    action: 'system_setting_changed',
    module: 'SystemSettings',
    recordId: settings._id,
    previousValue: prev,
    newValue: req.body,
  });

  res.json(settings);
}));

module.exports = router;
