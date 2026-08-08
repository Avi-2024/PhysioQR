import { config } from "../../../../packages/config/src/index.js";

// Creates HTTP handlers for authentication endpoints.
function createAuthController({ authService }) {
  // Builds request metadata for session tracking.
  function sessionContext(req) {
    return {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || null,
    };
  }

  // Sets the refresh token as an HTTP-only cookie.
  function setRefreshCookie(res, refreshToken) {
    res.cookie(config.auth.refreshCookieName, refreshToken, {
      httpOnly: true,
      secure: config.auth.cookieSecure,
      sameSite: "lax",
      path: "/",
      maxAge: config.auth.refreshExpiresDays * 24 * 60 * 60 * 1000,
    });
  }

  // Clears the refresh token cookie.
  function clearRefreshCookie(res) {
    res.clearCookie(config.auth.refreshCookieName, {
      httpOnly: true,
      secure: config.auth.cookieSecure,
      sameSite: "lax",
      path: "/",
    });
  }

  // Reads the refresh token from cookie or body.
  function readRefreshToken(req) {
    return req.cookies?.[config.auth.refreshCookieName] || req.validated?.body?.refreshToken || null;
  }

  // Removes refresh tokens from public JSON responses.
  function publicAuthResult(result) {
    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  // Logs in a user and returns tokens.
  async function login(req, res) {
    const result = await authService.login(req.validated.body, sessionContext(req));
    setRefreshCookie(res, result.refreshToken);
    res.status(200).json({ data: publicAuthResult(result) });
  }

  // Rotates the refresh token and clears stale cookies when rotation fails.
  async function refresh(req, res) {
    try {
      const result = await authService.refresh(readRefreshToken(req), sessionContext(req));
      setRefreshCookie(res, result.refreshToken);
      res.status(200).json({ data: publicAuthResult(result) });
    } catch (error) {
      clearRefreshCookie(res);
      throw error;
    }
  }

  // Logs out the active refresh-token session.
  async function logout(req, res) {
    const result = await authService.logout(readRefreshToken(req));
    clearRefreshCookie(res);
    res.status(200).json({ data: result });
  }

  // Returns the current authenticated user.
  async function me(req, res) {
    const result = await authService.me(req.context);
    res.status(200).json({ data: result });
  }

  return Object.freeze({
    login,
    logout,
    me,
    refresh,
  });
}

export { createAuthController };
