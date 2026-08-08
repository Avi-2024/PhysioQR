const express = require('express');
const router = express.Router();
const { login, sendOtp, verifyOtp } = require('../controllers/auth.controller');

// POST /api/auth/login         — Admin, Agent, Doctor login
router.post('/login', login);

// POST /api/auth/send-otp      — Send OTP to patient mobile
router.post('/send-otp', sendOtp);

// POST /api/auth/verify-otp    — Verify OTP and return patient token
router.post('/verify-otp', verifyOtp);

module.exports = router;
