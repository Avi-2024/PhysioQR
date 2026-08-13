const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const {
  bootstrapAdmin,
  login,
  getMe,
  logout,
  changePassword,
  sendOtp,
  verifyOtp,
  resetPassword,
} = require('../controllers/auth.controller');
const { requireFields } = require('../middlewares/validate.middleware');

router.post('/bootstrap-admin', requireFields('password'), bootstrapAdmin);

// POST /api/auth/login         — Admin, Agent, Doctor login
router.post('/login', requireFields('password'), login);

router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.post('/change-password', protect, requireFields('currentPassword', 'newPassword'), changePassword);

// POST /api/auth/send-otp      — Send OTP to patient mobile
router.post('/send-otp', requireFields('mobile', 'purpose'), sendOtp);

// POST /api/auth/verify-otp    — Verify OTP and return patient token
router.post('/verify-otp', requireFields('mobile', 'otp', 'purpose'), verifyOtp);

router.post('/reset-password', requireFields('otp', 'newPassword'), resetPassword);

module.exports = router;
