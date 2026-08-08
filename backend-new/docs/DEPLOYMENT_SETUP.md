# Deployment Setup Guide

This document describes the production deployment requirements for the current `backend-new` SaaS lead platform implementation.

## Current Implemented Scope

`backend-new` is implemented as a Node.js microservice monorepo.

Implemented services:

- `apps/api-gateway`: public HTTP entrypoint and thin route proxy.
- `apps/auth-iam-service`: tenants, users, teams, roles, permissions, sessions, refresh token rotation, audit logs, and auth outbox.
- `apps/lead-management-service`: lead sources, pipelines, statuses, dynamic fields, leads, assignments, follow-ups, timeline, duplicate handling, soft delete, and lead outbox.
- `apps/integration-service`: Meta Lead Ads connected accounts, forms, field mappings, webhook events, sync logs, token encryption, Meta webhook processing, and lead import into Lead Management.

Shared packages:

- `packages/common`: request context, validation, errors, middleware, and service-to-service helpers.
- `packages/config`: environment loading and typed runtime config.
- `packages/contracts`: shared permissions and event names.
- `packages/logger`: structured logging helpers.

Background workers:

- `worker:auth:outbox`: processes Auth/IAM outbox events.
- `worker:lead:outbox`: processes Lead Management outbox events.
- `worker:integration:meta`: processes pending Meta webhook events.

## Required Runtime Stack

Required:

- Node.js `20.x` or newer.
- npm.
- PostgreSQL `16.x` or managed PostgreSQL such as Amazon RDS PostgreSQL.
- Prisma CLI from the project dependencies.
- A production process manager or container runtime.
- HTTPS reverse proxy or load balancer.
- Secure secret storage for production environment variables.

Optional for local or staging setup:

- Docker.
- Docker Compose.

Not required in the current implemented scope:

- RabbitMQ.
- Kafka.
- Separate Socket.IO deployment.
- AWS S3.

