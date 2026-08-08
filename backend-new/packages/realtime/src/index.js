import { Redis as UpstashRedis } from "@upstash/redis";
import { createClient } from "redis";

const REALTIME_CHANNELS = Object.freeze({
  LEAD_EVENTS: "crm:events:lead",
});

const WORKER_WAKE_CHANNELS = Object.freeze({
  AUTH_OUTBOX: "crm:workers:wake:auth-outbox",
  LEAD_OUTBOX: "crm:workers:wake:lead-outbox",
  META: "crm:workers:wake:meta",
  QUOTATION_DOCUMENTS: "crm:workers:wake:quotation-documents",
});

const REALTIME_TRANSPORTS = Object.freeze({
  REDIS_SOCKET: "redis-socket",
  UPSTASH_REST: "upstash-rest",
});

// Builds a Redis-safe realtime envelope without exposing lead PII.
function createRealtimeEnvelope({ eventId, eventName, aggregateId, payload = {}, occurredAt = new Date().toISOString() }) {
  return {
    eventId,
    eventName,
    aggregateId: aggregateId || null,
    payload,
    occurredAt,
  };
}

// Parses a Redis realtime message and rejects malformed envelopes.
function parseRealtimeEnvelope(message) {
  const envelope = typeof message === "string" ? JSON.parse(message) : message;
  if (!envelope?.eventName || !envelope?.eventId) {
    throw new Error("Invalid realtime event envelope");
  }
  return envelope;
}

// Checks whether a Redis URL points to an HTTP REST endpoint.
function isHttpRedisUrl(url) {
  return /^https?:\/\//i.test(String(url || "").trim());
}

// Selects the realtime broker transport from environment-backed config.
function resolveRealtimeTransport({ redisUrl, redisRestUrl, redisRestToken } = {}) {
  const restUrl = redisRestUrl || (isHttpRedisUrl(redisUrl) ? redisUrl : null);
  if (restUrl) {
    if (!redisRestToken) {
      throw new Error("REDIS_REST_TOKEN or UPSTASH_REDIS_REST_TOKEN is required when using an HTTPS Redis REST URL");
    }
    return {
      type: REALTIME_TRANSPORTS.UPSTASH_REST,
      redisRestUrl: restUrl,
      redisRestToken,
    };
  }
  if (!redisUrl) {
    throw new Error("REDIS_URL is required for realtime Redis clients");
  }
  return {
    type: REALTIME_TRANSPORTS.REDIS_SOCKET,
    redisUrl,
  };
}

// Creates a Redis client with conservative reconnect behavior for realtime use.
function createRealtimeRedisClient({ url, logger, name = "realtime" } = {}) {
  if (!url) {
    throw new Error("REDIS_URL is required for realtime Redis clients");
  }
  if (isHttpRedisUrl(url)) {
    throw new Error("REDIS_URL uses HTTPS REST format; use createUpstashRealtimePublisher/subscriber or a redis:// or rediss:// URL");
  }

  const client = createClient({
    url,
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 100, 5000),
    },
  });

  client.on("error", (error) => {
    logger?.error?.({ err: error, redisClient: name }, "Realtime Redis client error");
  });

  client.on("reconnecting", () => {
    logger?.warn?.({ redisClient: name }, "Realtime Redis client reconnecting");
  });

  return client;
}

// Creates an Upstash REST Redis client without exposing secrets to logs.
function createUpstashRedisRestClient({ url, token } = {}) {
  if (!url || !token) {
    throw new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required for Upstash REST realtime");
  }
  if (!isHttpRedisUrl(url)) {
    throw new Error("UPSTASH_REDIS_REST_URL must be an https:// URL");
  }
  return new UpstashRedis({
    url,
    token,
    automaticDeserialization: false,
    enableTelemetry: false,
  });
}

// Creates a REST publisher for environments that cannot use Redis TCP sockets.
function createUpstashRealtimePublisher({ url, token, channel = REALTIME_CHANNELS.LEAD_EVENTS } = {}) {
  const client = createUpstashRedisRestClient({ url, token });
  return {
    enabled: true,
    transport: REALTIME_TRANSPORTS.UPSTASH_REST,
    publish: async (envelope) => client.publish(channel, JSON.stringify(envelope)),
    close: async () => undefined,
  };
}

