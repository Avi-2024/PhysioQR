const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const Patient = require('../models/Patient.model');
const Otp = require('../models/Otp.model');
const { writeAuditLog } = require('../utils/auditLogger');
const asyncHandler = require('../utils/asyncHandler');

const normalizeEmail = (email) => email?.trim().toLowerCase();
const normalizeMobile = (mobile) => mobile?.trim();

const generateToken = ({ id, role, tokenType = 'user' }) => {
  if (!process.env.JWT_SECRET) {
    const error = new Error('JWT_SECRET is not configured');
    error.status = 503;
    throw error;
  }

  return jwt.sign(
    { id, role, tokenType },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const sanitizeUser = (user) => ({
  id: user._id,
  role: user.role,
  email: user.email,
  mobile: user.mobile,
  status: user.status,
  profileRef: user.profileRef,
  profileModel: user.profileModel,
});

const sanitizePatient = (patient) => ({
  id: patient._id,
  patientId: patient.patientId,
  role: 'patient',
  fullName: patient.fullName,
  mobile: patient.mobile,
  email: patient.email,
  status: patient.status,
  mobileVerified: patient.mobileVerified,
  consentAccepted: patient.consentAccepted,
});

const buildUserAuthResponse = (user) => ({
  token: generateToken({ id: user._id, role: user.role, tokenType: 'user' }),
  role: user.role,
  user: sanitizeUser(user),
});

const buildPatientAuthResponse = (patient) => ({
  token: generateToken({ id: patient._id, role: 'patient', tokenType: 'patient' }),
  role: 'patient',
  patient: sanitizePatient(patient),
});

const findUserByIdentifier = ({ email, mobile }) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedMobile = normalizeMobile(mobile);
  if (!normalizedEmail && !normalizedMobile) return null;
  return User.findOne(normalizedEmail ? { email: normalizedEmail } : { mobile: normalizedMobile });
};

// POST /api/auth/bootstrap-admin
// Creates the first Admin only. After one admin exists, require ADMIN_SETUP_SECRET.
const bootstrapAdmin = asyncHandler(async (req, res) => {
  const { email, mobile, password, setupSecret } = req.body;
  const adminCount = await User.countDocuments({ role: 'admin' });

  if (adminCount > 0 && (!process.env.ADMIN_SETUP_SECRET || setupSecret !== process.env.ADMIN_SETUP_SECRET)) {
    return res.status(403).json({ message: 'Admin bootstrap is locked' });
  }

  if (!password || (!email && !mobile)) {
    return res.status(400).json({ message: 'email or mobile and password are required' });
  }

  const existing = await findUserByIdentifier({ email, mobile });
  if (existing) return res.status(409).json({ message: 'User already exists' });

  const admin = await User.create({
    role: 'admin',
    email: normalizeEmail(email),
    mobile: normalizeMobile(mobile),
    password,
    status: 'active',
  });

  await writeAuditLog({
    req,
    action: 'admin_bootstrapped',
    module: 'User',
    recordId: admin._id,
    newValue: { email: admin.email, mobile: admin.mobile, role: admin.role },
  });

  res.status(201).json(buildUserAuthResponse(admin));
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, mobile, password } = req.body;
  if (!email && !mobile) return res.status(400).json({ message: 'email or mobile is required' });

  const user = await findUserByIdentifier({ email, mobile });
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ message: `Account is ${user.status}` });
  }

  res.json(buildUserAuthResponse(user));
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  if (req.user.role === 'patient') {
    const patient = await Patient.findById(req.user._id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    return res.json({ user: sanitizePatient(patient) });
  }

  const user = await User.findById(req.user._id).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ user: sanitizeUser(user) });
});

// POST /api/auth/logout
// JWT is stateless. Frontend should remove the token.
const logout = asyncHandler(async (req, res) => {
  res.json({ message: 'Logged out' });
});

