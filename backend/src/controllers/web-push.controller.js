const WebPushSubscription = require('../models/WebPushSubscription.model');
const asyncHandler = require('../utils/asyncHandler');
const { getNotificationSettings } = require('../services/notification.service');

const getRecipientRef = (req) => {
  const role = req.user.role;
  const ref = req.user.profileRef || req.user._id;
  if (role === 'patient') return { recipientType: 'patient', patient: ref };
  if (role === 'doctor') return { recipientType: 'doctor', doctor: ref };
  if (role === 'agent') return { recipientType: 'agent', agent: ref };
  return { recipientType: 'admin', adminUser: req.user._id };
};

const ensureWebPushEnabled = async () => {
  const settings = await getNotificationSettings();
  return settings.webPushEnabled !== false;
};

const getPublicKey = asyncHandler(async (_req, res) => {
  if (!(await ensureWebPushEnabled())) {
    return res.status(503).json({ message: 'Web push is disabled by platform settings' });
  }
  if (!process.env.WEB_PUSH_VAPID_PUBLIC_KEY) {
    return res.status(503).json({ message: 'Web push is not configured' });
  }
  res.json({ publicKey: process.env.WEB_PUSH_VAPID_PUBLIC_KEY });
});

const subscribe = asyncHandler(async (req, res) => {
  if (!(await ensureWebPushEnabled())) {
    return res.status(503).json({ message: 'Web push is disabled by platform settings' });
  }

  const { endpoint, expirationTime, keys } = req.body || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ message: 'A valid web push subscription is required' });
  }

  const recipient = getRecipientRef(req);
  const subscription = await WebPushSubscription.findOneAndUpdate(
    { endpoint },
    {
      ...recipient,
      endpoint,
      expirationTime: expirationTime || null,
      keys: { p256dh: keys.p256dh, auth: keys.auth },
      userAgent: req.get('user-agent') || undefined,
      isActive: true,
      lastUsedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.status(201).json({ message: 'Web push enabled', subscriptionId: subscription._id });
});

const unsubscribe = asyncHandler(async (req, res) => {
  const endpoint = req.body?.endpoint;
  if (!endpoint) return res.status(400).json({ message: 'endpoint is required' });
  const recipient = getRecipientRef(req);
  const result = await WebPushSubscription.updateOne(
    { endpoint, ...recipient },
    { isActive: false }
  );
  res.json({ message: 'Web push disabled', modifiedCount: result.modifiedCount });
});

module.exports = { getPublicKey, subscribe, unsubscribe };
