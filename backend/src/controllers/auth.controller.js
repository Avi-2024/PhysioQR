const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const Otp = require('../models/Otp.model');
const asyncHandler = require('../utils/asyncHandler');

// Generate a JWT token
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/login
// Used by Admin, Agent, Doctor
const login = asyncHandler(async (req, res) => {
  const { email, mobile, password } = req.body;

  const user = await User.findOne(email ? { email } : { mobile });
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ message: `Account is ${user.status}` });
  }

  res.json({
    token: generateToken(user._id),
    role: user.role,
    userId: user._id,
  });
});

// POST /api/auth/send-otp
// Sends OTP to patient mobile for registration or login
const sendOtp = asyncHandler(async (req, res) => {
  const { mobile, purpose } = req.body;
  if (!mobile || !purpose) return res.status(400).json({ message: 'mobile and purpose are required' });

  // SRS §11 — Daily OTP limit (max 5 per day per mobile)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const dailyCount = await Otp.countDocuments({ mobile, createdAt: { $gte: todayStart } });
  if (dailyCount >= 5) {
    return res.status(429).json({ message: 'Daily OTP limit reached. Try again tomorrow.' });
  }

  // SRS §11 — Check if account is temporarily blocked (too many failed attempts)
  const recentFailed = await Otp.findOne({ mobile, purpose, verified: false, attempts: { $gte: 5 } });
  if (recentFailed && recentFailed.expiresAt > new Date()) {
    return res.status(429).json({ message: 'Too many failed attempts. Please wait before requesting a new OTP.' });
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Remove previous unverified OTPs for same mobile + purpose
  await Otp.deleteMany({ mobile, purpose, verified: false });
  await Otp.create({ mobile, otp: otpCode, purpose, expiresAt });

  // TODO: Send via Twilio SMS in production
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV] OTP for ${mobile}: ${otpCode}`);
  }

  res.json({ message: 'OTP sent successfully' });
});

// POST /api/auth/verify-otp
const verifyOtp = asyncHandler(async (req, res) => {
  const { mobile, otp, purpose } = req.body;

  const record = await Otp.findOne({ mobile, purpose, verified: false });

  if (!record) return res.status(400).json({ message: 'OTP not found or already used' });
  if (record.expiresAt < new Date()) return res.status(400).json({ message: 'OTP expired' });
  if (record.otp !== otp) {
    record.attempts += 1;
    await record.save();
    return res.status(400).json({ message: 'Incorrect OTP' });
  }

  record.verified = true;
  await record.save();

  // Issue a patient JWT so they can access protected routes
  const Patient = require('../models/Patient.model');
  const patient = await Patient.findOne({ mobile });
  if (!patient) {
    // OTP verified but patient not registered yet (registration step pending)
    return res.json({ message: 'OTP verified', mobile, registered: false });
  }

  const token = generateToken(patient._id);
  res.json({ message: 'OTP verified', mobile, registered: true, token, patientId: patient._id });
});

module.exports = { login, sendOtp, verifyOtp };