Redis is required when `REALTIME_ENABLED=true`; the Socket.IO server runs inside the API Gateway process, so there is no separate realtime service to deploy. Redis can be configured either with a normal TCP URL such as `redis://` or `rediss://`, or with Upstash REST using `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. AWS S3 is not used by the current Auth/IAM, Lead Management, or Meta Integration scope.

## Required Database

All three microservices now share a single unified PostgreSQL database.
Service isolation is maintained through PostgreSQL schemas.

| Schema | Owner Service | Purpose |
| --- | --- | --- |
| `auth_iam` | `auth-iam-service` | Tenants, users, teams, roles, permissions, sessions, audit logs, and auth outbox events. |
| `lead_management` | `lead-management-service` | Lead sources, pipelines, statuses, dynamic fields, leads, assignments, follow-ups, timeline, custom field values, and lead outbox events. |
| `integration` | `integration-service` | Meta app configs, connected accounts, source forms, field mappings, webhook events, sync logs, encrypted tokens, and integration outbox events. |

Production database rules:

- Use one database user per service (optional but recommended for least-privilege).
- Each service user should have access only to its own schema.
- Do not expose PostgreSQL directly to the public internet.
- Enable automated backups.
- Test restore before production launch.
- Keep database host, username, password, and database name in secret-managed environment variables.

Local Docker Compose defaults:

| Service | Container DB | Host Port |
| --- | --- | --- |
| `solo-crm-db` | `solo_crm` | `5432` |

## Service Ports

Default service ports:

| Service | Environment Variable | Default Port |
| --- | --- | --- |
| API Gateway | `API_GATEWAY_PORT` | `4000` |
| Auth/IAM Service | `AUTH_IAM_PORT` | `4100` |
| Lead Management Service | `LEAD_MANAGEMENT_PORT` | `4200` |
| Integration Service | `INTEGRATION_PORT` | `4300` |

Only the API Gateway should be exposed publicly for normal API traffic. Internal services should be reachable only from the private application network unless there is a deliberate operational reason to expose them.

## Gateway Routing

The API Gateway forwards these public paths:

| Public Path Prefix | Downstream Service |
| --- | --- |
| `/auth` | Auth/IAM |
| `/users` | Auth/IAM |
| `/roles` | Auth/IAM |
| `/permissions` | Auth/IAM |
| `/iam` | Auth/IAM |
| `/leads` | Lead Management |
| `/lead-fields` | Lead Management |
| `/lead-sources` | Lead Management |
| `/pipelines` | Lead Management |
| `/integrations` | Integration |
| `/webhooks/meta` | Integration |

Reverse proxy recommendation:

- Public HTTPS traffic should terminate at the reverse proxy or load balancer.
- Route external API traffic to API Gateway port `4000`.
- Keep ports `4100`, `4200`, and `4300` private.
- Meta webhook callback URL should point to the public gateway URL plus `/webhooks/meta`.

Example Meta callback URL:

```text
https://api.example.com/webhooks/meta
```

## Required Environment Variables

Create a production `.env` or equivalent secret-managed configuration using the keys from `.env.example`.

### Runtime

```env
NODE_ENV=production
LOG_LEVEL=info
```

### Ports

```env
API_GATEWAY_PORT=4000
AUTH_IAM_PORT=4100
LEAD_MANAGEMENT_PORT=4200
INTEGRATION_PORT=4300
```

### Database URLs

All services now use a single unified database with schema-level isolation.

```env
SOLOCRM_DATABASE_URL="postgresql://db_user:strong_password@db-host:5432/solo_crm"
DATABASE_POOL_CONNECTION_LIMIT=10
```

Service schemas are defined in each Prisma schema:
- `auth-iam-service` → `auth_iam` schema
- `lead-management-service` → `lead_management` schema
- `integration-service` → `integration` schema

The previous three-database URLs are deprecated but kept for rollback:
```env
# AUTH_IAM_DATABASE_URL="postgresql://auth_user:strong_password@auth-db-host:5432/auth_iam"
# LEAD_MANAGEMENT_DATABASE_URL="postgresql://lead_user:strong_password@lead-db-host:5432/lead_management"
# INTEGRATION_DATABASE_URL="postgresql://integration_user:strong_password@integration-db-host:5432/integration"
```

### Auth And Cookies

```env
JWT_ACCESS_SECRET="replace-with-production-access-secret"
JWT_REFRESH_SECRET="replace-with-production-refresh-secret"
JWT_ACCESS_EXPIRES_IN="8h"
JWT_REFRESH_EXPIRES_DAYS=1
REFRESH_COOKIE_NAME="upstep_refresh_token"
COOKIE_SECURE=true
```

Production rules:

- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must be long, random, and different from each other.
- `COOKIE_SECURE` must be `true` behind HTTPS.
- Refresh tokens are stored in HTTP-only cookies and rotated by the Auth/IAM service.

### Service Base URLs

```env
AUTH_IAM_BASE_URL="http://auth-iam-service:4100"
LEAD_MANAGEMENT_BASE_URL="http://lead-management-service:4200"
INTEGRATION_BASE_URL="http://integration-service:4300"
```

Use private service DNS names or private network URLs in production.

### Internal Service Authentication

```env
INTERNAL_SERVICE_SECRET="replace-with-production-internal-service-secret"
```

This secret protects internal service-to-service endpoints such as Lead Management lead import.

Production rules:

- Use a long random secret.
- Do not expose this value to browsers or frontend clients.
- Rotate it if any service environment is compromised.

### Meta Integration

```env
FRONTEND_BASE_URL="https://crm.example.com"
META_APP_ID="replace-with-meta-app-id"
META_APP_SECRET="replace-with-meta-app-secret"
META_LOGIN_CONFIG_ID="replace-with-facebook-login-for-business-config-id"
META_WEBHOOK_VERIFY_TOKEN="replace-with-meta-webhook-verify-token"
META_WEBHOOK_APP_SECRET="replace-with-meta-webhook-app-secret"
META_GRAPH_VERSION="v25.0"
META_OAUTH_SCOPES="pages_show_list,pages_manage_metadata,pages_read_engagement,leads_retrieval,ads_read,business_management"
META_WORKER_BATCH_SIZE=25
META_WORKER_HEARTBEAT_INTERVAL_MS=30000
META_WORKER_HEARTBEAT_STALE_MS=90000
INTEGRATION_ENCRYPTION_KEY="replace-with-32-byte-base64-key"
```

Production rules:

- `FRONTEND_BASE_URL` is where OAuth redirects users after Meta account connection.
- `META_APP_ID` and `META_APP_SECRET` are the platform-owned Meta app credentials used for every tenant OAuth connection.
- `META_LOGIN_CONFIG_ID` is the Facebook Login for Business configuration ID. Production Lead Ads OAuth uses this so Meta receives approved permissions through `config_id` instead of raw OAuth scopes.
- Do not expose `META_APP_SECRET` to browsers or tenant users.
- The OAuth redirect URI is generated from the public gateway host and must match the callback URL configured in the platform Meta app.
- `META_OAUTH_SCOPES` is a fallback for older or local test flows when `META_LOGIN_CONFIG_ID` is not set. In production, configure `pages_show_list`, `pages_manage_metadata`, `pages_read_engagement`, `leads_retrieval`, `ads_read`, and `business_management` in the Facebook Login for Business configuration. Environment scopes do not override a `config_id` permission set.
- `META_WEBHOOK_VERIFY_TOKEN` must match the token configured in the Meta webhook setup.
- `META_WEBHOOK_APP_SECRET` is used to verify Meta webhook signatures when signature verification is enabled. If omitted, use the Meta app secret.
- `INTEGRATION_ENCRYPTION_KEY` must be a 32-byte base64 key.
- Meta user and Page access tokens are encrypted before storage.

## Install And Build

From `backend-new`:

```powershell
npm install
npm run prisma:validate
npm run prisma:generate
npm run build
```

`npm run build` currently validates all Prisma schemas.

## Database Migration Setup

All services now point to a single unified database (`SOLOCRM_DATABASE_URL`).
Service tables are isolated through PostgreSQL schemas defined in each Prisma schema:

```text
apps/auth-iam-service/prisma/schema.prisma     → auth_iam schema
apps/lead-management-service/prisma/schema.prisma → lead_management schema
apps/integration-service/prisma/schema.prisma   → integration schema
```

For local development on an empty database:

```powershell
docker compose up -d
npm run prisma:push            # Creates tables in all three schemas
npm run prisma:validate
npm run prisma:generate
```

For production initialization on the unified database:

```powershell
# 1. Create schemas first
node scripts/init-db.mjs

