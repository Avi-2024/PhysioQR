import jwt from "jsonwebtoken";
import { config } from "../../config/src/index.js";
import { AppError } from "./errors.js";

// Extracts a bearer token from an Authorization header.
function extractBearerToken(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

// Requires a verified JWT and attaches the user context.
function requireAuth(req, _res, next) {
  const token = extractBearerToken(req);
  if (!token) {
    return next(new AppError(401, "Access token is required", "AUTH_TOKEN_REQUIRED"));
  }

  try {
    const payload = jwt.verify(token, config.auth.accessSecret);
    req.context.user = {
      id: payload.sub,
      email: payload.email,
      tokenVersion: payload.tokenVersion,
      sessionId: payload.sessionId,
    };
    req.context.rawAuthorization = req.headers.authorization;
    return next();
  } catch {
    return next(new AppError(401, "Invalid or expired access token", "AUTH_INVALID_TOKEN"));
  }
}

export { extractBearerToken, requireAuth };
