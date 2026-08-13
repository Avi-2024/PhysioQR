const SystemSettings = require('../models/SystemSettings.model');
const { writeAuditLog } = require('../utils/auditLogger');
const asyncHandler = require('../utils/asyncHandler');

const getSettings = asyncHandler(async (req, res) => {
  let settings = await SystemSettings.findOne();
  if (!settings) settings = await SystemSettings.create({});
  res.json(settings);
});

const updateSettings = asyncHandler(async (req, res) => {
  let settings = await SystemSettings.findOne();
  const previousValue = settings ? settings.toObject() : {};

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
    previousValue,
    newValue: req.body,
  });

  res.json(settings);
});

module.exports = {
  getSettings,
  updateSettings,
};
