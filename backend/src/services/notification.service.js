const nodemailer = require('nodemailer');
const twilio = require('twilio');
const webPush = require('web-push');
const Notification = require('../models/Notification.model');
const WebPushSubscription = require('../models/WebPushSubscription.model');
const AppSetting = require('../models/AppSetting.model');
const Patient = require('../models/Patient.model');
const Doctor = require('../models/Doctor.model');
const Agent = require('../models/Agent.model');
const User = require('../models/User.model');

const serviceError = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const DEFAULT_CHANNEL_SETTINGS = {
  inAppEnabled: true,
  webPushEnabled: true,
  emailEnabled: true,
  smsEnabled: true,
  whatsappEnabled: true,
};

const CHANNEL_SETTING_KEYS = {
  in_app: 'inAppEnabled',
  web_push: 'webPushEnabled',
  email: 'emailEnabled',
  sms: 'smsEnabled',
  whatsapp: 'whatsappEnabled',
};

let notificationSettingsCache = null;
let notificationSettingsCachedAt = 0;
const NOTIFICATION_SETTINGS_CACHE_MS = 30 * 1000;

const getNotificationSettings = async () => {
  const now = Date.now();
  if (notificationSettingsCache && now - notificationSettingsCachedAt < NOTIFICATION_SETTINGS_CACHE_MS) return notificationSettingsCache;
  const record = await AppSetting.findOne({ key: 'notifications' }).select('value').lean();
  notificationSettingsCache = { ...DEFAULT_CHANNEL_SETTINGS, ...(record?.value || {}) };
  notificationSettingsCachedAt = now;
  return notificationSettingsCache;
};

const assertChannelEnabled = async (channel) => {
  const settingKey = CHANNEL_SETTING_KEYS[channel];
  if (!settingKey) throw serviceError(`Unsupported notification channel: ${channel}`);
  const settings = await getNotificationSettings();
  if (settings[settingKey] === false) throw serviceError(`${channel.replace(/_/g, ' ')} notifications are disabled by platform settings`, 503);
};

const toE164Mobile = (mobile) => {
  if (!mobile) return null;
  const normalized = String(mobile).trim();
  const digits = normalized.startsWith('+') ? normalized.slice(1).replace(/\D/g, '') : normalized.replace(/\D/g, '');
  if (!digits) return null;
  if (normalized.startsWith('+')) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return `+${digits}`;
};

const getDeliveryMode = () => (
  process.env.NOTIFICATION_DELIVERY_MODE?.trim().toLowerCase() ||
  (process.env.NODE_ENV === 'production' ? 'provider' : 'log')
);

const getRetryDelayMs = (retryCount = 0) => {
  const baseSeconds = Number(process.env.NOTIFICATION_RETRY_BASE_SECONDS || 60);
  const delaySeconds = Math.min(baseSeconds * (2 ** Math.max(retryCount - 1, 0)), 60 * 60);
  return delaySeconds * 1000;
};

const getEmailTransport = () => {
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;
  if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASS) throw serviceError('Email provider is not configured', 503);
  return nodemailer.createTransport({ host: EMAIL_HOST, port: Number(EMAIL_PORT), secure: Number(EMAIL_PORT) === 465, auth: { user: EMAIL_USER, pass: EMAIL_PASS } });
};

const getTwilioClient = () => {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) throw serviceError('Twilio messaging provider is not configured', 503);
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
};

const configureWebPush = () => {
  const { WEB_PUSH_VAPID_PUBLIC_KEY, WEB_PUSH_VAPID_PRIVATE_KEY, WEB_PUSH_VAPID_SUBJECT } = process.env;
  if (!WEB_PUSH_VAPID_PUBLIC_KEY || !WEB_PUSH_VAPID_PRIVATE_KEY) throw serviceError('Web push VAPID keys are not configured', 503);
  webPush.setVapidDetails(WEB_PUSH_VAPID_SUBJECT || 'mailto:support@physioqr.in', WEB_PUSH_VAPID_PUBLIC_KEY, WEB_PUSH_VAPID_PRIVATE_KEY);
};

