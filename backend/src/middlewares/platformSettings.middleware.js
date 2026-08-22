const AppSetting = require('../models/AppSetting.model');

const CACHE_TTL_MS = 30 * 1000;
let cachedPlatformSettings = null;
let cacheExpiresAt = 0;

const getPlatformSettings = async () => {
  const now = Date.now();
  if (cachedPlatformSettings && now < cacheExpiresAt) return cachedPlatformSettings;

  const record = await AppSetting.findOne({ key: 'platform' }).select('value').lean();
  cachedPlatformSettings = {
    maintenanceMode: Boolean(record?.value?.maintenanceMode),
    supportEmail: record?.value?.supportEmail || '',
    supportPhone: record?.value?.supportPhone || '',
  };
  cacheExpiresAt = now + CACHE_TTL_MS;
  return cachedPlatformSettings;
};

const invalidatePlatformSettingsCache = () => {
  cachedPlatformSettings = null;
  cacheExpiresAt = 0;
};

const maintenanceModeGuard = async (req, res, next) => {
  try {
    const bypass =
      req.path === '/health' ||
      req.path.startsWith('/api/admin') ||
      req.path.startsWith('/api/auth') ||
      req.path === '/api/payments/webhook/razorpay';

    if (bypass) return next();

    const settings = await getPlatformSettings();
    if (!settings.maintenanceMode) return next();

    res.setHeader('Retry-After', '60');
    return res.status(503).json({
      message: 'PhysioQR is temporarily under maintenance. Please try again shortly.',
      maintenanceMode: true,
      supportEmail: settings.supportEmail || undefined,
      supportPhone: settings.supportPhone || undefined,
      requestId: req.id,
    });
  } catch (error) {
    // A settings lookup failure must not take the whole platform offline.
    return next(error);
  }
};

module.exports = {
  maintenanceModeGuard,
  invalidatePlatformSettingsCache,
};
