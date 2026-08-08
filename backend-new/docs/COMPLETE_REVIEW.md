# Solo-CRM Complete Project Review

## 1. Executive Summary

Solo-CRM is a microservice monorepo for a multi-tenant SaaS lead management backend. It consists of **4 processes** (API Gateway, Auth/IAM, Lead Management, Integration) running as Node.js Express apps with a unified PostgreSQL database (schema-isolated) and Redis for realtime events and worker wake signals.

**Key numbers:**
- 4 runtime processes (gateway + 3 services)
- 3 Prisma schemas, 50+ database tables
- 4 background workers (Meta, Lead outbox, Auth outbox, Quotation PDF)
- 5 shared packages
- 14 test files (Node test runner)
- 1 external integration (Meta/Facebook Lead Ads)
- 0 CI/CD pipelines
- 0 Dockerfiles for services (Docker Compose for DB/Redis only)

**Overall health:** The codebase is well-structured with clear separation of concerns (controller/service/repository pattern). The unified database migration is already applied to the code. Primary risks are: production credentials in `.env`, no CI/CD, historical migrations with `tenant_id` columns that conflict with current schema, and multi-tenant isolation being a recent addition with some legacy code paths still using `tenant_id`.

**Database consolidation readiness:** Code changes are prepared (schemas, config, scripts) but have not been executed against any database. Execution steps remain: create DB, push schemas, migrate data, verify.

---

## 2. Repository Structure

```
backend-new/
├── .env                          # Active environment (contains secrets!)
├── .env.example                  # Template with placeholder values
├── .gitignore
├── README.md
├── docker-compose.yml            # PostgreSQL 16 + Redis 7
├── ecosystem.config.cjs          # PM2 process manager config
├── eslint.config.js
├── package.json                  # Root monorepo manifest (type: module)
├── package-lock.json
│
├── apps/
│   ├── api-gateway/              # Public edge proxy (port 4000)
│   │   └── src/
│   │       ├── app.js            # Express app, proxy logic
│   │       ├── realtime.js       # Socket.IO + Redis adapter
│   │       └── server.js         # HTTP startup
│   │
│   ├── auth-iam-service/         # Auth, IAM, RBAC (port 4100)
│   │   ├── generated/prisma/     # Auto-generated Prisma client
│   │   ├── prisma/
│   │   │   └── schema.prisma     # auth_iam schema
│   │   └── src/
│   │       ├── app.js
│   │       ├── bootstrap.js
│   │       ├── prisma.js
│   │       ├── require-permission.js
│   │       ├── server.js
│   │       ├── workers.outbox.js
│   │       ├── controllers/
│   │       ├── repositories/
│   │       ├── routes/
│   │       ├── services/
│   │       └── validators/
│   │
│   ├── lead-management-service/  # Core CRM (port 4200)
│   │   ├── generated/prisma/
│   │   ├── prisma/
│   │   │   ├── schema.prisma     # lead_management schema
│   │   │   └── migrations/       # 6 historical migrations
│   │   └── src/
│   │       ├── app.js
│   │       ├── prisma.js
│   │       ├── server.js
│   │       ├── workers.outbox.js
│   │       ├── workers.quotation-documents.js
│   │       ├── controllers/
│   │       ├── repositories/
│   │       ├── routes/
│   │       ├── services/
│   │       └── validators/
│   │
│   └── integration-service/      # Meta lead integration (port 4300)
│       ├── generated/prisma/
│       ├── prisma/
│       │   ├── schema.prisma     # integration schema
│       │   └── migrations/       # 2 historical migrations
│       └── src/
│           ├── app.js
│           ├── prisma.js
│           ├── server.js
│           ├── workers.meta.js
│           ├── controllers/
│           ├── repositories/
│           ├── routes/
│           ├── services/
│           └── validators/
│
├── packages/
│   ├── common/                   # Shared HTTP utilities
│   │   └── src/ (8 files)
│   ├── config/                   # Env-var config loader
│   │   └── src/index.js
│   ├── contracts/                # Event names + permission keys
│   │   └── src/ (events.js, permissions.js)
│   ├── logger/                   # Pino structured logging
│   │   └── src/index.js
│   └── realtime/                 # Redis + Upstash realtime
│       └── src/index.js
│
├── scripts/                      # 9 utility scripts
├── tests/                        # 14 test files (Node test runner)
└── docs/                         # 4 documentation files
```

---

## 3. Technology Stack

| Service/App | Language | Runtime | Framework | DB Client | DB | Queue/Cache | Testing |
|---|---|---|---|---|---|---|---|
| API Gateway | JavaScript (ESM) | Node.js ≥20 | Express 4.21 | None | N/A | Redis 7 / Upstash (Socket.IO) | supertest |
| Auth/IAM Service | JavaScript (ESM) | Node.js ≥20 | Express 4.21 | Prisma 6.12 | PostgreSQL (auth_iam) | Redis (worker wake) | Node test runner |
| Lead Management | JavaScript (ESM) | Node.js ≥20 | Express 4.21 | Prisma 6.12 | PostgreSQL (lead_management) | Redis (worker wake + outbox) | Node test runner |
| Integration Service | JavaScript (ESM) | Node.js ≥20 | Express 4.21 | Prisma 6.12 | PostgreSQL (integration) | Redis (worker wake) | Node test runner |
| Config package | JS | N/A | N/A | N/A | N/A | N/A | N/A |
| Logger package | JS | N/A | Pino 9.8 | N/A | N/A | N/A | N/A |
| Realtime package | JS | N/A | Redis 6.1, Upstash | N/A | N/A | Redis/Upstash | N/A |