# 2. Push service schemas (db push is used because historical migrations
#    reference tenant_id columns that are absent from the current schemas)
npx prisma db push --schema apps/auth-iam-service/prisma/schema.prisma
npx prisma db push --schema apps/lead-management-service/prisma/schema.prisma
npx prisma db push --schema apps/integration-service/prisma/schema.prisma

# 3. Validate and regenerate
npm run prisma:validate
npm run prisma:generate
```

## Start Services

Development commands:

```powershell
npm run dev:gateway
npm run dev:auth
npm run dev:lead
npm run dev:integration
```

The current single-service Render deployment must use the supervised production command:

```powershell
npm run start:render
```

This starts the four HTTP services plus Meta capture, Lead realtime outbox, and Auth/IAM outbox workers. `concurrently --kill-others-on-fail` causes Render to restart the full service if a critical child process fails.

Use `npm run start:services` only when workers are deployed and supervised separately.

## Start Workers

For a future split-process deployment, run these workers as separate long-running processes:

```powershell
npm run worker:auth:outbox
npm run worker:lead:outbox
npm run worker:integration:meta
```

Worker responsibilities:

- Auth outbox worker publishes or processes Auth/IAM outbox events.
- Lead outbox worker publishes or processes Lead Management outbox events.
- Meta worker fetches full Meta lead data for pending webhook events and imports leads into Lead Management.

Production rules:

- Workers must use the same production `.env` values as the services.
- Workers should be supervised and restarted on failure.
- Run exactly one Meta worker in the current deployment; its database lease protects individual event claims and recovers stale processing after a crash.
- Do not run multiple Meta workers unless the processing logic is verified for concurrent production execution.
- Set `REALTIME_ENABLED=true` and `REDIS_URL` for the API Gateway and Lead Management outbox worker so new leads can be pushed to active browser sessions.
- For Upstash REST, set `UPSTASH_REDIS_REST_URL="https://your-endpoint.upstash.io"` and `UPSTASH_REDIS_REST_TOKEN`. The app also accepts `REDIS_URL="https://your-endpoint.upstash.io"` plus `REDIS_REST_TOKEN` for this mode.
- Do not put arbitrary text in `REDIS_URL`. Use only `redis://`, `rediss://`, or an Upstash `https://` REST URL with its REST token.
- Set `WORKER_WAKE_ENABLED=true` so Meta, Lead outbox, Auth outbox, and quotation PDF workers react immediately to Redis wake signals after durable writes.
- Set `WORKER_RECOVERY_INTERVAL_MS=60000`. This low-frequency database sweep recovers missed Pub/Sub hints and crash leftovers; it is not used as the normal processing delay.
- Use worker batch-size variables to tune throughput, or run a worker with `--once` for a one-off diagnostic batch.