// Detects idle stream timeouts from undici/Upstash so subscribers can reconnect cleanly.
function isRecoverableSubscriptionError(error) {
  return error?.code === "UND_ERR_BODY_TIMEOUT"
    || error?.cause?.code === "UND_ERR_BODY_TIMEOUT"
    || error?.name === "BodyTimeoutError"
    || error?.cause?.name === "BodyTimeoutError";
}

// Creates a REST streaming subscriber compatible with the gateway event handler.
function createUpstashRealtimeSubscriber({ url, token, logger, name = "upstash-realtime-subscriber" } = {}) {
  const client = createUpstashRedisRestClient({ url, token });
  let subscriber = null;
  let activeChannel = null;
  let activeHandler = null;
  let reconnectTimer = null;
  let reconnectAttempts = 0;
  let closed = false;

  // Opens a fresh Upstash subscription stream for the active channel.
  function openSubscription() {
    if (closed || !activeChannel || !activeHandler) return;
    subscriber = client.subscribe(activeChannel);
    subscriber.on("message", ({ message }) => activeHandler(message));
    subscriber.on("error", (error) => {
      const recoverable = isRecoverableSubscriptionError(error);
      const log = recoverable ? logger?.warn : logger?.error;
      log?.({ err: error, redisClient: name }, recoverable
        ? "Realtime Upstash REST subscriber reconnecting after idle timeout"
        : "Realtime Upstash REST subscriber error");
      scheduleReconnect();
    });
    subscriber.on("subscribe", (count) => {
      reconnectAttempts = 0;
      logger?.info?.({ redisClient: name, subscriptions: count }, "Realtime Upstash REST subscriber connected");
    });
  }

  // Reopens the subscription after a short bounded backoff.
  function scheduleReconnect() {
    if (closed || reconnectTimer) return;
    const delayMs = Math.min(1000 * 2 ** reconnectAttempts, 30000);
    reconnectAttempts += 1;
    reconnectTimer = setTimeout(async () => {
      reconnectTimer = null;
      await Promise.allSettled([subscriber?.unsubscribe()]);
      subscriber = null;
      openSubscription();
    }, delayMs);
    reconnectTimer.unref?.();
  }

  // Stops the active subscriber stream and any pending reconnect.
  async function closeSubscription() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    await Promise.allSettled([subscriber?.unsubscribe()]);
    subscriber = null;
  }

  return {
    transport: REALTIME_TRANSPORTS.UPSTASH_REST,
    connect: async () => undefined,
    subscribe: async (channel, onMessage) => {
      closed = false;
      activeChannel = channel;
      activeHandler = onMessage;
      await closeSubscription();
      openSubscription();
    },
    unsubscribe: async (_channel) => {
      await closeSubscription();
    },
    quit: async () => {
      closed = true;
      activeChannel = null;
      activeHandler = null;
      await closeSubscription();
    },
  };
}

// Serializes one channel payload consistently across Redis transports.
function serializeChannelMessage(message) {
  return typeof message === "string" ? message : JSON.stringify(message || {});
}

// Creates a lazy Redis channel publisher that does not block HTTP service startup.
function createRealtimeChannelPublisher({
  enabled = true,
  channel,
  redisUrl,
  redisRestUrl,
  redisRestToken,
  logger,
  name = "realtime-channel-publisher",
} = {}) {
  if (!enabled) {
    return {
      enabled: false,
      publish: async () => false,
      close: async () => undefined,
    };
  }
  if (!channel) throw new Error("A Redis channel is required");

  const transport = resolveRealtimeTransport({ redisUrl, redisRestUrl, redisRestToken });
  if (transport.type === REALTIME_TRANSPORTS.UPSTASH_REST) {
    const publisher = createUpstashRealtimePublisher({
      url: transport.redisRestUrl,
      token: transport.redisRestToken,
      channel,
    });
    return { ...publisher, channel };
  }

  const client = createRealtimeRedisClient({ url: transport.redisUrl, logger, name });
  let connectPromise = null;

  // Opens the TCP connection once and shares concurrent connection attempts.
  async function ensureConnected() {
    if (client.isOpen) return;
    if (!connectPromise) {
      connectPromise = client.connect().finally(() => {
        connectPromise = null;
      });
    }
    await connectPromise;
  }

  return {
    enabled: true,
    channel,
    transport: REALTIME_TRANSPORTS.REDIS_SOCKET,
    publish: async (message = {}) => {
      await ensureConnected();
      return client.publish(channel, serializeChannelMessage(message));
    },
    close: async () => {
      if (client.isOpen) await client.quit();
    },
  };
}

