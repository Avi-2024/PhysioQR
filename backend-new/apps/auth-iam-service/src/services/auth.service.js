import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { config } from "../../../../packages/config/src/index.js";
import { AppError } from "../../../../packages/common/src/index.js";

// Creates Auth service business logic for login, refresh, and logout.
function createAuthService({ authRepository }) {
  // Removes sensitive fields from user responses.
  async function serializeUser(user) {
    const access = await authRepository.getUserPermissionKeys(user.id);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: user.status,
      tokenVersion: user.tokenVersion,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      permissions: access.permissions,
      roleIds: access.roleIds,
    };
  }

  // Hashes a refresh token before storage.
  function hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  // Reads a required JWT secret without hardcoding fallback secrets.
  function requireJwtSecret(value, code) {
    if (!value) {
      throw new AppError(500, "Authentication secret is not configured", code);
    }
    return value;
  }

  // Calculates refresh token expiration.
  function refreshExpiresAt() {
    const date = new Date();
    date.setDate(date.getDate() + config.auth.refreshExpiresDays);
    return date;
  }

  // Signs a short-lived access token without tenant data.
  function signAccessToken({ user, sessionId }) {
    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        tokenVersion: user.tokenVersion,
        sessionId,
      },
      requireJwtSecret(config.auth.accessSecret, "AUTH_ACCESS_SECRET_MISSING"),
      { expiresIn: config.auth.accessExpiresIn },
    );
  }

  // Signs a long-lived refresh token for one token family.
  function signRefreshToken({ user, tokenFamilyId }) {
    return jwt.sign(
      {
        sub: user.id,
        tokenVersion: user.tokenVersion,
        tokenFamilyId,
        type: "refresh",
      },
      requireJwtSecret(config.auth.refreshSecret, "AUTH_REFRESH_SECRET_MISSING"),
      { expiresIn: `${config.auth.refreshExpiresDays}d` },
    );
  }

  // Verifies an access token for internal service use.
  function verifyAccessToken(token) {
    return jwt.verify(token, requireJwtSecret(config.auth.accessSecret, "AUTH_ACCESS_SECRET_MISSING"));
  }

  // Verifies a refresh token and rejects access-token substitution.
  function verifyRefreshToken(token) {
    const payload = jwt.verify(token, requireJwtSecret(config.auth.refreshSecret, "AUTH_REFRESH_SECRET_MISSING"));
    if (payload.type !== "refresh") {
      throw new AppError(401, "Invalid refresh token", "AUTH_INVALID_REFRESH_TOKEN");
    }
    return payload;
  }

  // Creates both access and refresh tokens and stores a session.
  async function issueTokenPair({ user, ipAddress, userAgent, tokenFamilyId = crypto.randomUUID() }) {
    const refreshToken = signRefreshToken({ user, tokenFamilyId });
    const session = await authRepository.createSession({
      userId: user.id,
      refreshTokenHash: hashToken(refreshToken),
      tokenFamilyId,
      tokenVersion: user.tokenVersion,
      expiresAt: refreshExpiresAt(),
      ipAddress,
      userAgent,
    });

    return {
      accessToken: signAccessToken({ user, sessionId: session.id }),
      refreshToken,
      user: await serializeUser(user),
    };
  }

  // Authenticates a user by email and password.
  async function login(payload, context = {}) {
    const user = await authRepository.findUserByEmail(payload.email);
    if (!user || user.status !== "ACTIVE") {
      throw new AppError(401, "Invalid credentials", "AUTH_INVALID_CREDENTIALS");
    }

    const passwordMatches = await bcrypt.compare(payload.password, user.passwordHash);
    if (!passwordMatches) {
      throw new AppError(401, "Invalid credentials", "AUTH_INVALID_CREDENTIALS");
    }

    await authRepository.markLogin(user.id);
    return issueTokenPair({
      user,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
  }

  // Rotates a refresh token and detects replay attempts.
  async function refresh(refreshToken, context = {}) {
    if (!refreshToken) {
      throw new AppError(401, "Refresh token is required", "AUTH_REFRESH_TOKEN_REQUIRED");
    }

    const payload = verifyRefreshToken(refreshToken);
    const refreshTokenHash = hashToken(refreshToken);
    const session = await authRepository.findActiveSessionByRefreshHash(refreshTokenHash);

    if (!session) {
      if (payload.tokenFamilyId) {
        await authRepository.revokeTokenFamily(payload.tokenFamilyId);
      }
      throw new AppError(401, "Refresh token has been revoked", "AUTH_REFRESH_REPLAY_DETECTED");
    }

    const user = await authRepository.findUserById(session.userId);
    if (!user || user.status !== "ACTIVE" || user.tokenVersion !== session.tokenVersion) {
      await authRepository.revokeTokenFamily(session.tokenFamilyId);
      throw new AppError(401, "Session is no longer valid", "AUTH_SESSION_INVALID");
    }

    const nextRefreshToken = signRefreshToken({
      user,
      tokenFamilyId: session.tokenFamilyId,
    });
    const nextSession = await authRepository.rotateSession({
      currentSessionId: session.id,
      userId: user.id,
      refreshTokenHash: hashToken(nextRefreshToken),
      tokenFamilyId: session.tokenFamilyId,
      tokenVersion: user.tokenVersion,
      expiresAt: refreshExpiresAt(),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return {
      accessToken: signAccessToken({ user, sessionId: nextSession.id }),
      refreshToken: nextRefreshToken,
      user: await serializeUser(user),
    };
  }

  // Logs out by revoking the active refresh-token session.
  async function logout(refreshToken) {
    if (!refreshToken) {
      return { revoked: false };
    }

    const session = await authRepository.findActiveSessionByRefreshHash(hashToken(refreshToken));
    if (!session) {
      return { revoked: false };
    }

    await authRepository.revokeSession(session.id);
    return { revoked: true };
  }

  // Reads the current authenticated user.
  async function me(context = {}) {
    const userId = context.user?.id;
    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw new AppError(404, "User not found", "AUTH_USER_NOT_FOUND");
    }
    return serializeUser(user);
  }

  return Object.freeze({
    login,
    logout,
    me,
    refresh,
    verifyAccessToken,
  });
}

export { createAuthService };
