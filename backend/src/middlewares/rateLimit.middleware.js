const rateLimit = require('express-rate-limit');

// Builds a JSON API rate limiter with standard response shape.
const createRateLimiter = ({ windowMs, max, message }) => rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message },
  keyGenerator: (req) => `${req.ip}:${req.user?._id || req.body?.mobile || 'anon'}`,
});

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_AUTH_MAX || 20),
  message: 'Too many authentication attempts. Please try again later.',
});

const otpLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_OTP_MAX || 5),
  message: 'Too many OTP attempts. Please try again later.',
});

const paymentLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_PAYMENT_MAX || 20),
  message: 'Too many payment attempts. Please try again later.',
});

const qrLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_QR_MAX || 60),
  message: 'Too many QR scan attempts. Please slow down.',
});

const supportLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_SUPPORT_MAX || 30),
  message: 'Too many support requests. Please try again later.',
});

const adminJobLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_ADMIN_JOB_MAX || 10),
  message: 'Too many admin job attempts. Please try again later.',
});

module.exports = {
  authLimiter,
  otpLimiter,
  paymentLimiter,
  qrLimiter,
  supportLimiter,
  adminJobLimiter,
};