## Health Checks

Health endpoints:

| Service | URL |
| --- | --- |
| API Gateway | `GET /health` on port `4000` |
| Auth/IAM | `GET /health` on port `4100` |
| Lead Management | `GET /health` on port `4200` |
| Integration | `GET /health` on port `4300` |

Production monitoring should check each service directly from the private network and the gateway from the public network.

## Meta Lead Ads Setup

Deployment-time Meta setup:

1. Configure the public webhook URL in Meta:

   ```text
   https://api.example.com/webhooks/meta
   ```

2. Use the same verify token in Meta and `META_WEBHOOK_VERIFY_TOKEN`.
3. Configure the Meta OAuth redirect URI:

   ```text
   https://api.example.com/integrations/meta/oauth/callback
   ```

4. Store the platform Meta app credentials in `META_APP_ID` and `META_APP_SECRET`.
5. Add Facebook Login for Business to the Meta app, create a login configuration with the Lead Ads permissions, and store its configuration ID in `META_LOGIN_CONFIG_ID`.
6. Start the Integration service.
7. Start the Render service with `npm run start:render`; verify the Integrations page reports the Meta worker as `RUNNING`.
8. Connect a Meta account from the frontend Integrations page, which starts:

   ```text
   GET /integrations/meta/oauth/start
   ```

   Meta returns to:

   ```text
   GET /integrations/meta/oauth/callback
   ```

   The backend exchanges the OAuth code, encrypts the Meta user access token, and stores the OAuth connection.

8. Select a Facebook Page through:

   ```text
   GET /integrations/meta/pages
   ```

9. Select a Lead Form through:

   ```text
   GET /integrations/meta/pages/:pageId/forms
   ```

10. Connect the selected Page/Form through:

   ```text
   POST /integrations/meta/forms/connect
   ```

   The backend subscribes the Page for `leadgen` webhooks, stores the Page access token encrypted, and saves the source form for tenant-safe lead import.

11. Add explicit field mappings if needed through:

   ```text
   POST /integrations/meta/forms/:id/map-fields
   ```

Standard field mapping:

| Meta Field | CRM Lead Field |
| --- | --- |
| `full_name` | `fullName` |
| `name` | `fullName` |
| `phone_number` | `phone` |
| `phone` | `phone` |
| `mobile` | `phone` |
| `email` | `email` |
| `email_address` | `email` |

Custom ad question behavior:

- Meta sends ad answers in `field_data`.
- Known fields map to standard lead fields.
- Unknown form questions are converted into safe dynamic field keys.
- Lead Management auto-creates dynamic lead field definitions for unknown custom questions.
- Answers are stored in `lead_custom_field_values`.

Example:

```text
Which course are you interested in?
```

is stored as:

```text
which_course_are_you_interested_in
```

This keeps the core `leads` table stable while preserving all Meta form answers.

## Security Checklist

Before production launch:

