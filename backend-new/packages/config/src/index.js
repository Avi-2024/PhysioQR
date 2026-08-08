import dotenv from "dotenv";

dotenv.config();

// Reads an environment variable with an optional fallback.
function readEnv(key, fallback = undefined) {
  const value = process.env[key];
  return value === undefined || value === "" ? fallback : value;
}

// Reads an integer environment variable with a safe fallback.
function readIntEnv(key, fallback) {
  const value = Number(readEnv(key, fallback));
  return Number.isInteger(value) ? value : fallback;
}

// Reads a boolean environment variable with a safe fallback.
function readBoolEnv(key, fallback) {
  const value = readEnv(key);
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

// Returns the REDIS_URL value only when it is an Upstash-style REST URL.
function readRedisRestUrlFallback(redisUrl) {
  return /^https?:\/\//i.test(String(redisUrl || "").trim()) ? redisUrl : undefined;
}

const realtimeRedisUrl = readEnv("REDIS_URL");
const workerRecoveryIntervalMs = readIntEnv("WORKER_RECOVERY_INTERVAL_MS", 60000);

const config = Object.freeze({
  nodeEnv: readEnv("NODE_ENV", "development"),
  logLevel: readEnv("LOG_LEVEL", "info"),
  gateway: {
    port: readIntEnv("API_GATEWAY_PORT", readIntEnv("PORT", 4000)),
    proxyTimeoutMs: readIntEnv("API_GATEWAY_PROXY_TIMEOUT_MS", 30000),
  },
  database: {
    url: readEnv("SOLOCRM_DATABASE_URL"),
    authIamSchema: readEnv("AUTH_IAM_DATABASE_SCHEMA", "auth_iam"),
    leadManagementSchema: readEnv("LEAD_MANAGEMENT_DATABASE_SCHEMA", "lead_management"),
    integrationSchema: readEnv("INTEGRATION_DATABASE_SCHEMA", "integration"),
    poolConnectionLimit: readIntEnv("DATABASE_POOL_CONNECTION_LIMIT", 10),
  },
  authIam: {
    port: readIntEnv("AUTH_IAM_PORT", 4100),
    baseUrl: readEnv("AUTH_IAM_BASE_URL", "http://localhost:4100"),
  },
  leadManagement: {
    port: readIntEnv("LEAD_MANAGEMENT_PORT", 4200),
    baseUrl: readEnv("LEAD_MANAGEMENT_BASE_URL", "http://localhost:4200"),
  },
  quotationDocuments: {
    region: readEnv("AWS_REGION"),
    bucket: readEnv("QUOTATION_S3_BUCKET"),
    kmsKeyId: readEnv("QUOTATION_S3_KMS_KEY_ID"),
    signedUrlExpiresSeconds: readIntEnv("QUOTATION_DOWNLOAD_URL_EXPIRES_SECONDS", 300),
    workerRecoveryIntervalMs: readIntEnv("QUOTATION_DOCUMENT_WORKER_RECOVERY_INTERVAL_MS", workerRecoveryIntervalMs),
    workerBatchSize: readIntEnv("QUOTATION_DOCUMENT_WORKER_BATCH_SIZE", 5),
    maxAttempts: readIntEnv("QUOTATION_DOCUMENT_MAX_ATTEMPTS", 5),
    lockTimeoutMs: readIntEnv("QUOTATION_DOCUMENT_LOCK_TIMEOUT_MS", 600000),
  },
  integration: {
    port: readIntEnv("INTEGRATION_PORT", 4300),
    baseUrl: readEnv("INTEGRATION_BASE_URL", "http://localhost:4300"),
    encryptionKey: readEnv("INTEGRATION_ENCRYPTION_KEY"),
    metaWorkerRecoveryIntervalMs: readIntEnv("META_WORKER_RECOVERY_INTERVAL_MS", workerRecoveryIntervalMs),
    metaWorkerHeartbeatIntervalMs: readIntEnv("META_WORKER_HEARTBEAT_INTERVAL_MS", 30000),
    metaWorkerHeartbeatStaleMs: readIntEnv("META_WORKER_HEARTBEAT_STALE_MS", 90000),
    metaWorkerBatchSize: readIntEnv("META_WORKER_BATCH_SIZE", 25),
    metaWorkerConcurrency: readIntEnv("META_WORKER_CONCURRENCY", 5),
    metaConnectionReconcileIntervalMs: readIntEnv("META_CONNECTION_RECONCILE_INTERVAL_MS", 600000),
  },
  frontend: {
    baseUrl: readEnv("FRONTEND_BASE_URL", "http://localhost:5173"),
  },
  realtime: {
    enabled: readBoolEnv("REALTIME_ENABLED", false),
    redisUrl: realtimeRedisUrl,
    redisRestUrl: readEnv("UPSTASH_REDIS_REST_URL", readRedisRestUrlFallback(realtimeRedisUrl)),
    redisRestToken: readEnv("UPSTASH_REDIS_REST_TOKEN", readEnv("REDIS_REST_TOKEN")),
    socketPath: readEnv("REALTIME_SOCKET_PATH", "/realtime/socket.io"),
    leadOutboxWorkerRecoveryIntervalMs: readIntEnv("LEAD_OUTBOX_WORKER_RECOVERY_INTERVAL_MS", workerRecoveryIntervalMs),
    leadOutboxWorkerBatchSize: readIntEnv("LEAD_OUTBOX_WORKER_BATCH_SIZE", 50),
  },
  internal: {
    serviceSecret: readEnv("INTERNAL_SERVICE_SECRET"),
  },
  workers: {
    wakeEnabled: readBoolEnv("WORKER_WAKE_ENABLED", readBoolEnv("REALTIME_ENABLED", false)),
    recoveryIntervalMs: workerRecoveryIntervalMs,
  },
  meta: {
    appId: readEnv("META_APP_ID"),
    appSecret: readEnv("META_APP_SECRET"),
    loginConfigId: readEnv("META_LOGIN_CONFIG_ID"),
    webhookVerifyToken: readEnv("META_WEBHOOK_VERIFY_TOKEN"),
    webhookAppSecret: readEnv("META_WEBHOOK_APP_SECRET", readEnv("META_APP_SECRET")),
    graphVersion: readEnv("META_GRAPH_VERSION", "v25.0"),
    graphRequestTimeoutMs: readIntEnv("META_GRAPH_REQUEST_TIMEOUT_MS", 15000),
    defaultOAuthScopes: readEnv(
      "META_OAUTH_SCOPES",
      "pages_show_list,pages_manage_metadata,pages_read_engagement,leads_retrieval,ads_read,business_management",
    ),
  },
  auth: {
    accessSecret: readEnv("JWT_ACCESS_SECRET"),
    refreshSecret: readEnv("JWT_REFRESH_SECRET"),
    accessExpiresIn: readEnv("JWT_ACCESS_EXPIRES_IN", "8h"),
    refreshExpiresDays: readIntEnv("JWT_REFRESH_EXPIRES_DAYS", 1),
    refreshCookieName: readEnv("REFRESH_COOKIE_NAME", "upstep_refresh_token"),
    cookieSecure: readBoolEnv("COOKIE_SECURE", false),
    outboxWorkerRecoveryIntervalMs: readIntEnv("AUTH_OUTBOX_WORKER_RECOVERY_INTERVAL_MS", workerRecoveryIntervalMs),
    outboxWorkerBatchSize: readIntEnv("AUTH_OUTBOX_WORKER_BATCH_SIZE", 50),
  },
});

export { config, readBoolEnv, readEnv, readIntEnv };