// Creates a coalescing signal so bursts wake a worker without creating an in-memory queue.
function createWakeSignal() {
  let pending = false;
  let closed = false;
  let waiter = null;

  // Releases the current waiter or retains one pending wake for the next wait.
  function notify() {
    if (closed) return;
    if (!waiter) {
      pending = true;
      return;
    }
    const current = waiter;
    waiter = null;
    clearTimeout(current.timer);
    current.resolve("signal");
  }

  // Waits for a Redis hint or the durable database recovery deadline.
  function wait(timeoutMs) {
    if (closed) return Promise.resolve("closed");
    if (pending) {
      pending = false;
      return Promise.resolve("signal");
    }
    if (waiter) throw new Error("Worker wake signal already has an active waiter");

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (!waiter) return;
        waiter = null;
        resolve("timeout");
      }, Math.max(0, Number(timeoutMs) || 0));
      waiter = { resolve, timer };
    });
  }

  // Closes the signal and releases a worker waiting during shutdown.
  function close() {
    closed = true;
    pending = false;
    if (!waiter) return;
    const current = waiter;
    waiter = null;
    clearTimeout(current.timer);
    current.resolve("closed");
  }

  return Object.freeze({ close, notify, wait });
}

// Creates a Redis subscription that wakes a worker while retaining timeout recovery.
function createWorkerWakeListener({
  enabled = true,
  channel,
  redisUrl,
  redisRestUrl,
  redisRestToken,
  logger,
  name = "worker-wake-listener",
} = {}) {
  const signal = createWakeSignal();
  if (!enabled) {
    return {
      enabled: false,
      connect: async () => undefined,
      interrupt: signal.notify,
      wait: signal.wait,
      close: async () => signal.close(),
    };
  }
  if (!channel) throw new Error("A Redis worker wake channel is required");

  const transport = resolveRealtimeTransport({ redisUrl, redisRestUrl, redisRestToken });
  const subscriber = transport.type === REALTIME_TRANSPORTS.UPSTASH_REST
    ? createUpstashRealtimeSubscriber({
        url: transport.redisRestUrl,
        token: transport.redisRestToken,
        logger,
        name,
      })
    : createRealtimeRedisClient({ url: transport.redisUrl, logger, name });
  let connected = false;

  return {
    enabled: true,
    channel,
    transport: transport.type,
    connect: async () => {
      if (connected) return;
      await subscriber.connect();
      await subscriber.subscribe(channel, signal.notify);
      connected = true;
    },
    interrupt: signal.notify,
    wait: signal.wait,
    close: async () => {
      signal.close();
      if (!connected) return;
      await Promise.allSettled([subscriber.unsubscribe(channel)]);
      await Promise.allSettled([subscriber.quit()]);
      connected = false;
    },
  };
}

export {
  REALTIME_CHANNELS,
  REALTIME_TRANSPORTS,
  WORKER_WAKE_CHANNELS,
  createRealtimeChannelPublisher,
  createRealtimeEnvelope,
  createRealtimeRedisClient,
  createUpstashRealtimePublisher,
  createUpstashRealtimeSubscriber,
  createWakeSignal,
  createWorkerWakeListener,
  isHttpRedisUrl,
  isRecoverableSubscriptionError,
  parseRealtimeEnvelope,
  resolveRealtimeTransport,
};
