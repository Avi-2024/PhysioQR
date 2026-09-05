const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const {
  bootstrapAdmin,
  login,
  refresh,
  getMe,
  logout,
  getSessions,
  revokeSession,
  changePassword,
  sendOtp,
  verifyOtp,
  resetPassword,
} = require('../controllers/auth.controller');
const { requireFields, validateSchema } = require('../middlewares/validate.middleware');
const { authLimiter, otpLimiter } = require('../middlewares/rateLimit.middleware');

router.post('/bootstrap-admin', authLimiter, requireFields('password'), bootstrapAdmin);

// POST /api/auth/login - Admin, Agent, Doctor password JWT login.
router.post('/login', authLimiter, validateSchema({
  body: {
    email: { type: 'email' },
    mobile: { type: 'mobile' },
    password: { type: 'string', min: 6, max: 128, required: true },
  },
}), login);
router.post('/refresh', validateSchema({ body: { refreshToken: { type: 'string', min: 20, max: 500 } } }), refresh);

router.get('/me', protect, getMe);
router.post('/logout', logout);
router.get('/sessions', protect, getSessions);
router.delete('/sessions/:id', protect, revokeSession);
router.post('/change-password', protect, validateSchema({
  body: {
    // Optional only for mandatory first-login password setup. Normal password
    // changes still require the current password in the controller.
    currentPassword: { type: 'string', min: 6, max: 128 },
    newPassword: { type: 'string', min: 8, max: 128, required: true },
  },
}), changePassword);

// POST /api/auth/send-otp - Send OTP for patient registration/login.
router.post('/send-otp', otpLimiter, validateSchema({
  body: {
    mobile: { type: 'mobile', required: true },
    purpose: { type: 'enum', values: ['registration', 'login', 'password_reset', 'mobile_change', 'profile_change'], required: true },
  },
}), sendOtp);

// POST /api/auth/verify-otp - Verify patient OTP and return patient token.
router.post('/verify-otp', otpLimiter, validateSchema({
  body: {
    mobile: { type: 'mobile', required: true },
    otp: { type: 'string', min: 4, max: 10, required: true },
    purpose: { type: 'enum', values: ['registration', 'login', 'password_reset', 'mobile_change', 'profile_change'], required: true },
  },
}), verifyOtp);

router.post('/reset-password', authLimiter, resetPassword);

module.exports = router;