// POST /api/auth/change-password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'currentPassword and newPassword are required' });
  }
  if (req.user.role === 'patient') {
    return res.status(400).json({ message: 'Patients use OTP login and do not have a password' });
  }

  const user = await User.findById(req.user._id);
  if (!user || !(await user.matchPassword(currentPassword))) {
    return res.status(401).json({ message: 'Current password is incorrect' });
  }

  user.password = newPassword;
  await user.save();

  await writeAuditLog({
    req,
    action: 'password_changed',
    module: 'User',
    recordId: user._id,
  });

  res.json({ message: 'Password changed successfully' });
});

// POST /api/auth/send-otp
const sendOtp = asyncHandler(async (req, res) => {
  const { mobile, purpose } = req.body;
  const normalizedMobile = normalizeMobile(mobile);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const dailyCount = await Otp.countDocuments({ mobile: normalizedMobile, createdAt: { $gte: todayStart } });
  if (dailyCount >= Number(process.env.OTP_DAILY_LIMIT || 5)) {
    return res.status(429).json({ message: 'Daily OTP limit reached. Try again tomorrow.' });
  }

  const blockedOtp = await Otp.findOne({
    mobile: normalizedMobile,
    purpose,
    verified: false,
    attempts: { $gte: Number(process.env.OTP_MAX_ATTEMPTS || 5) },
    expiresAt: { $gt: new Date() },
  });
  if (blockedOtp) {
    return res.status(429).json({ message: 'Too many failed attempts. Please wait before retrying.' });
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiryMinutes = Number(process.env.OTP_EXPIRY_MINUTES || 10);
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  await Otp.deleteMany({ mobile: normalizedMobile, purpose, verified: false });
  await Otp.create({ mobile: normalizedMobile, otp: otpCode, purpose, expiresAt });

  // TODO: wire Twilio/WhatsApp provider. Never expose OTP outside non-production environments.
  const response = { message: 'OTP sent successfully', expiresInMinutes: expiryMinutes };
  if (['development', 'test'].includes(process.env.NODE_ENV)) response.otp = otpCode;
  res.json(response);
});

// POST /api/auth/verify-otp
const verifyOtp = asyncHandler(async (req, res) => {
  const { mobile, otp, purpose } = req.body;
  const normalizedMobile = normalizeMobile(mobile);

  const record = await Otp.findOne({ mobile: normalizedMobile, purpose, verified: false }).sort({ createdAt: -1 });
  if (!record) return res.status(400).json({ message: 'OTP not found or already used' });
  if (record.expiresAt < new Date()) return res.status(400).json({ message: 'OTP expired' });

  if (record.otp !== otp) {
    record.attempts += 1;
    await record.save();
    return res.status(400).json({ message: 'Incorrect OTP' });
  }

  record.verified = true;
  await record.save();

  const patient = await Patient.findOneAndUpdate(
    { mobile: normalizedMobile },
    { mobileVerified: true },
    { new: true }
  );

  if (!patient) {
    return res.json({ message: 'OTP verified', mobile: normalizedMobile, registered: false });
  }

  res.json({
    message: 'OTP verified',
    registered: true,
    ...buildPatientAuthResponse(patient),
  });
});

// POST /api/auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  const { email, mobile, otp, newPassword } = req.body;
  if ((!email && !mobile) || !otp || !newPassword) {
    return res.status(400).json({ message: 'email or mobile, otp, and newPassword are required' });
  }

  const normalizedMobile = normalizeMobile(mobile);
  if (normalizedMobile) {
    const record = await Otp.findOne({
      mobile: normalizedMobile,
      purpose: 'password_reset',
      otp,
      verified: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });
    if (!record) return res.status(400).json({ message: 'Invalid or expired OTP' });
    record.verified = true;
    await record.save();
  }

  const user = await findUserByIdentifier({ email, mobile });
  if (!user) return res.status(404).json({ message: 'User not found' });

  user.password = newPassword;
  await user.save();

  await writeAuditLog({
    req,
    action: 'password_reset',
    module: 'User',
    recordId: user._id,
  });

  res.json({ message: 'Password reset successfully' });
});

module.exports = {
  bootstrapAdmin,
  login,
  getMe,
  logout,
  changePassword,
  sendOtp,
  verifyOtp,
  resetPassword,
};