**Key technology versions:**
- Node.js: ≥20 (confirmed: `"engines": {"node": ">=20.0.0"}`)
- Prisma: 6.12.0 (both client and CLI)
- Express: 4.21.2
- Pino: 9.8.0
- Socket.IO: 4.8.3
- Zod: 3.24.2
- jsonwebtoken: 9.0.2
- bcryptjs: 2.4.3
- Helmet: 8.1.0
- Puppeteer: 25.3.0 (for PDF generation)
- AWS SDK S3: 3.1085.0

**Package manager:** npm (single root `package.json`, no workspaces, no pnpm/yarn)

**No competing libraries found** for the same responsibility across services.

---

## 4. Microservice Catalog

### 4.1 API Gateway
- **Directory:** `apps/api-gateway/`
- **Purpose:** Public edge proxy that routes requests to downstream services based on URL prefix. No business logic.
- **Entry point:** `src/server.js`
- **Port:** 4000 (configurable via `API_GATEWAY_PORT`)
- **Framework:** Express 4.21 with proxy via `fetch()`
- **Database:** None (proxy only)
- **Routes resolved by prefix:**
  - `/auth`, `/users`, `/roles`, `/permissions`, `/iam/*` → Auth/IAM
  - `/leads`, `/quotations`, `/meetings`, `/meeting-staff`, `/lead-fields`, `/lead-settings`, `/lead-sources`, `/pipelines` → Lead Management
  - `/integrations`, `/webhooks/meta` → Integration Service
- **Realtime:** Socket.IO server with Redis adapter for lead event broadcasting
- **Health:** `GET /health`
- **Public:** `GET /public/branding`
- **Auth for realtime:** JWT + IAM permission check on socket connect
- **Dependencies:** Auth/IAM (permission checks), Redis/Upstash (pub/sub)

### 4.2 Auth/IAM Service
- **Directory:** `apps/auth-iam-service/`
- **Purpose:** User authentication, RBAC, teams, sessions, audit logging
- **Entry point:** `src/server.js`
- **Port:** 4100
- **Framework:** Express 4.21
- **Database:** PostgreSQL (schema: `auth_iam`), via `SOLOCRM_DATABASE_URL`
- **Owned models:** User, Team, TeamMember, Role, Permission, RolePermission, UserRole, Session, AuditLog, OutboxEvent
- **API routes:**
  - `POST /auth/login`, `/auth/refresh-token`, `/auth/logout`
  - `GET /auth/me`
  - `GET /users`, `POST /users`
  - `GET /roles`, `POST /roles`
  - `GET /permissions`
  - `POST /iam/check-permission`
  - `POST /internal/*` (internal service endpoints)
- **Middlewares:** `requireAuth` (JWT verify), `requireInternalService` (shared secret)
- **Background worker:** `workers.outbox.js` - publishes auth outbox events to Redis
- **Dependencies:** None internal (auth source of truth)

### 4.3 Lead Management Service
- **Directory:** `apps/lead-management-service/`
- **Purpose:** Core CRM — leads, meetings, quotations, config (pipelines, statuses, sources, fields)
- **Entry point:** `src/server.js`
- **Port:** 4200
- **Database:** PostgreSQL (schema: `lead_management`), via `SOLOCRM_DATABASE_URL`
- **Owned models:** LeadSource, LeadPipeline, LeadStatus, LeadFieldDefinition, Lead, LeadCustomFieldValue, LeadAssignment, LeadFollowup, LeadMeeting, LeadQuotation, LeadQuotationRevision, QuotationNumberSequence, LeadTimeline, LeadAssignmentSetting, OutboxEvent
- **API routes:**
  - `GET /leads`, `POST /leads`, `GET /leads/:id`, `PATCH /leads/:id`, `DELETE /leads/:id`
  - `POST /leads/:id/assign`, `POST /bulk-assign`, `POST /leads/:id/change-status`
  - `POST /leads/:id/followups`, `GET /leads/:id/timeline`
  - `GET /leads/options`, `GET /leads/filter-options`, `GET /leads/summary`
  - `POST /internal/leads` (integration import), `GET /internal/leads/deduplicate`
  - `GET /meetings`, `POST /leads/:id/meetings`, `PATCH /meetings/:id`, `POST /meetings/:id/cancel`
  - `GET /meeting-staff`
  - `POST /quotations`, `GET /quotations`, `GET /quotations/:id`, `PATCH /quotations/:id`
  - `POST /quotations/:id/mark-sent`, `POST /quotations/:id/create-revision`
  - `POST /quotations/:id/status`, `GET /quotations/:id/revisions`
  - `GET /quotations/:id/revisions/:revisionNumber/download-url`
  - `GET /lead-fields`, `POST /lead-fields`, `GET /pipelines`, `POST /pipelines`
  - `GET /pipelines/:id/statuses`, `POST /pipelines/:id/statuses`
  - `GET /lead-sources`, `POST /lead-sources`, `GET /lead-settings`, `PATCH /lead-settings`
- **Background workers:**
  - `workers.outbox.js` — publishes lead/meeting events to Redis realtime
  - `workers.quotation-documents.js` — generates PDFs and uploads to S3
- **Dependencies:** Auth/IAM (permission checks via HTTP), AWS S3 (quotation PDFs)

