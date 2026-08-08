import pino from "pino";
import pinoHttp from "pino-http";
import { config } from "../../config/src/index.js";

// Creates a structured logger for a service name.
function createLogger(serviceName) {
  return pino({
    level: config.logLevel,
    base: { service: serviceName },
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "password",
        "passwordHash",
        "refreshToken",
        "accessToken",
      ],
      censor: "[REDACTED]",
    },
  });
}

// Creates HTTP request logging middleware with request IDs.
function createHttpLogger(logger) {
  return pinoHttp({
    logger,
    customProps: (req) => ({
      requestId: req.context?.requestId,
      userId: req.context?.user?.id,
    }),
  });
}

export { createHttpLogger, createLogger };
