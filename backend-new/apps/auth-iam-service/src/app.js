import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { errorHandler, notFoundHandler, requestContext } from "../../../packages/common/src/index.js";
import { createHttpLogger, createLogger } from "../../../packages/logger/src/index.js";
import { config } from "../../../packages/config/src/index.js";
import {
  WORKER_WAKE_CHANNELS,
  createRealtimeChannelPublisher,
} from "../../../packages/realtime/src/index.js";
import { createAuthPrismaClient } from "./prisma.js";
import { createAuthRepository } from "./repositories/auth.repository.js";
import { createIamRepository } from "./repositories/iam.repository.js";
import { createAuthService } from "./services/auth.service.js";
import { createIamService } from "./services/iam.service.js";
import { createAuthController } from "./controllers/auth.controller.js";
import { createIamController } from "./controllers/iam.controller.js";
import { createAuthRoutes } from "./routes/auth.routes.js";
import { createIamRoutes } from "./routes/iam.routes.js";
import { createInternalRoutes } from "./routes/internal.routes.js";
import { ensureDevelopmentBootstrapUser } from "./bootstrap.js";

// Creates a fail-open publisher that wakes the Auth outbox worker after permission commits.
function createAuthOutboxWakePublisher(logger) {
  try {
    return createRealtimeChannelPublisher({
      enabled: config.workers.wakeEnabled,
      channel: WORKER_WAKE_CHANNELS.AUTH_OUTBOX,
      redisUrl: config.realtime.redisUrl,
      redisRestUrl: config.realtime.redisRestUrl,
      redisRestToken: config.realtime.redisRestToken,
      logger,
      name: "auth-outbox-wake-publisher",
    });
  } catch (error) {
    logger.warn({ err: error }, "Auth outbox wake publisher disabled; recovery sweep remains active");
    return createRealtimeChannelPublisher({ enabled: false });
  }
}

// Wakes the Auth outbox worker only after a role permission transaction succeeds.
function createAuthOutboxWakeMiddleware({ publisher, logger }) {
  return function authOutboxWakeMiddleware(req, res, next) {
    const shouldWake = req.method === "POST" && /^\/roles\/[^/?]+\/permissions(?:\?|$)/.test(req.originalUrl);
    if (shouldWake) {
      res.once("finish", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) return;
        void publisher.publish({ occurredAt: new Date().toISOString() }).catch((error) => {
          logger.warn({ err: error }, "Auth outbox wake signal failed; recovery sweep will process pending work");
        });
      });
    }
    next();
  };
}

// Creates the Auth/IAM Express application and dependencies.
function createAuthIamApp({ prisma = createAuthPrismaClient() } = {}) {
  const logger = createLogger("auth-iam-service");
  const authRepository = createAuthRepository(prisma);
  const iamRepository = createIamRepository(prisma);
  const authService = createAuthService({ authRepository });
  const iamService = createIamService({ iamRepository });
  const authController = createAuthController({ authService });
  const iamController = createIamController({ iamService });
  const authOutboxWakePublisher = createAuthOutboxWakePublisher(logger);
  const app = express();

  app.use(helmet());
  app.use(cors({ credentials: true, origin: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(requestContext);
  app.use(createHttpLogger(logger));
  app.use(createAuthOutboxWakeMiddleware({ publisher: authOutboxWakePublisher, logger }));

  app.get("/health", (_req, res) => res.status(200).json({ status: "ok", service: "auth-iam-service" }));
  app.use("/internal", createInternalRoutes({ iamController }));
  app.use("/auth", createAuthRoutes({ authController }));
  app.use("/", createIamRoutes({ iamController, iamService }));
  app.use(notFoundHandler);
  app.use(errorHandler(logger));

  app.locals.bootstrap = async () => {
    await ensureDevelopmentBootstrapUser({
      prisma,
      authRepository,
      logger,
      email: process.env.BOOTSTRAP_EMAIL || "royalit@gmail.com",
      password: process.env.BOOTSTRAP_PASSWORD || "12345678",
      userName: process.env.BOOTSTRAP_USER_NAME || "Royal IT Admin",
    });
  };

  return app;
}

export { createAuthIamApp };