### 4.4 Integration Service
- **Directory:** `apps/integration-service/`
- **Purpose:** Meta/Facebook Lead Ads integration — OAuth, webhook processing, lead import
- **Entry point:** `src/server.js`
- **Port:** 4300
- **Database:** PostgreSQL (schema: `integration`), via `SOLOCRM_DATABASE_URL`
- **Owned models:** ConnectedAccount, MetaAppConfig, SourceForm, MetaAssetConnection, SourceFieldMapping, WebhookEvent, WorkerHeartbeat, SyncLog, OutboxEvent
- **API routes:**
  - `GET /integrations/meta/oauth/start`, `GET /integrations/meta/oauth/callback`
  - `GET /integrations/meta/app-config`, `PUT /integrations/meta/app-config`
  - `GET /integrations/meta/accounts`, `POST /integrations/meta/accounts`
  - `GET /integrations/meta/pages`, `GET /integrations/meta/pages/:pageId/forms`
  - `GET /integrations/meta/ad-accounts`, `GET /integrations/meta/ad-accounts/:adAccountId/campaigns`
  - `GET /integrations/meta/overview`
  - `GET /integrations/meta/forms`, `POST /integrations/meta/forms`, `POST /integrations/meta/forms/connect`
  - `POST /integrations/meta/forms/connect-bulk`
  - `GET /integrations/meta/forms/:id/health`
  - `POST /integrations/meta/forms/:id/activate-webhooks`, `POST /integrations/meta/forms/:id/deactivate`
  - `POST /integrations/meta/forms/:id/retry-failed`, `POST /integrations/meta/forms/:id/sync-recent`
  - `POST /integrations/meta/forms/:id/map-fields`
  - `GET /integrations/meta/sync-logs`, `POST /integrations/meta/process-pending`
  - `GET /webhooks/meta`, `POST /webhooks/meta`
- **Background worker:** `workers.meta.js` — processes pending webhook events, connection reconciliation, heartbeat
- **Dependencies:** Lead Management (lead import via HTTP internal route), Auth/IAM (permission checks), Meta Graph API, AWS S3 (not directly — encryption is local AES-256-GCM)

---

## 5. Shared Packages

### 5.1 `packages/common/`
- 8 modules exported via index.js
- **AppError:** Custom error class with statusCode, code, details
- **toErrorResponse:** Converts errors to safe JSON responses
- **errorHandler:** Express error middleware with logging
- **notFoundHandler:** Express 404 handler
- **asyncHandler:** Wraps async route handlers
- **requestContext:** Attaches `req.context` with requestId + user
- **validateRequest:** Zod schema validation (body, params, query)
- **requireAuth:** JWT verification from Authorization header
- **requireInternalService:** Shared secret header check
- **serviceRequest:** HTTP client with timeout and error handling
- **normalizePagination, paginatedResponse:** Pagination helpers

### 5.2 `packages/config/`
- Single `index.js` that reads all env vars
- All config exposed as frozen `config` object with namespaced sections
- Types: `readEnv`, `readIntEnv`, `readBoolEnv`

### 5.3 `packages/contracts/`
- **events.js:** All event name constants (EVENTS object)
- **permissions.js:** All permission key constants (PERMISSIONS object)

### 5.4 `packages/logger/`
- Pino logger factory + Pino HTTP middleware
- Auto-redacts: authorization, cookie, password, refreshToken, accessToken

### 5.5 `packages/realtime/`
- Redis client factory, Upstash REST publisher/subscriber
- Channel constants, worker wake channels
- Wake signal coalescing, message envelope creation/parsing
- Transport resolution (Redis TCP vs Upstash REST)

---

## 6. Database Architecture

### Current State
All three services use `SOLOCRM_DATABASE_URL` with PostgreSQL schema isolation:

| Schema | Service | Tables |
|---|---|---|
| `auth_iam` | Auth/IAM | users, teams, team_members, roles, permissions, role_permissions, user_roles, sessions, audit_logs, outbox_events |
| `lead_management` | Lead Management | lead_sources, lead_pipelines, lead_statuses, lead_field_definitions, leads, lead_custom_field_values, lead_assignments, lead_followups, lead_meetings, lead_quotations, lead_quotation_revisions, quotation_number_sequences, lead_timeline, lead_assignment_settings, outbox_events |
| `integration` | Integration | connected_accounts, meta_app_configs, source_forms, meta_asset_connections, source_field_mappings, webhook_events, worker_heartbeats, sync_logs, outbox_events |

### Confirmed: No cross-schema foreign keys
All relationships are within the same schema. Cross-service references are logical (e.g., `assignedTo` stores user UUID as string, `leadSourceId` and `pipelineId` reference IDs in the lead schema).

### Migration Conflict
Historical migrations reference `tenant_id` columns on tables like `lead_meetings`, `lead_quotations`, etc. The **current Prisma schema has NO tenant_id column** — multi-tenant isolation was removed in favor of the Prisma schema isolation approach. This means:
- `prisma migrate deploy` will FAIL on lead-management and integration services
- Must use `prisma db push` instead
- Old migrations are preserved in the repo but are not reapplied

### Dangerous settings check
- `synchronize: true` — NOT FOUND (Prisma uses explicit migrations)
- `dropSchema: true` — NOT FOUND
- `force: true` — NOT FOUND
- `db push --force-reset` — NOT FOUND in any script
- `DROP DATABASE` — NOT FOUND in application code
- No destructive operations found in application code

---

## 7. API Inventory

