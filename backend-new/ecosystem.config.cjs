/* global __dirname, process */

const cwd = __dirname;

const baseEnv = {
  NODE_ENV: process.env.NODE_ENV || "production",
};

function app(name, script, env = {}) {
  return {
    name,
    cwd,
    script,
    interpreter: "node",
    autorestart: true,
    max_restarts: 10,
    min_uptime: "10s",
    time: true,
    env: {
      ...baseEnv,
      ...env,
    },
  };
}

module.exports = {
  apps: [
    app("royal-auth", "apps/auth-iam-service/src/server.js"),
    app("royal-leads", "apps/lead-management-service/src/server.js"),
    app("royal-integrations", "apps/integration-service/src/server.js"),
    app("royal-gateway", "apps/api-gateway/src/server.js"),
    app("royal-meta-worker", "apps/integration-service/src/workers.meta.js"),
    app("royal-lead-outbox", "apps/lead-management-service/src/workers.outbox.js"),
    app("royal-auth-outbox", "apps/auth-iam-service/src/workers.outbox.js"),
    app("royal-quotation-worker", "apps/lead-management-service/src/workers.quotation-documents.js"),
  ],
};
