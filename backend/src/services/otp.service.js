const twilio = require('twilio');
const Otp = require('../models/Otp.model');

const PATIENT_OTP_PURPOSES = new Set(['registration', 'login']);

const httpError = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const normalizeMobile = (mobile) => mobile?.trim();

const toE164Mobile = (mobile) => {
  const normalized = normalizeMobile(mobile);
  if (!normalized) throw httpError('mobile is required');

  const digits = normalized.startsWith('+')
    ? normalized.slice(1).replace(/\D/g, '')
    : normalized.replace(/\D/g, '');

  if (normalized.startsWith('+') && digits.length >= 8) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (digits.length >= 8) return `+${digits}`;

  throw httpError('Invalid mobile number');
};

const getOtpProvider = () => {
  const configured = process.env.OTP_PROVIDER?.trim().toLowerCase();
  if (configured) return configured;
  return process.env.NODE_ENV === 'production' ? 'twilio' : 'db';
};

const assertPatientOtpPurpose = (purpose) => {
  if (!PATIENT_OTP_PURPOSES.has(purpose)) {
    throw httpError('OTP is only supported for patient registration and login');
  }
};

// Twilio Verify owns OTP generation, delivery, expiry and verification.
// Branding/friendly-name is configured on the Verify Service in Twilio Console.
// Do not send customFriendlyName per request: some accounts/regions reject it with 403.
const getTwilioVerifyConfig = () => {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
    throw httpError('Twilio Verify is not configured', 503);
  }

  return {
    client: twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
    serviceSid: TWILIO_VERIFY_SERVICE_SID,
  };
};

const sendDbOtp = async ({ mobile, purpose }) => {
  const normalizedMobile = normalizeMobile(mobile);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const dailyCount = await Otp.countDocuments({ mobile: normalizedMobile, createdAt: { $gte: todayStart } });
  if (dailyCount >= Number(process.env.OTP_DAILY_LIMIT || 5)) {
    throw httpError('Daily OTP limit reached. Try again tomorrow.', 429);
  }

  const blockedOtp = await Otp.findOne({
    mobile: normalizedMobile,
    purpose,
    verified: false,
    attempts: { $gte: Number(process.env.OTP_MAX_ATTEMPTS || 5) },
    expiresAt: { $gt: new Date() },
  });
  if (blockedOtp) {
    throw httpError('Too many failed attempts. Please wait before retrying.', 429);
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresInMinutes = Number(process.env.OTP_EXPIRY_MINUTES || 10);
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  await Otp.deleteMany({ mobile: normalizedMobile, purpose, verified: false });
  await Otp.create({ mobile: normalizedMobile, otp, purpose, expiresAt });

  const response = { expiresInMinutes };
  if (['development', 'test'].includes(process.env.NODE_ENV)) response.otp = otp;
  return response;
};

const verifyDbOtp = async ({ mobile, purpose, otp }) => {
  const normalizedMobile = normalizeMobile(mobile);
  const record = await Otp.findOne({ mobile: normalizedMobile, purpose, verified: false }).sort({ createdAt: -1 });
  if (!record) throw httpError('OTP not found or already used');
  if (record.expiresAt < new Date()) throw httpError('OTP expired');

  if (record.otp !== otp) {
    record.attempts += 1;
    await record.save();
    throw httpError('Incorrect OTP');
  }

  record.verified = true;
  await record.save();
  return { mobile: normalizedMobile };
};

const sendTwilioOtp = async ({ mobile }) => {
  const to = toE164Mobile(mobile);
  const channel = process.env.TWILIO_VERIFY_CHANNEL || 'sms';
  const { client, serviceSid } = getTwilioVerifyConfig();

  const verification = await client.verify.v2
    .services(serviceSid)
    .verifications
    .create({ to, channel });

  return { channel, status: verification.status };
};

const verifyTwilioOtp = async ({ mobile, otp }) => {
  const to = toE164Mobile(mobile);
  const { client, serviceSid } = getTwilioVerifyConfig();

  const verification = await client.verify.v2
    .services(serviceSid)
    .verificationChecks
    .create({ to, code: otp });

  if (verification.status !== 'approved') {
    throw httpError('Incorrect OTP');
  }

  return { mobile: normalizeMobile(mobile) };
};

const sendOtp = async ({ mobile, purpose }) => {
  assertPatientOtpPurpose(purpose);
  const provider = getOtpProvider();

  if (provider === 'twilio') return sendTwilioOtp({ mobile, purpose });
  if (provider === 'db') return sendDbOtp({ mobile, purpose });

  throw httpError(`Unsupported OTP provider: ${provider}`, 503);
};

const verifyOtp = async ({ mobile, purpose, otp }) => {
  assertPatientOtpPurpose(purpose);
  const provider = getOtpProvider();

  if (provider === 'twilio') return verifyTwilioOtp({ mobile, purpose, otp });
  if (provider === 'db') return verifyDbOtp({ mobile, purpose, otp });

  throw httpError(`Unsupported OTP provider: ${provider}`, 503);
};

module.exports = {
  normalizeMobile,
  sendOtp,
  verifyOtp,
};
