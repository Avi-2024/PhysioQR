const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const Sentry = require('@sentry/node');

require('dotenv').config();

const app = express();
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV || 'development' });
}

app.set('trust proxy', 1);

// Parses cookies without adding another runtime dependency.
const parseCookies = (cookieHeader = '') => cookieHeader.split(';').reduce((cookies, item) => {
  const [rawKey, ...rawValue] = item.trim().split('=');
  if (!rawKey) return cookies;
  cookies[rawKey] = decodeURIComponent(rawValue.join('=') || '');
  return cookies;
}, {});

app.use(helmet());
if (process.env.SENTRY_DSN) app.use(Sentry.Handlers.requestHandler());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || !allowedOrigins.length || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS origin is not allowed'));
  },
  credentials: true,
}));
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  req.cookies = parseCookies(req.headers.cookie);
  next();
});
app.use((req, res, next) => {
  if (process.env.ENFORCE_HTTPS === 'true' && req.headers['x-forwarded-proto'] !== 'https' && !req.secure) {
    return res.status(403).json({ message: 'HTTPS is required' });
  }
  next();
});
app.use('/api/payments/webhook/razorpay', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '5mb' }));
app.use(mongoSanitize());
app.use(morgan('dev'));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_GLOBAL_MAX || 300),
  standardHeaders: true,
  legacyHeaders: false,
}));

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/agents', require('./routes/agent.routes'));
app.use('/api/doctors', require('./routes/doctor.routes'));
app.use('/api/patients', require('./routes/patient.routes'));
app.use('/api/programs', require('./routes/program.routes'));
app.use('/api/exercises', require('./routes/exercise.routes'));
app.use('/api/assessments', require('./routes/assessment.routes'));
app.use('/api/payments', require('./routes/payment.routes'));
app.use('/api/refunds', require('./routes/refund.routes'));
app.use('/api/coupons', require('./routes/coupon.routes'));
app.use('/api/wallet', require('./routes/wallet.routes'));
app.use('/api/withdrawals', require('./routes/withdrawal.routes'));
app.use('/api/support', require('./routes/support.routes'));
app.use('/api/reports', require('./routes/report.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/settings', require('./routes/settings.routes'));
app.use('/api/progress', require('./routes/progress.routes'));
app.use('/api/qr', require('./routes/qr.routes'));
app.use('/api/patient-programs', require('./routes/patientProgram.routes'));

app.get('/health', (req, res) => res.json({ status: 'PhysioQR API is running' }));

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

if (process.env.SENTRY_DSN) app.use(Sentry.Handlers.errorHandler());

app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (process.env.SENTRY_DSN && status >= 500) Sentry.captureException(err);
  if (status >= 500) console.error(err.stack);
  else console.warn(`[${req.id}] ${status} ${err.message}`);
  res.status(status).json({
    message: status >= 500 && process.env.NODE_ENV === 'production' ? 'Internal Server Error' : (err.message || 'Internal Server Error'),
    requestId: req.id,
  });
});

module.exports = app;