const loadRecipient = async (notification) => {
  if (notification.recipientType === 'patient' && notification.patient) return Patient.findById(notification.patient).lean();
  if (notification.recipientType === 'doctor' && notification.doctor) return Doctor.findById(notification.doctor).lean();
  if (notification.recipientType === 'agent' && notification.agent) return Agent.findById(notification.agent).lean();
  if (notification.recipientType === 'admin' && notification.adminUser) return User.findById(notification.adminUser).lean();
  return null;
};

const resolveRecipientContact = async (notification) => {
  if (notification.recipientContact) return notification.recipientContact;
  if (notification.channel === 'web_push') return null;
  if (notification.recipientType === 'admin' && !notification.adminUser && notification.channel === 'in_app') return null;
  const recipient = await loadRecipient(notification);
  if (!recipient) {
    if (notification.channel === 'in_app' && notification.recipientType === 'admin') return null;
    throw serviceError('Notification recipient profile was not found', 404);
  }
  if (notification.channel === 'email') return recipient.email || null;
  if (notification.channel === 'sms') return toE164Mobile(recipient.mobile || recipient.whatsapp);
  if (notification.channel === 'whatsapp') return `whatsapp:${toE164Mobile(recipient.whatsapp || recipient.mobile)}`;
  return null;
};

const deliverInApp = async (notification) => ({ provider: 'in_app', providerMessageId: notification._id.toString() });

const deliverEmail = async (notification, contact) => {
  const result = await getEmailTransport().sendMail({ from: process.env.EMAIL_FROM || process.env.EMAIL_USER, to: contact, subject: notification.title || 'PhysioQR notification', text: notification.message });
  return { provider: 'email', providerMessageId: result.messageId };
};

const deliverSms = async (notification, contact) => {
  if (!process.env.TWILIO_PHONE_NUMBER) throw serviceError('TWILIO_PHONE_NUMBER is not configured', 503);
  const result = await getTwilioClient().messages.create({ from: process.env.TWILIO_PHONE_NUMBER, to: contact, body: notification.message });
  return { provider: 'twilio_sms', providerMessageId: result.sid };
};

const deliverWhatsApp = async (notification, contact) => {
  if (!process.env.TWILIO_WHATSAPP_FROM) throw serviceError('TWILIO_WHATSAPP_FROM is not configured', 503);
  const result = await getTwilioClient().messages.create({ from: process.env.TWILIO_WHATSAPP_FROM, to: contact, body: notification.message });
  return { provider: 'twilio_whatsapp', providerMessageId: result.sid };
};

const getWebPushRecipientFilter = (notification) => {
  if (notification.recipientType === 'patient' && notification.patient) return { patient: notification.patient };
  if (notification.recipientType === 'doctor' && notification.doctor) return { doctor: notification.doctor };
  if (notification.recipientType === 'agent' && notification.agent) return { agent: notification.agent };
  if (notification.recipientType === 'admin' && notification.adminUser) return { adminUser: notification.adminUser };
  throw serviceError('Web push requires a specific recipient', 400);
};

const deliverWebPush = async (notification) => {
  configureWebPush();
  const subscriptions = await WebPushSubscription.find({ ...getWebPushRecipientFilter(notification), isActive: true });
  if (!subscriptions.length) throw serviceError('Recipient has no active web push subscription', 409);
  const payload = JSON.stringify({
    title: notification.title || 'PhysioQR',
    body: notification.message,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    url: notification.metadata?.url || '/',
    notificationId: notification._id.toString(),
    type: notification.type,
  });
  let delivered = 0;
  let lastError;
  for (const subscription of subscriptions) {
    try {
      await webPush.sendNotification({ endpoint: subscription.endpoint, expirationTime: subscription.expirationTime || null, keys: subscription.keys }, payload, { TTL: 60 * 60 });
      subscription.lastUsedAt = new Date();
      await subscription.save();
      delivered += 1;
    } catch (error) {
      lastError = error;
      if ([404, 410].includes(error.statusCode)) {
        subscription.isActive = false;
        await subscription.save();
      }
    }
  }
  if (!delivered) throw serviceError(lastError?.message || 'Web push delivery failed', lastError?.statusCode || 502);
  return { provider: 'web_push', providerMessageId: `delivered:${delivered}` };
};