- Replace every example secret from `.env.example`.
- Use HTTPS only.
- Set `NODE_ENV=production`.
- Set `COOKIE_SECURE=true`.
- Keep internal services private.
- Protect internal service endpoints with `INTERNAL_SERVICE_SECRET`.
- Use least-privilege PostgreSQL users.
- Use one database user per service.
- Do not expose stack traces publicly.
- Do not log JWTs, refresh tokens, Meta access tokens, or database passwords.
- Store secrets in a secret manager, not in source control.
- Use a valid 32-byte base64 `INTEGRATION_ENCRYPTION_KEY`.
- Configure database backups and restore testing.
- Forward structured logs to production log storage.
- Connect Sentry or another error reporting system before launch.
- Rotate secrets immediately if they are exposed in logs, tickets, screenshots, or source control.

## Verification Commands

Run before deployment:

```powershell
npm run lint
npm run build
npm run prisma:validate
npm run prisma:generate
npm run test
npm run verify
```

## Meta Reliability Migrations

Apply both checked-in production migrations before starting the updated Render process:

```powershell
npm run prisma:integration:migrate:deploy
npm run prisma:lead:migrate:deploy
```

The Integration migration adds selected Meta asset snapshots, worker heartbeat, webhook processing leases, retry scheduling, and unmatched delivery diagnostics. The Lead migration adds tenant-scoped external lead identity so repeated Meta delivery cannot create duplicate CRM leads.

After deployment:

1. Set the Render Start Command to `npm run start:render`.
2. Set `META_GRAPH_VERSION=v25.0`, `WORKER_WAKE_ENABLED=true`, and `WORKER_RECOVERY_INTERVAL_MS=60000`.
3. Confirm the Meta Webhooks product uses object `Page`, field `leadgen`, and callback `https://upstep-crm.onrender.com/webhooks/meta`.
4. Confirm the Facebook Login for Business configuration contains the required permissions and that the Page grants this app Leads Access.
5. Open Integrations, run `Verify / repair`, and confirm token, exact-app subscription, and worker all report healthy.
6. Submit a Meta Lead Ads Testing Tool lead and verify webhook receipt, CRM lead creation, and realtime UI refresh within five seconds.

## Meeting Calendar Deployment

Apply the checked-in Lead Management migration before starting the updated service, then backfill meeting permissions from existing lead role scopes:

```powershell
npm run prisma:lead:migrate:deploy
npm run auth:backfill-meeting-permissions
```

Set `PUBLIC_BRANDING_APP_NAME="Royal IT CRM"` on the API Gateway service. Source defaults cannot override an older Render environment value.

Meeting times are stored as UTC. The current frontend enters and displays meeting dates in fixed `Asia/Kolkata`; a future tenant setting can replace that presentation timezone without changing stored records.

Run after deployment:

- Check all service health endpoints.
- Register or log in through the gateway.
- Verify refresh token rotation.
- Create a lead through the gateway.
- Verify tenant isolation with at least two tenants.
- Connect a Meta account through OAuth and create a Meta form.
- Send a Meta webhook verification request.
- Send or simulate a Meta lead webhook.
- Confirm the Integration worker imports the lead into Lead Management.
- Confirm custom Meta questions appear as dynamic lead fields.

## Production Deployment Checklist

Use this checklist before marking the backend deployable:

- Three PostgreSQL databases are provisioned.
- Three service-specific database users are provisioned.
- Production environment variables are set.
- Prisma migrations are applied to all three databases.
- Lead meeting migration and Auth/IAM meeting permission backfill have completed.
- Prisma clients are generated.
- API Gateway is publicly reachable through HTTPS.
- Auth/IAM, Lead Management, and Integration services are private.
- All four service processes are running.
- All three worker processes are running.
- Health checks pass.
- `npm run verify` passes in the deployment artifact or CI environment.
- Meta OAuth redirect URL and webhook URL are configured in Meta.
- Meta webhook verify token and webhook app secret are configured in backend secrets.
- Tenant Meta app ID and app secret are saved from the frontend Integrations page.
- Database backups are enabled.
- Logs and errors are collected centrally.
