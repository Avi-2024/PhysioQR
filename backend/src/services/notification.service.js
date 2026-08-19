const nodemailer = require('nodemailer');
const twilio = require('twilio');
const Notification = require('../models/Notification.model');
const Patient = require('../models/Patient.model');
const Doctor = require('../models/Doctor.model');
const Agent = require('../models/Agent.model');
const User = require('../models/User.model');

// Creates an HTTP-aware service error.
const serviceError = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

// Normalizes mobile numbers into E.164 for provider delivery.
const toE164Mobile = (mobile) => {
  if (!mobile) return null;
  const normalized = String(mobile).trim();
  const digits = normalized.startsWith('+')
    ? normalized.slice(1).replace(/\D/g, '')
    : normalized.replace(/\D/g, '');
  if (!digits) return null;
  if (normalized.startsWith('+')) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return `+${digits}`;
};

// Resolves whether delivery should use live providers or dev/test log mode.
const getDeliveryMode = () => (
  process.env.NOTIFICATION_DELIVERY_MODE?.trim().toLowerCase() ||
  (process.env.NODE_ENV === 'production' ? 'provider' : 'log')
);

// Calculates exponential retry delay for failed notification delivery.
const getRetryDelayMs = (retryCount = 0) => {
  const baseSeconds = Number(process.env.NOTIFICATION_RETRY_BASE_SECONDS || 60);
  const delaySeconds = Math.min(baseSeconds * (2 ** Math.max(retryCount - 1, 0)), 60 * 60);
  return delaySeconds * 1000;
};

// Creates a configured nodemailer transport.
const getEmailTransport = () => {
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;
  if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASS) {
    throw serviceError('Email provider is not configured', 503);
  }

  return nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT),
    secure: Number(EMAIL_PORT) === 465,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });
};

// Creates a configured Twilio client for SMS and WhatsApp.
const getTwilioClient = () => {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw serviceError('Twilio messaging provider is not configured', 503);
  }
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
};

// Loads the recipient profile for a notification.
const loadRecipient = async (notification) => {
  if (notification.recipientType === 'patient' && notification.patient) {
    return Patient.findById(notification.patient).lean();
  }
  if (notification.recipientType === 'doctor' && notification.doctor) {
    return Doctor.findById(notification.doctor).lean();
  }
  if (notification.recipientType === 'agent' && notification.agent) {
    return Agent.findById(notification.agent).lean();
  }
  if (notification.recipientType === 'admin' && notification.adminUser) {
    return User.findById(notification.adminUser).lean();
  }
  return null;
};

// Resolves the best contact value for the notification channel.
const resolveRecipientContact = async (notification) => {
  if (notification.recipientContact) return notification.recipientContact;
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

// Marks an in-app notification as delivered.
const deliverInApp = async (notification) => ({
  provider: 'in_app',
  providerMessageId: notification._id.toString(),
});

// Sends an email notification.
const deliverEmail = async (notification, contact) => {
  const transport = getEmailTransport();
  const result = await transport.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: contact,
    subject: notification.title || 'PhysioQR notification',
    text: notification.message,
  });
  return { provider: 'email', providerMessageId: result.messageId };
};

// Sends an SMS notification through Twilio Messaging.
const deliverSms = async (notification, contact) => {
  if (!process.env.TWILIO_PHONE_NUMBER) throw serviceError('TWILIO_PHONE_NUMBER is not configured', 503);
  const client = getTwilioClient();
  const result = await client.messages.create({
    from: process.env.TWILIO_PHONE_NUMBER,
    to: contact,
    body: notification.message,
  });
  return { provider: 'twilio_sms', providerMessageId: result.sid };
};

// Sends a WhatsApp notification through Twilio Messaging.
const deliverWhatsApp = async (notification, contact) => {
  if (!process.env.TWILIO_WHATSAPP_FROM) throw serviceError('TWILIO_WHATSAPP_FROM is not configured', 503);
  const client = getTwilioClient();
  const result = await client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,
    to: contact,
    body: notification.message,
  });
  return { provider: 'twilio_whatsapp', providerMessageId: result.sid };
};

