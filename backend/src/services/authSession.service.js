const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const AuthSession = require('../models/AuthSession.model');
const User = require('../models/User.model');
const Patient = require('../models/Patient.model');

const ACCESS_COOKIE_NAME = process.env.ACCESS_TOKEN_COOKIE_NAME || 'physioqr_access';
const REFRESH_COOKIE_NAME = process.env.REFRESH_TOKEN_COOKIE_NAME || 'physioqr_refresh';

// Creates an HTTP-aware service error.
const authError = (message, status = 401) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

// Parses duration strings like 7d, 15m, or 3600s into milliseconds.
const parseDurationMs = (value, fallbackMs) => {
  if (!value) return fallbackMs;
  const match = String(value).trim().match(/^(\d+)(ms|s|m|h|d)?$/);
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  const unit = match[2] || 'ms';
  const multipliers = { ms: 1, s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return amount * multipliers[unit];
};

// Hashes refresh tokens before storage and lookup.
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Generates a cryptographically strong opaque refresh token.
const generateRefreshToken = () => crypto.randomBytes(48).toString('base64url');

// Returns common request metadata for sessions.
const getRequestMeta = (req) => ({
  userAgent: req?.headers?.['user-agent'],
  ipAddress: req?.ip,
});

// Builds an access token with token version and session binding.
const createAccessToken = ({ owner, role, tokenType, sessionId }) => {
  if (!process.env.JWT_SECRET) throw authError('JWT_SECRET is not configured', 503);

  return jwt.sign(
    {
      id: owner._id,
      role,
      tokenType,
      tokenVersion: owner.tokenVersion || 0,
      sessionId,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || process.env.JWT_EXPIRES_IN || '15m' }
  );
};

// Creates a refresh session and matching access token.
const createAuthSession = async ({ owner, role, tokenType, req }) => {
  const refreshToken = generateRefreshToken();
  const expiresMs = parseDurationMs(process.env.JWT_REFRESH_EXPIRES_IN || '30d', 30 * 24 * 60 * 60 * 1000);
  const session = await AuthSession.create({
    ownerType: tokenType === 'patient' ? 'patient' : 'user',
    user: tokenType === 'patient' ? undefined : owner._id,
    patient: tokenType === 'patient' ? owner._id : undefined,
    role,
    tokenHash: hashToken(refreshToken),
    tokenVersion: owner.tokenVersion || 0,
    expiresAt: new Date(Date.now() + expiresMs),
    ...getRequestMeta(req),
  });

  const accessToken = createAccessToken({ owner, role, tokenType, sessionId: session._id });
  return { accessToken, refreshToken, session };
};

// Resolves a refresh token session and owner.
const loadRefreshSession = async (refreshToken) => {
  if (!refreshToken) throw authError('Refresh token is required');

  const session = await AuthSession.findOne({ tokenHash: hashToken(refreshToken) });
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw authError('Refresh token is invalid or expired');
  }

  const owner = session.ownerType === 'patient'
    ? await Patient.findById(session.patient)
    : await User.findById(session.user);
  if (!owner) throw authError('Session owner not found');
  if (owner.status !== 'active') throw authError(`Account is ${owner.status}`, 403);
  if ((owner.tokenVersion || 0) !== session.tokenVersion) throw authError('Session token version is no longer valid');

  return { session, owner };
};

// Rotates a refresh token and returns a new access/refresh pair.
const rotateRefreshSession = async ({ refreshToken, req }) => {
  const { session, owner } = await loadRefreshSession(refreshToken);
  const next = await createAuthSession({
    owner,
    role: session.role,
    tokenType: session.ownerType === 'patient' ? 'patient' : 'user',
    req,
  });

  session.revokedAt = new Date();
  session.revokedReason = 'rotated';
  session.replacedBy = next.session._id;
  session.lastUsedAt = new Date();
  await session.save();

  return next;
};

// Revokes a single refresh session.
const revokeRefreshSession = async (refreshToken, reason = 'logout') => {
  if (!refreshToken) return null;
  const session = await AuthSession.findOne({ tokenHash: hashToken(refreshToken) });
  if (!session || session.revokedAt) return session;
  session.revokedAt = new Date();
  session.revokedReason = reason;
  await session.save();
  return session;
};

// Lists active sessions for the authenticated user or patient.
const listActiveSessions = async (req) => {
  const filter = {
    ownerType: req.user.role === 'patient' ? 'patient' : 'user',
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  };
  if (req.user.role === 'patient') filter.patient = req.user._id;
  else filter.user = req.user._id;
  return AuthSession.find(filter).sort({ createdAt: -1 }).select('-tokenHash');
};

// Revokes all active sessions for a user/patient owner.
const revokeOwnerSessions = async ({ ownerType, ownerId, reason }) => {
  const filter = { ownerType, revokedAt: null };
  if (ownerType === 'patient') filter.patient = ownerId;
  else filter.user = ownerId;
  await AuthSession.updateMany(filter, { revokedAt: new Date(), revokedReason: reason });
};

module.exports = {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  createAccessToken,
  createAuthSession,
  rotateRefreshSession,
  revokeRefreshSession,
  listActiveSessions,
  revokeOwnerSessions,
};