const deliverNotification = async (notificationOrId) => {
  const notification = typeof notificationOrId === 'string' ? await Notification.findById(notificationOrId) : notificationOrId;
  if (!notification) throw serviceError('Notification not found', 404);
  if (notification.status === 'sent') return notification;
  try {
    await assertChannelEnabled(notification.channel);
    const contact = await resolveRecipientContact(notification);
    notification.recipientContact = contact || notification.recipientContact;
    notification.lastAttemptAt = new Date();
    let result;
    if (getDeliveryMode() === 'log') result = { provider: `log_${notification.channel}`, providerMessageId: `log_${Date.now()}` };
    else if (notification.channel === 'in_app') result = await deliverInApp(notification);
    else if (notification.channel === 'email') { if (!contact) throw serviceError('Email recipient contact is missing'); result = await deliverEmail(notification, contact); }
    else if (notification.channel === 'sms') { if (!contact) throw serviceError('SMS recipient contact is missing'); result = await deliverSms(notification, contact); }
    else if (notification.channel === 'whatsapp') { if (!contact) throw serviceError('WhatsApp recipient contact is missing'); result = await deliverWhatsApp(notification, contact); }
    else if (notification.channel === 'web_push') result = await deliverWebPush(notification);
    else throw serviceError(`Unsupported notification channel: ${notification.channel}`);

    notification.status = 'sent';
    notification.sentAt = new Date();
    notification.nextAttemptAt = undefined;
    notification.provider = result.provider;
    notification.providerMessageId = result.providerMessageId;
    notification.failureReason = undefined;
    notification.deliveryAttempts.push({ status: 'sent', provider: result.provider, providerMessageId: result.providerMessageId });
  } catch (error) {
    notification.status = 'failed';
    notification.retryCount = (notification.retryCount || 0) + 1;
    notification.lastAttemptAt = new Date();
    notification.nextAttemptAt = new Date(Date.now() + getRetryDelayMs(notification.retryCount));
    notification.failureReason = error.message;
    notification.deliveryAttempts.push({ status: 'failed', provider: notification.channel, error: error.message });
  }
  await notification.save();
  return notification;
};

const createNotification = async (payload, { deliverNow = true } = {}) => {
  const notification = await Notification.create(payload);
  if (deliverNow) return deliverNotification(notification);
  return notification;
};

const createNotificationsForChannels = async (payload, channels = ['in_app'], options = {}) => {
  const created = [];
  for (const channel of channels) created.push(await createNotification({ ...payload, channel }, options));
  return created;
};

const processPendingNotifications = async ({ limit = 25, includeFailed = false } = {}) => {
  const now = new Date();
  const retryFilter = includeFailed ? { $or: [{ status: 'pending' }, { status: 'failed', nextAttemptAt: { $lte: now } }, { status: 'failed', nextAttemptAt: { $exists: false } }] } : { status: 'pending' };
  const notifications = await Notification.find({ ...retryFilter, channel: { $ne: 'in_app' }, retryCount: { $lt: Number(process.env.NOTIFICATION_MAX_RETRIES || 5) } }).sort({ createdAt: 1 }).limit(Math.min(Number(limit) || 25, 100));
  const results = [];
  for (const notification of notifications) results.push(await deliverNotification(notification));
  return results;
};

module.exports = { createNotification, createNotificationsForChannels, deliverNotification, processPendingNotifications, getNotificationSettings };