// Delivers one notification and records the delivery result.
const deliverNotification = async (notificationOrId) => {
  const notification = typeof notificationOrId === 'string'
    ? await Notification.findById(notificationOrId)
    : notificationOrId;
  if (!notification) throw serviceError('Notification not found', 404);
  if (notification.status === 'sent') return notification;

  try {
    const contact = await resolveRecipientContact(notification);
    notification.recipientContact = contact || notification.recipientContact;
    notification.lastAttemptAt = new Date();

    let result;
    if (getDeliveryMode() === 'log') {
      result = { provider: `log_${notification.channel}`, providerMessageId: `log_${Date.now()}` };
    } else if (notification.channel === 'in_app') {
      result = await deliverInApp(notification);
    } else if (notification.channel === 'email') {
      if (!contact) throw serviceError('Email recipient contact is missing');
      result = await deliverEmail(notification, contact);
    } else if (notification.channel === 'sms') {
      if (!contact) throw serviceError('SMS recipient contact is missing');
      result = await deliverSms(notification, contact);
    } else if (notification.channel === 'whatsapp') {
      if (!contact) throw serviceError('WhatsApp recipient contact is missing');
      result = await deliverWhatsApp(notification, contact);
    } else {
      throw serviceError(`Unsupported notification channel: ${notification.channel}`);
    }

    notification.status = 'sent';
    notification.sentAt = new Date();
    notification.nextAttemptAt = undefined;
    notification.provider = result.provider;
    notification.providerMessageId = result.providerMessageId;
    notification.failureReason = undefined;
    notification.deliveryAttempts.push({
      status: 'sent',
      provider: result.provider,
      providerMessageId: result.providerMessageId,
    });
  } catch (error) {
    notification.status = 'failed';
    notification.retryCount = (notification.retryCount || 0) + 1;
    notification.lastAttemptAt = new Date();
    notification.nextAttemptAt = new Date(Date.now() + getRetryDelayMs(notification.retryCount));
    notification.failureReason = error.message;
    notification.deliveryAttempts.push({
      status: 'failed',
      provider: notification.channel,
      error: error.message,
    });
  }

  await notification.save();
  return notification;
};

// Creates a notification and optionally attempts immediate delivery.
const createNotification = async (payload, { deliverNow = true } = {}) => {
  const notification = await Notification.create(payload);
  if (deliverNow) return deliverNotification(notification);
  return notification;
};

// Creates the same notification message for one or more channels.
const createNotificationsForChannels = async (payload, channels = ['in_app'], options = {}) => {
  const created = [];
  for (const channel of channels) {
    created.push(await createNotification({ ...payload, channel }, options));
  }
  return created;
};

// Processes pending or failed notifications for background worker/admin retry.
const processPendingNotifications = async ({ limit = 25, includeFailed = false } = {}) => {
  const now = new Date();
  const retryFilter = includeFailed
    ? {
        $or: [
          { status: 'pending' },
          { status: 'failed', nextAttemptAt: { $lte: now } },
          { status: 'failed', nextAttemptAt: { $exists: false } },
        ],
      }
    : { status: 'pending' };

  const notifications = await Notification.find({
    ...retryFilter,
    channel: { $ne: 'in_app' },
    retryCount: { $lt: Number(process.env.NOTIFICATION_MAX_RETRIES || 5) },
  })
    .sort({ createdAt: 1 })
    .limit(Math.min(Number(limit) || 25, 100));

  const results = [];
  for (const notification of notifications) {
    results.push(await deliverNotification(notification));
  }
  return results;
};

module.exports = {
  createNotification,
  createNotificationsForChannels,
  deliverNotification,
  processPendingNotifications,
};
