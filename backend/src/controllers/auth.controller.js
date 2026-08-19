const User = require('../models/User.model');
const Patient = require('../models/Patient.model');
const otpService = require('../services/otp.service');
const authSessionService = require('../services/authSession.service');
const { writeAuditLog } = require('../utils/auditLogger');
const asyncHandler = require('../utils/asyncHandler');

const normalizeEmail = (email) => email?.trim().toLowerCase();
const normalizeMobile = (mobile) => mobile?.trim();

// Parses duration strings like 30d into milliseconds for cookie maxAge.
const parseDurationMs = (value, fallbackMs) => {
  if (!value) return fallbackMs;
  const match = String(value).trim().match(/^(\d+)(ms|s|m|h|d)?$/);
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  const unit = match[2] || 'ms';
  const multipliers = { ms: 1, s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return amount * multipliers[unit];
};

// Returns secure cookie options for auth tokens.
const getCookieOptions = (maxAge) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge,
  path: '/',
});

// Writes access and refresh cookies for browser clients.
const setAuthCookies = (res, { accessToken, refreshToken }) => {
  res.cookie(
    authSessionService.ACCESS_COOKIE_NAME,
    accessToken,
    getCookieOptions(parseDurationMs(process.env.JWT_ACCESS_EXPIRES_IN || process.env.JWT_EXPIRES_IN || '15m', 15 * 60 * 1000))
  );
  res.cookie(
    authSessionService.REFRESH_COOKIE_NAME,
    refreshToken,
    getCookieOptions(parseDurationMs(process.env.JWT_REFRESH_EXPIRES_IN || '30d', 30 * 24 * 60 * 60 * 1000))
  );
};

// Clears auth cookies on logout or failed session usage.
const clearAuthCookies = (res) => {
  res.clearCookie(authSessionService.ACCESS_COOKIE_NAME, { path: '/' });
  res.clearCookie(authSessionService.REFRESH_COOKIE_NAME, { path: '/' });
};

// Builds a sanitized staff auth payload.
const sanitizeUser = (user) => ({
  id: user._id,
  role: user.role,
  email: user.email,
  mobile: user.mobile,
  status: user.status,
  profileRef: user.profileRef,
  profileModel: user.profileModel,
});

// Builds a sanitized patient auth payload.
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

// Creates session-backed response for Admin, Agent, and Doctor.
const buildUserAuthResponse = async ({ user, req, res }) => {
  const auth = await authSessionService.createAuthSession({
    owner: user,
    role: user.role,
    tokenType: 'user',
    req,
  });
  setAuthCookies(res, auth);
  return {
    token: auth.accessToken,
    accessToken: auth.accessToken,
    refreshToken: auth.refreshToken,
    sessionId: auth.session._id,
    role: user.role,
    user: sanitizeUser(user),
  };
};

// Creates session-backed response for Patient OTP auth.
const buildPatientAuthResponse = async ({ patient, req, res }) => {
  const auth = await authSessionService.createAuthSession({
    owner: patient,
    role: 'patient',
    tokenType: 'patient',
    req,
  });
  setAuthCookies(res, auth);
  return {
    token: auth.accessToken,
    accessToken: auth.accessToken,
    refreshToken: auth.refreshToken,
    sessionId: auth.session._id,
    role: 'patient',
    patient: sanitizePatient(patient),
  };
};

// Finds staff user by email or mobile.
const findUserByIdentifier = ({ email, mobile }) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedMobile = normalizeMobile(mobile);
  if (!normalizedEmail && !normalizedMobile) return null;
  return User.findOne(normalizedEmail ? { email: normalizedEmail } : { mobile: normalizedMobile });
};

// Gets refresh token from body or HTTP-only cookie.
const getRefreshToken = (req) => req.body?.refreshToken || req.cookies?.[authSessionService.REFRESH_COOKIE_NAME];

// POST /api/auth/bootstrap-admin
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

  res.status(201).json(await buildUserAuthResponse({ user: admin, req, res }));
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

  res.json(await buildUserAuthResponse({ user, req, res }));
});

// POST /api/auth/refresh
const refresh = asyncHandler(async (req, res) => {
  const auth = await authSessionService.rotateRefreshSession({ refreshToken: getRefreshToken(req), req });
  setAuthCookies(res, auth);
  res.json({
    token: auth.accessToken,
    accessToken: auth.accessToken,
    refreshToken: auth.refreshToken,
    sessionId: auth.session._id,
    role: auth.session.role,
  });
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
const logout = asyncHandler(async (req, res) => {
  await authSessionService.revokeRefreshSession(getRefreshToken(req), 'logout');
  clearAuthCookies(res);
  res.json({ message: 'Logged out' });
});

// GET /api/auth/sessions
const getSessions = asyncHandler(async (req, res) => {
  const sessions = await authSessionService.listActiveSessions(req);
  res.json({ sessions });
});

// DELETE /api/auth/sessions/:id
const revokeSession = asyncHandler(async (req, res) => {
  const sessions = await authSessionService.listActiveSessions(req);
  const session = sessions.find((item) => item._id.toString() === req.params.id);
  if (!session) return res.status(404).json({ message: 'Session not found' });

  session.revokedAt = new Date();
  session.revokedReason = 'manual_revoke';
  await session.save();
  res.json({ message: 'Session revoked' });
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
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  await authSessionService.revokeOwnerSessions({ ownerType: 'user', ownerId: user._id, reason: 'password_changed' });
  clearAuthCookies(res);

  await writeAuditLog({
    req,
    action: 'password_changed',
    module: 'User',
    recordId: user._id,
  });

  res.json({ message: 'Password changed successfully. Please sign in again.' });
});

// POST /api/auth/send-otp
const sendOtp = asyncHandler(async (req, res) => {
  const { mobile, purpose } = req.body;
  const result = await otpService.sendOtp({ mobile, purpose });
  res.json({ message: 'OTP sent successfully', ...result });
});

// POST /api/auth/verify-otp
const verifyOtp = asyncHandler(async (req, res) => {
  const { mobile, otp, purpose } = req.body;
  const verification = await otpService.verifyOtp({ mobile, otp, purpose });
  const normalizedMobile = verification.mobile;

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
    ...(await buildPatientAuthResponse({ patient, req, res })),
  });
});

// POST /api/auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  res.status(400).json({
    message: 'OTP password reset is disabled for Admin, Agent, and Doctor accounts. Use authenticated change-password or Admin-managed credential reset.',
  });
});

module.exports = {
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
};
