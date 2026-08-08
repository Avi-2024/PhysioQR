const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

require('dotenv').config();

const app = express();

// ─── Global Middlewares ───────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// Rate limiting — max 100 requests per 15 min per IP (SRS §43)
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// ─── Routes ───────────────────────────────────────────────
app.use('/api/auth',             require('./routes/auth.routes'));
app.use('/api/admin',            require('./routes/admin.routes'));
app.use('/api/agents',           require('./routes/agent.routes'));
app.use('/api/doctors',          require('./routes/doctor.routes'));
app.use('/api/patients',         require('./routes/patient.routes'));
app.use('/api/programs',         require('./routes/program.routes'));
app.use('/api/exercises',        require('./routes/exercise.routes'));
app.use('/api/assessments',      require('./routes/assessment.routes'));
app.use('/api/payments',         require('./routes/payment.routes'));
app.use('/api/refunds',          require('./routes/refund.routes'));
app.use('/api/coupons',          require('./routes/coupon.routes'));
app.use('/api/wallet',           require('./routes/wallet.routes'));
app.use('/api/withdrawals',      require('./routes/withdrawal.routes'));
app.use('/api/support',          require('./routes/support.routes'));
app.use('/api/reports',          require('./routes/report.routes'));
app.use('/api/notifications',    require('./routes/notification.routes'));
app.use('/api/settings',         require('./routes/settings.routes'));
app.use('/api/progress',         require('./routes/progress.routes'));
app.use('/api/qr',               require('./routes/qr.routes'));
app.use('/api/patient-programs', require('./routes/patientProgram.routes'));

// ─── Health Check ─────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'PhysioQR API is running' }));

// ─── 404 Handler ──────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// ─── Global Error Handler ─────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

module.exports = app;