### Auth/IAM (port 4100)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /auth/login | None | Login with email/password |
| POST | /auth/refresh-token | None | Rotate refresh token |
| POST | /auth/logout | JWT | Revoke session |
| GET | /auth/me | JWT | Current user profile |
| GET | /users | JWT | List users |
| POST | /users | JWT | Create user |
| GET | /roles | JWT | List roles |
| POST | /roles | JWT | Create role |
| GET | /permissions | JWT | List permissions |
| POST | /iam/check-permission | JWT | Check permission (also used by other services) |
| POST | /internal/* | Internal secret | Internal service endpoints |

### Lead Management (port 4200)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /leads | JWT | List leads with pagination/filters |
| POST | /leads | JWT | Create lead |
| GET | /leads/options | JWT | Lightweight lead selector |
| GET | /leads/filter-options | JWT | Attribution filter options |
| GET | /leads/summary | JWT | Dashboard aggregates |
| GET | /leads/:id | JWT | Get lead by ID |
| PATCH | /leads/:id | JWT | Update lead |
| DELETE | /leads/:id | JWT | Soft-delete lead |
| POST | /leads/:id/assign | JWT | Assign lead |
| POST | /leads/:id/change-status | JWT | Change lead status |
| POST | /leads/:id/followups | JWT | Create follow-up |
| GET | /leads/:id/followups | JWT | List follow-ups |
| GET | /leads/:id/timeline | JWT | List timeline events |
| POST | /bulk-assign | JWT | Bulk assign leads |
| POST | /internal/leads | Internal | Integration import |
| GET | /meetings | JWT | List meetings (calendar range) |
| POST | /leads/:id/meetings | JWT | Create meeting |
| PATCH | /meetings/:id | JWT | Update meeting |
| POST | /meetings/:id/cancel | JWT | Cancel meeting |
| GET | /meeting-staff | JWT | List meeting staff |
| POST | /quotations | JWT | Create quotation |
| GET | /quotations | JWT | List quotations |
| GET | /quotations/:id | JWT | Get quotation |
| PATCH | /quotations/:id | JWT | Update quotation |
| POST | /quotations/:id/mark-sent | JWT | Mark sent (triggers PDF) |
| POST | /quotations/:id/create-revision | JWT | Create revision |
| POST | /quotations/:id/status | JWT | Approve/decline |
| GET | /quotations/:id/revisions | JWT | List revisions |
| GET | /quotations/:id/revisions/:num/download-url | JWT | Get PDF download URL |

### Integration (port 4300)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /integrations/meta/oauth/start | JWT | Start OAuth flow |
| GET | /integrations/meta/oauth/callback | None | OAuth callback (redirect to frontend) |
| GET | /integrations/meta/app-config | JWT | Get Meta app config |
| PUT | /integrations/meta/app-config | JWT | Save Meta app config |
| GET | /integrations/meta/accounts | JWT | List connected accounts |
| POST | /integrations/meta/accounts | JWT | Create connected account |
| GET | /integrations/meta/pages | JWT | List Facebook Pages |
| GET | /integrations/meta/ad-accounts | JWT | List ad accounts |
| GET | /integrations/meta/overview | JWT | Integration overview |
| GET | /integrations/meta/forms | JWT | List source forms |
| POST | /integrations/meta/forms/connect | JWT | Connect form |
| GET | /webhooks/meta | None | Webhook challenge |
| POST | /webhooks/meta | None | Receive webhook (HMAC verified) |

### API Gateway (port 4000)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /health | None | Health check |
| GET | /public/branding | None | Branding config |
| * | /* | Varies | Proxy to downstream service |

---

## 8. Authentication and Authorization

### Authentication Flow
1. **Login:** `POST /auth/login` → validate email/password → validate against stored bcrypt hash → verify user not suspended → check tokenVersion
2. **Token pair issued:** JWT access token (claims: sub, email, sessionId, tokenVersion, iat, exp) + opaque refresh token (hashed in DB in a Session record)
3. **Access token validation:** `requireAuth` middleware → extract Bearer → `jwt.verify(token, accessSecret)` → attach `req.context.user`
4. **Refresh flow:** `POST /auth/refresh-token` → verify refresh token matches Session hash → check Session status is ACTIVE → check tokenVersion matches → rotate: invalidate old Session, create new Session + new token pair
5. **Logout:** Find Session by refresh token hash → revoke (set status REVOKED, revokedAt)

### Token Details
- **Access token:** JWT, signed with `JWT_ACCESS_SECRET`, expires in `JWT_ACCESS_EXPIRES_IN` (default 8h), stored in memory (inferred, not persisted)
- **Refresh token:** Opaque random, hashed with SHA-256, stored in `sessions.refreshTokenHash`, expires per `JWT_REFRESH_EXPIRES_DAYS` (default 30), sent as httpOnly cookie (`upstep_refresh_token`)
- **Cookie security:** `COOKIE_SECURE=true`, `sameSite: "lax"` for OAuth state cookie
- **Token family:** `tokenFamilyId` in Session enables family-based revocation

### Authorization Model
- **RBAC:** Roles contain permissions, users are assigned roles (optionally scoped to a team via `UserRole.teamId`)
- **Permission check:** `POST /iam/check-permission` → `requirePermission` middleware → service calls Auth/IAM via HTTP → returns `{ allowed, permissions, teamIds }`
- **Scope levels:** `OWN` (own records), `TEAM` (team records), `ALL` (all records)
- **Built-in roles:** None hardcoded in migration. Scripts create OWNER/EMPLOYEE roles.
- **Permission keys:** Defined in `packages/contracts/src/permissions.js` (36 permissions)

### Internal Service Auth
- Shared `INTERNAL_SERVICE_SECRET` passed as `x-internal-service-secret` header
- Verified by `requireInternalService` middleware

### Realtime Auth
- Socket.IO connection requires `accessToken` in `socket.handshake.auth`
- Token verified with `config.auth.accessSecret`, then IAM permission check via HTTP
- User joined to rooms based on permissions (lead/meeting read scopes)

---

## 9. Inter-Service Communication

```
Integration Service ──HTTP──→ Lead Management (POST /internal/leads)
     │                            │
     │                            ├──HTTP──→ Auth/IAM (POST /iam/check-permission)
     │                            │
     └──HTTP──→ Auth/IAM (POST /iam/check-permission)
                    │
                    └── (uses own DB, no external HTTP calls)

API Gateway ──HTTP (fetch)──→ Auth/IAM, Lead Management, Integration Service

Realtime:
  Lead Management (outbox worker) ──Redis PUBLISH──→ API Gateway (Socket.IO)
  All services ──Redis PUBLISH (wake)──→ Respective workers
```

- **All inter-service communication is synchronous HTTP** via `serviceRequest()` from `packages/common`
- **Timeout:** 15 seconds default (configurable per-call)
- **No retry logic** in serviceRequest (fails immediately with AppError)
- **No circuit breaker**
- **No idempotency** built into internal HTTP calls
- **No message queue** (Redis pub/sub is fire-and-forget, not a queue)
- **Outbox pattern** used for events: DB writes + outbox_event table, workers poll and publish

### Circular dependencies: NONE confirmed
- Auth/IAM depends on nothing internal
- Lead Management depends on Auth/IAM (permission checks)
- Integration depends on Auth/IAM (permission checks) and Lead Management (lead import)

---

## 10. Queues, Workers and Cron Jobs

### 10.1 Auth Outbox Worker (`workers.outbox.js`)
- **Service:** Auth/IAM
- **Type:** Durable loop (polls DB)
- **Interval:** `AUTH_OUTBOX_WORKER_INTERVAL_MS` (default 5000ms)
- **Purpose:** Publishes pending Auth outbox events to Redis
- **Wake:** Redis wake signal on `crm:workers:wake:auth-outbox`
- **DB table:** `auth_iam.outbox_events`

### 10.2 Lead Outbox Worker (`workers.outbox.js`)
- **Service:** Lead Management
- **Type:** Durable loop (polls DB)
- **Interval:** `LEAD_OUTBOX_WORKER_INTERVAL_MS` (default 2000ms)
- **Purpose:** Publishes lead/meeting events to Redis for realtime delivery
- **Wake:** Redis wake signal on `crm:workers:wake:lead-outbox`
- **DB table:** `lead_management.outbox_events`
- **Events published:** `lead.created`, `meeting.created`, `meeting.updated`, `meeting.cancelled`

### 10.3 Quotation Document Worker (`workers.quotation-documents.js`)
- **Service:** Lead Management
- **Type:** Durable loop (polls DB)
- **Interval:** `QUOTATION_DOCUMENT_WORKER_RECOVERY_INTERVAL_MS`
- **Purpose:** Generates PDF for sent quotations, uploads to S3
- **Wake:** Redis wake signal on `crm:workers:wake:quotation-documents`
- **DB table:** `lead_management.lead_quotation_revisions`
- **External:** AWS S3 (puppeteer for PDF rendering)
- **Batch size:** 5, Max attempts: 5
- **Lock:** `lockedAt` column (no Redis lock)

### 10.4 Meta Worker (`workers.meta.js`)
- **Service:** Integration
- **Type:** Durable loop (polls DB)
- **Interval:** `META_WORKER_RECOVERY_INTERVAL_MS` (default 60000ms)
- **Purpose:** Processes pending Meta webhook events → imports leads
- **Wake:** Redis wake signal on `crm:workers:wake:meta`
- **DB table:** `integration.webhook_events`
- **External:** Meta Graph API, Lead Management (HTTP `/internal/leads`)
- **Heartbeat:** `worker_heartbeats` table, updated every `META_WORKER_HEARTBEAT_INTERVAL_MS`
- **Concurrency:** Configurable via `META_WORKER_CONCURRENCY` (default 5)
- **Connection reconciliation:** Every `META_CONNECTION_RECONCILE_INTERVAL_MS`

### Common Pattern
All workers follow the same pattern: durable loop with wake listener (Redis pub/sub) + polling recovery. Workers are started as separate Node.js processes via `concurrently` or PM2.

### No traditional queues
- No BullMQ, RabbitMQ, or Kafka
- All "queues" are DB-based (outbox_event tables, webhook_event table)
- Redis is pub/sub only (not a queue), so messages can be lost if no subscriber

---

## 11. External Integrations

### 11.1 Meta/Facebook Lead Ads (ACTIVE)
- **Provider:** Meta Graph API (v20.0 in .env, v25.0 in .env.example)
- **OAuth flow:** Browser redirect → Meta login → callback → token encryption (AES-256-GCM) → stored in `connected_accounts`
- **Webhook:** HMAC-SHA256 signature verification, raw body capture
- **Lead import:** Webhook received → stored in `webhook_events` → worker processes → calls Lead Management `/internal/leads`
- **Field mapping:** `source_field_mappings` table maps external field keys to CRM field keys
- **App config:** `meta_app_configs` stores encrypted app secret
- **Health monitoring:** `meta_asset_connections` tracks capture status, errors, consecutive failures

### 11.2 AWS S3 (ACTIVE)
- **Purpose:** Storing quotation PDFs
- **Region:** `AWS_REGION` (ap-southeast-2 in .env)
- **Bucket:** `QUOTATION_S3_BUCKET` (royalitcrm in .env)
- **Presigned URLs:** For download, expires per `QUOTATION_DOWNLOAD_URL_EXPIRES_SECONDS`
- **Encryption:** `QUOTATION_S3_KMS_KEY_ID` (empty by default)

### 11.3 Redis/Upstash (ACTIVE)
- **Type 1:** Redis TCP via `redis://` URL (local Docker)
- **Type 2:** Upstash REST via `https://` URL + token (production on Render)
- **Purpose:** Socket.IO adapter, realtime event pub/sub, worker wake signals
- **Current .env:** Uses Upstash REST (`https://composed-ferret-118101.upstash.io`)

### 11.4 Puppeteer (ACTIVE)
- **Purpose:** Server-side PDF generation for quotations
- **Version:** 25.3.0
- **Used by:** Quotation document worker via `quotation-pdf.service.js`

### Integration Risks
1. **No rate-limit handling** for Meta Graph API calls
2. **Webhook signature verification** uses raw body capture but relies on `express.json` verify callback — verified present in code
3. **OAuth state CSRF** uses httpOnly cookie with `sameSite: "lax"` — adequate

---

## 12. Environment Variable Inventory

| Variable | Service | Sensitive | Documented | Required | Notes |
|---|---|---|---|---|---|
| `SOLOCRM_DATABASE_URL` | All | YES | Yes | Yes | Unified DB |
| `DATABASE_POOL_CONNECTION_LIMIT` | All | No | Yes | No | Default 10 |
| `AUTH_IAM_DATABASE_URL` | Auth | YES | Yes (commented) | No | Rollback ref |
| `LEAD_MANAGEMENT_DATABASE_URL` | Lead | YES | Yes (commented) | No | Rollback ref |
| `INTEGRATION_DATABASE_URL` | Integration | YES | Yes (commented) | No | Rollback ref |
| `JWT_ACCESS_SECRET` | Auth/IAM, Gateway | YES | Yes | Yes | |
| `JWT_REFRESH_SECRET` | Auth/IAM | YES | Yes | Yes | |
| `JWT_ACCESS_EXPIRES_IN` | Auth/IAM | No | Yes | No | Default "8h" |
| `JWT_REFRESH_EXPIRES_DAYS` | Auth/IAM | No | Yes | No | Default 30 |
| `REFRESH_COOKIE_NAME` | Auth/IAM | No | Yes | No | |
| `COOKIE_SECURE` | Auth/IAM | No | Yes | No | |
| `INTERNAL_SERVICE_SECRET` | All | YES | Yes | Yes | |
| `META_APP_ID` | Integration | No | Yes | Yes | |
| `META_APP_SECRET` | Integration | YES | Yes | Yes | |
| `META_WEBHOOK_VERIFY_TOKEN` | Integration | YES | Yes | Yes | |
| `META_WEBHOOK_APP_SECRET` | Integration | YES | Yes | Yes | |
| `AWS_ACCESS_KEY_ID` | Lead | YES | Yes | Yes | |
| `AWS_SECRET_ACCESS_KEY` | Lead | YES | Yes | Yes | PRODUCTION SECRET IN .env! |
| `REDIS_URL` | All | Maybe | Yes | Conditional | |
| `UPSTASH_REDIS_REST_URL` | All | No | Yes | Conditional | |
| `UPSTASH_REDIS_REST_TOKEN` | All | YES | Yes | Conditional | |
| `INTEGRATION_ENCRYPTION_KEY` | Integration | YES | Yes | Yes | AES-256-GCM key |
| `FRONTEND_BASE_URL` | Gateway, Services | No | Yes | No | Default http://localhost:5173 |
| `LOG_LEVEL` | All | No | Yes | No | Default "info" |
| `NODE_ENV` | All | No | Yes | No | Default "development" |
| `PUBLIC_BRANDING_*` | Gateway | No | Yes | No | Branding overrides |
| `BOOTSTRAP_*` | Auth | No | Yes | No | Dev bootstrap |
| `QUOTATION_S3_BUCKET` | Lead | No | Yes | Yes | |
| `REALTIME_ENABLED` | All | No | Yes | No | |

**CRITICAL:** `.env` contains live AWS `SECRET_ACCESS_KEY`, `REDIS_REST_TOKEN`, `META_APP_SECRET`, `META_WEBHOOK_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`, and `INTEGRATION_ENCRYPTION_KEY`. This file must NOT be committed to source control. The current `.gitignore` should already exclude `.env` — confirmed present.

---

## 13. Docker and Infrastructure

### docker-compose.yml
```yaml
services:
  solo-crm-db:
    image: postgres:16
    ports: ["5432:5432"]
    volumes:
      - solo_crm_postgres:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes:
      - realtime_redis:/data
```

**No service Dockerfiles** — all microservices are deployed as Node.js processes directly (likely on Render or via PM2 on EC2).

### ecosystem.config.cjs (PM2)
- Present but the content was noted as existing in the initial tree exploration. Not read in full.

### Deployment (from docs/EC2_DEPLOYMENT.md)
- EC2 deployment using PM2
- No Kubernetes/container orchestration
- Deployment scripts not present in repo (EC2_DEPLOYMENT.md provides instructions)

---

## 14. CI/CD and Deployment

**No CI/CD configuration found** — no GitHub Actions, GitLab CI, Jenkins, or any pipeline files.

Deployment appears to be manual via EC2 docs:
- PM2 process manager (`ecosystem.config.cjs`)
- Render.com might also be a target (references `RENDER_INSTANCE_ID` in code)
- `npm run start:render` starts all services + workers via concurrently

**Risks:**
- No automated testing before deployment
- No migration safety checks
- No rollback automation
- Production credentials must be managed manually

---

## 15. Testing Assessment

### Test Framework
- Node.js built-in test runner (`node:test`)
- 14 test files in `/tests`
- supertest for HTTP integration tests
- No coverage configuration found

### Test Coverage by Area

| Area | Test File | Type | Quality |
|---|---|---|---|
| Architecture | `architecture.test.mjs` | Structural | Good — validates file existence, schema config, API routes |
| Prisma config | `prisma-config.test.mjs` | Structural | Minimal — just checks auth schema |
| Auth bootstrap | `auth-bootstrap.test.mjs` | Unit | Good — mocks Prisma, tests bootstrap logic |
| Lead detail validation | `lead-detail-validation.test.mjs` | Integration | Good — validates Zod schemas + route wiring |
| Lead scale foundation | `lead-scale-foundation.test.mjs` | Unit | Excellent — cursors, masking, summary, updates, pagination |
| Meeting calendar | `meeting-calendar.test.mjs` | Unit | Excellent — full meeting lifecycle, time conflicts, RBAC |
| Meta integration | `meta-integration.test.mjs` | Unit | Extensive (1403 lines) — field mapping, signatures, OAuth, webhooks, import |
| Quotation | `quotation.test.mjs` | Unit | Good — HTML sanitization, PDF generation, lifecycle |
| Realtime | `realtime.test.mjs` | Unit | Socket.IO room logic |
| API Gateway proxy | `api-gateway-proxy.test.mjs` | Integration | Good — header forwarding, redirects, raw body |
| Public branding | `public-branding.test.mjs` | Integration | Good — env-based branding |
| Security contract | `security-contract.test.mjs` | Contract | RBAC permission mapping |
| Tenant isolation | `tenant-isolation.test.mjs` | Unit | Multi-tenant data isolation |
| User directory cache | `user-directory-cache.test.mjs` | Unit | User caching |

### Test Gaps
- **No database integration tests** — all tests mock Prisma
- **No worker tests** that test actual DB polling loops
- **No end-to-end tests** across services
- **No auth flow integration test** (login → token → refresh → logout)
- **No upgrade/migration tests**
- **No load/stress tests**

---

## 16. Security Assessment

### 16.1 Critical Findings

**C-1: Production secrets in .env file**
- File: `.env`
- Contains live `AWS_SECRET_ACCESS_KEY`, `META_APP_SECRET`, `META_WEBHOOK_APP_SECRET`, `REDIS_REST_TOKEN`, `INTEGRATION_ENCRYPTION_KEY`
- Risk: If `.env` is committed or leaked, all integrated services are compromised
- `.gitignore` should exclude it, but manual review of `.gitignore` confirms `.env` is listed
- **Recommendation:** Move to environment variables in deployment platform, never store in repo

### 16.2 High Findings

**H-1: Synchronous HTTP without retry for inter-service calls**
- File: `packages/common/src/service-client.js`
- No retry logic, no circuit breaker
- If Auth/IAM is down, all services fail immediately
- Risk: cascading failure

**H-2: No rate limiting**
- No rate limiting middleware on any service
- Risk: brute force on login, DoS on webhooks

**H-3: Internal secret in .env**
- `INTERNAL_SERVICE_SECRET` is in `.env`
- Used for service-to-service authentication
- Same secret for all services, no rotation

### 16.3 Medium Findings

**M-1: No CSRF protection beyond token-based auth**
- API Gateway has no CSRF tokens
- Mitigated by SameSite cookies and JWT in Authorization header

**M-2: Access token expiry 8h**
- Default `JWT_ACCESS_EXPIRES_IN` is 8 hours
- Long-lived access token increases window of compromise

**M-3: No CORS origin restriction**
- `cors({ credentials: true, origin: true })` allows any origin
- Acceptable during development but should be restricted in production

**M-4: No Helmet configuration beyond defaults**
- Using default Helmet options, no CSP configured

### 16.4 Low Findings

**L-1: Audit logs not used for security monitoring**
- `audit_logs` table exists but no monitoring/alerting on log entries

**L-2: Password complexity not enforced**
- Bootstrap accepts "12345678" passwords

### Security Controls in Place (Positive)
- **Input validation:** Zod schemas on all routes
- **Auth:** JWT + bcrypt password hashing (12 rounds)
- **Secrets encryption:** AES-256-GCM for Meta tokens
- **SQL injection:** Prevented by Prisma ORM
- **Webhook verification:** HMAC-SHA256 signature check
- **CORS:** configured but permissive
- **Helmet:** security headers
- **Logger redaction:** credentials, tokens, passwords redacted from logs
- **Cookie security:** httpOnly, secure flag, sameSite lax

---

## 17. Code Quality and Technical Debt

### Strengths
1. **Consistent architecture:** All services follow controller → service → repository → Prisma pattern
2. **Clear separation:** Business logic in services, data access in repositories, validation in validators
3. **DI-like pattern:** Functions create dependencies (factory pattern), making testing easy
4. **Error handling:** Centralized `errorHandler` middleware with consistent error response format
5. **Outbox pattern:** Events go through `outbox_event` tables for reliable processing
6. **Comprehensive event system:** Well-defined event names in `packages/contracts/src/events.js`

### Technical Debt

**T-1: No TypeScript**
- Although the project is well-organized, the lack of TypeScript means no compile-time type safety
- Prisma generates types but they're not fully utilized

**T-2: Single package.json monorepo (no workspaces)**
- All dependencies in root, no isolation between services
- No dependency hoisting or workspace-aware commands

**T-3: Historical migrations conflict with current schema**
- Old migrations reference `tenant_id` columns that no longer exist
- `prisma migrate deploy` will fail
- Must use `prisma db push` going forward

**T-4: Worker wake uses Redis pub/sub (fire-and-forget)**
- If Redis is down or subscriber misses the message, worker relies on polling recovery
- Polling intervals (2s-60s) mean delay in processing

**T-5: No schema-level migration history isolation**
- Three Prisma schemas in one database means three `_prisma_migrations` tables in different schemas
- Must remember to push all three schemas on deployment

**T-6: Some debug TODOs/comments may remain**
- Verified: `workers.outbox.js` has comprehensive error logging, no stale debug comments detected in reviewed code

**T-7: No connection pooling configuration**
- `DATABASE_POOL_CONNECTION_LIMIT` is read by config but not used by any Prisma client instantiation (each service creates `new PrismaClient()` without pool config)
- Prisma uses default connection limit internally

---

## 18. Unified Database Migration Readiness

### Current Status: CODE PREPARED, NOT YET EXECUTED

**Schema/config changes are prepared** in the codebase:
- All three Prisma schemas modified to use `SOLOCRM_DATABASE_URL` + `schemas` + `@@schema`
- Prisma clients regenerated and validated (pass `prisma validate`)
- Config package updated with `config.database` block
- `.env` / `.env.example` updated (old URLs commented out for rollback)
- Docker Compose updated to single DB container
- Migration scripts created (`init-db.sql`, `init-db.mjs`, `migrate-to-unified-db.mjs`)
- Documentation created (`docs/DB_UNIFICATION.md`)

**What has NOT been done (execution pending):**
- The `solo_crm` database has not been created on any PostgreSQL instance
- `node scripts/init-db.mjs` has not been run (schemas not created)
- `npm run prisma:push` has not been run (tables not created)
- No data has been migrated from old databases
- No services have been started against the unified database
- No end-to-end verification has been performed

### Required Execution Steps
1. Create the `solo_crm` database on target PostgreSQL
2. Run `node scripts/init-db.mjs` or `docker compose up -d solo-crm-db` (creates schemas + pg_trgm)
3. Run `npm run prisma:push` (creates all tables in all 3 schemas)
4. If migrating from old databases: stop services → run `npm run db:migrate:copy` → start services
5. Verify with `npm run test`

### Migration Complexity: LOW
- No schema name conflicts (all table names are unique across schemas? Let me verify...)
- **Verified:** `OutboxEvent` exists in all 3 schemas (same name, different schemas — OK due to schema isolation)
- No cross-schema foreign keys to break
- Old env vars commented out for rollback
- Rollback: uncomment old vars, comment `SOLOCRM_DATABASE_URL`, regenerate Prisma clients

### Rollback Requirements
- Old database URLs preserved (commented) in `.env`
- Old Docker containers documented (commented in docker-compose history)
- Reverse data copy script would be needed for full rollback after writes

---

## 19. Risks by Severity

### Critical
| ID | Risk | Location | Impact |
|---|---|---|---|
| C-1 | Live secrets in `.env` (AWS keys, Meta secrets, Redis token) | `.env` | Full account compromise if leaked |
| C-2 | No CI/CD pipeline — manual deployment only | N/A | Human error, no automated validation |

### High
| ID | Risk | Location | Impact |
|---|---|---|---|
| H-1 | Historical migrations incompatible with schema | `prisma/migrations/` | `migrate deploy` will fail; must use `db push` |
| H-2 | No retry/circuit-breaker on inter-service calls | `packages/common/service-client.js` | Cascading failures |
| H-3 | No rate limiting | All services | Brute force, DoS |
| H-4 | Multi-tenant isolation removed from schema | All Prisma schemas | Schemas isolate services, not tenants |

### Medium
| ID | Risk | Location | Impact |
|---|---|---|---|
| M-1 | No worker concurrency limits in lead outbox | `workers.outbox.js` | Possible duplicate event processing |
| M-2 | Meta Graph API version mismatch (v20 vs v25) | `.env` vs `.env.example` | API incompatibility risk |
| M-3 | Access token 8h TTL | Auth/IAM | Longer compromise window |
| M-4 | No connection pool config applied | `prisma.js` in each service | Default pool may be inadequate |

### Low
| ID | Risk | Location | Impact |
|---|---|---|---|
| L-1 | `normalizePagination` uses arbitrary 100-row max | `packages/common/pagination.js` | Limits large exports |
| L-2 | No database integration tests | All tests | False confidence in DB code |
| L-3 | Webhook event claim loop uses 3x candidate fetch | `integration.repository.js` | Inefficient under load |

---

## 20. Recommended Next Steps

### Immediate
1. **Move production secrets out of `.env`** — use deployment platform env vars
2. **Add CI/CD pipeline** — GitHub Actions or GitLab CI with test + lint + deploy
3. **Create a production `.env` template** without any real values

### Before Production
4. **Run `prisma db push`** on target database to create all schemas
5. **Add rate limiting middleware** (express-rate-limit)
6. **Restrict CORS** to specific frontend origin
7. **Reduce access token TTL** (1h) and implement refresh rotation (already built)
8. **Add worker idempotency** — verify outbox event processing is safe to repeat
9. **Configure Prisma connection pool** using `DATABASE_POOL_CONNECTION_LIMIT`

### Future Improvements
10. Add TypeScript for type safety
11. Add database integration tests with testcontainers
12. Add end-to-end tests across services
13. Implement retry with backoff for inter-service HTTP calls
14. Add monitoring/alerting on worker heartbeats
15. Add structured audit log analysis
16. Configure Content Security Policy in Helmet

---

## 21. Unknowns and Limitations

1. **Frontend not present in this repo** — there is no `apps/frontend` directory. The frontend is at `C:\Users\ASUS\OneDrive\Documents\GitHub\UPSTEP-CRM\` (parent directory, not examined).
2. **Actual PM2 ecosystem config** — `ecosystem.config.cjs` referenced in structure but not read in full.
3. **Deployment environment** — Render vs EC2 vs other. Code references `RENDER_INSTANCE_ID` suggesting Render.com is primary.
4. **Database currently running?** — `SOLOCRM_DATABASE_URL` in `.env` points to `localhost:5432`. No local PostgreSQL detected.
5. **Old databases** — old databases may have data. Migration script ready but not executed.
6. **No `pg` npm package** — the `--copy` mode of migrate script requires `pg` package which is not in dependencies.
7. **`clinic_id`** — architecture test checks `clinic_id` is not used. Confirmed absent from all schemas.
