import { config } from "../../../packages/config/src/index.js";
import { createLogger } from "../../../packages/logger/src/index.js";
import {
  WORKER_WAKE_CHANNELS,
  createWorkerWakeListener,
} from "../../../packages/realtime/src/index.js";
import { createAuthPrismaClient } from "./prisma.js";

// Publishes pending Auth/IAM outbox events to the current logger-backed transport.
async function publishAuthOutboxBatch({ prisma = createAuthPrismaClient(), limit = 50 } = {}) {
  const logger = createLogger("auth-iam-outbox-worker");
  const events = await prisma.outboxEvent.findMany({
    where: { publishedAt: null },
    take: limit,
    orderBy: { createdAt: "asc" },
  });

  for (const event of events) {
    logger.info({ eventName: event.eventName, aggregateId: event.aggregateId }, "Publishing outbox event");
    await prisma.outboxEvent.update({
      where: { id: event.id },
      data: { publishedAt: new Date() },
    });
  }

  return { processed: events.length };
}

// Prevents accidental zero-delay worker loops from saturating the server.
function normalizeWorkerInterval(intervalMs) {
  return Math.max(1000, Number.isFinite(Number(intervalMs)) ? Number(intervalMs) : config.auth.outboxWorkerRecoveryIntervalMs);
}

// Creates the Redis listener used to wake the Auth outbox worker after permission writes.
function createAuthOutboxWakeListener({ logger = createLogger("auth-iam-outbox-worker") } = {}) {
  return createWorkerWakeListener({
    enabled: config.workers.wakeEnabled,
    channel: WORKER_WAKE_CHANNELS.AUTH_OUTBOX,
    redisUrl: config.realtime.redisUrl,
    redisRestUrl: config.realtime.redisRestUrl,
    redisRestToken: config.realtime.redisRestToken,
    logger,
    name: "auth-outbox-wake-listener",
  });
}

// Continuously drains Auth/IAM outbox events for the production process.
async function runAuthOutboxWorkerLoop({
  intervalMs = config.auth.outboxWorkerRecoveryIntervalMs,
  limit = config.auth.outboxWorkerBatchSize,
  iterations = Number.POSITIVE_INFINITY,
  prisma = createAuthPrismaClient(),
  wakeListenerFactory = createAuthOutboxWakeListener,
  logger = createLogger("auth-iam-outbox-worker"),
} = {}) {
  let stopping = false;
  let wakeListener = wakeListenerFactory({ logger });
  const stop = () => {
    stopping = true;
    wakeListener.interrupt();
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  try {
    const normalizedIntervalMs = normalizeWorkerInterval(intervalMs);
    try {
      await wakeListener.connect();
    } catch (error) {
      logger.warn?.({ err: error }, "Auth outbox wake listener unavailable; using recovery sweep");
      await wakeListener.close();
      wakeListener = createWorkerWakeListener({ enabled: false });
    }
    for (let iteration = 0; !stopping && iteration < iterations; iteration += 1) {
      let shouldDrainImmediately = false;
      try {
        const result = await publishAuthOutboxBatch({ prisma, limit });
        shouldDrainImmediately = result.processed >= limit;
        const log = result.processed > 0 ? logger.info.bind(logger) : logger.debug.bind(logger);
        log(result, "Processed Auth/IAM outbox batch");
      } catch (error) {
        logger.error({ err: error }, "Auth/IAM outbox worker iteration failed");
      }
      if (!stopping && iteration + 1 < iterations && !shouldDrainImmediately) {
        await wakeListener.wait(normalizedIntervalMs);
      }
    }
  } finally {
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
    await Promise.allSettled([wakeListener.close(), prisma.$disconnect()]);
  }
}

// Runs the Auth/IAM outbox worker once from the command line.
async function runAuthOutboxWorkerOnce() {
  const prisma = createAuthPrismaClient();
  try {
    const result = await publishAuthOutboxBatch({ prisma, limit: config.auth.outboxWorkerBatchSize });
    console.log(JSON.stringify(result));
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.endsWith("workers.outbox.js")) {
  const shouldRunOnce = process.argv.includes("--once") || process.env.AUTH_OUTBOX_WORKER_ONCE === "true";
  const runner = shouldRunOnce ? runAuthOutboxWorkerOnce : runAuthOutboxWorkerLoop;
  runner().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { publishAuthOutboxBatch, runAuthOutboxWorkerLoop };
