import { config } from "../../config/src/index.js";
import { AppError } from "./errors.js";

// Requires the configured internal service secret for service-to-service APIs.
function requireInternalService(req, _res, next) {
  const expected = config.internal.serviceSecret;
  const actual = req.headers["x-internal-service-secret"];

  if (!expected) {
    return next(new AppError(500, "Internal service secret is not configured", "INTERNAL_SERVICE_SECRET_MISSING"));
  }

  if (!actual || actual !== expected) {
    return next(new AppError(401, "Internal service authentication failed", "INTERNAL_SERVICE_UNAUTHORIZED"));
  }

  req.context.user = {
    id: "integration-service",
    email: "integration-service@internal",
    system: true,
  };
  return next();
}

export { requireInternalService };
