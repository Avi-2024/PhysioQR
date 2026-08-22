const AppSetting = require('../models/AppSetting.model');

const CACHE_TTL_MS = 30 * 1000;
const DEFAULTS = {
  paymentsEnabled: true,
  refundsEnabled: true,
  withdrawalsEnabled: true,
};

let cachedFinanceSettings = null;
let cacheExpiresAt = 0;

const getFinanceSettings = async () => {
  const now = Date.now();
  if (cachedFinanceSettings && now < cacheExpiresAt) return cachedFinanceSettings;

  const record = await AppSetting.findOne({ key: 'finance' }).select('value').lean();
  cachedFinanceSettings = {
    ...DEFAULTS,
    ...(record?.value || {}),
  };
  cacheExpiresAt = now + CACHE_TTL_MS;
  return cachedFinanceSettings;
};

const invalidateFinanceSettingsCache = () => {
  cachedFinanceSettings = null;
  cacheExpiresAt = 0;
};

const requireFinanceFeature = (featureKey, message) => async (req, res, next) => {
  try {
    const settings = await getFinanceSettings();
    if (settings[featureKey] !== false) return next();

    return res.status(503).json({
      message,
      featureDisabled: featureKey,
      requestId: req.id,
    });
  } catch (error) {
    return next(error);
  }
};

const requirePaymentsEnabled = requireFinanceFeature(
  'paymentsEnabled',
  'New payments are temporarily unavailable. Please try again later.',
);

const requireRefundsEnabled = requireFinanceFeature(
  'refundsEnabled',
  'Refund creation is temporarily unavailable.',
);

const requireWithdrawalsEnabled = requireFinanceFeature(
  'withdrawalsEnabled',
  'New withdrawal requests are temporarily unavailable.',
);

module.exports = {
  getFinanceSettings,
  invalidateFinanceSettingsCache,
  requirePaymentsEnabled,
  requireRefundsEnabled,
  requireWithdrawalsEnabled,
};
