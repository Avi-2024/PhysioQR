const AppSetting = require('../../models/AppSetting.model');
const asyncHandler = require('../../utils/asyncHandler');
const { writeAuditLog } = require('../../utils/auditLogger');
const { invalidatePlatformSettingsCache } = require('../../middlewares/platformSettings.middleware');

const DEFAULTS = {
  platform: {
    supportEmail: '',
    supportPhone: '',
    maintenanceMode: false,
  },
  patient: {
    assessmentRequired: true,
    redFlagReviewRequired: true,
  },
  finance: {
    currency: 'INR',
    refundsEnabled: true,
    withdrawalsEnabled: true,
  },
  notifications: {
    inAppEnabled: true,
    webPushEnabled: true,
    emailEnabled: true,
    smsEnabled: true,
    whatsappEnabled: true,
  },
};

const ALLOWED_SECTIONS = Object.keys(DEFAULTS);

const mergeDefaults = (records) => {
  const output = JSON.parse(JSON.stringify(DEFAULTS));
  records.forEach((record) => {
    if (output[record.key] && record.value && typeof record.value === 'object') {
      output[record.key] = { ...output[record.key], ...record.value };
    }
  });
  return output;
};

const getSettings = asyncHandler(async (req, res) => {
  const records = await AppSetting.find({ key: { $in: ALLOWED_SECTIONS } })
    .populate('updatedBy', 'email mobile role')
    .lean();

  const settings = mergeDefaults(records);
  const metadata = Object.fromEntries(records.map((record) => [record.key, {
    updatedAt: record.updatedAt,
    updatedBy: record.updatedBy || null,
  }]));

  res.json({ settings, metadata });
});

const updateSettingsSection = asyncHandler(async (req, res) => {
  const { section } = req.params;
  if (!ALLOWED_SECTIONS.includes(section)) {
    return res.status(404).json({ message: 'Settings section not found' });
  }

  const allowedKeys = Object.keys(DEFAULTS[section]);
  const updates = {};
  allowedKeys.forEach((key) => {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  });

  if (!Object.keys(updates).length) {
    return res.status(400).json({ message: 'No supported settings supplied' });
  }

  const existing = await AppSetting.findOne({ key: section }).lean();
  const previousValue = existing?.value || DEFAULTS[section];
  const nextValue = { ...DEFAULTS[section], ...previousValue, ...updates };

  const record = await AppSetting.findOneAndUpdate(
    { key: section },
    { $set: { value: nextValue, updatedBy: req.user._id } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).populate('updatedBy', 'email mobile role');

  if (section === 'platform') invalidatePlatformSettingsCache();

  await writeAuditLog({
    req,
    action: 'app_settings_updated',
    module: 'AppSetting',
    recordId: record._id,
    previousValue,
    newValue: nextValue,
    reason: req.body.reason,
    metadata: { section },
  });

  res.json({ message: 'Settings updated', section, value: record.value, updatedAt: record.updatedAt, updatedBy: record.updatedBy });
});

module.exports = { getSettings, updateSettingsSection };
