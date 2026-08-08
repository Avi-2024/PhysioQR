# Backend-New SaaS Lead Platform

Phase 1 creates a microservice monorepo for a reusable multi-tenant lead management backend.

Locked decisions:
- Microservices inside `backend-new`.
- Unified PostgreSQL database with schema-level isolation for services.
- Current scope includes Auth/IAM, Tenant, Lead core, and Meta Lead Ads integration.
- Billing, AI scoring, white-label admin, and advanced reporting are later phases.

## Services

- `apps/api-gateway`: public edge service and service proxy.
- `apps/auth-iam-service`: tenants, users, teams, roles, permissions, sessions, refresh rotation, permission decisions.
- `apps/lead-management-service`: sources, pipelines, statuses, custom fields, leads, assignment, follow-ups, timeline.
- `apps/integration-service`: Meta OAuth, connected accounts, forms, mappings, webhooks, sync logs, and workers.

## Database Architecture

All three services share one PostgreSQL database (`solo_crm`) with schema isolation:

| Schema | Service |
| --- | --- |
| `auth_iam` | Auth/IAM Service |
| `lead_management` | Lead Management Service |
| `integration` | Integration Service |

Set `SOLOCRM_DATABASE_URL` in your environment to the unified database connection string.

## Required Flow

Every endpoint follows:

```text
Route -> Validator -> Controller -> Service -> Repository -> Prisma
```

Business rules live in services. Repositories own Prisma access and must always scope tenant-owned data.

## Local Development

```powershell
cd backend-new
npm install

# Start PostgreSQL and Redis
docker compose up -d

# Initialize schemas and tables
npm run prisma:push
npm run prisma:validate
npm run prisma:generate

# Run tests
npm run test
```

For production, use `prisma db push` only on an empty database.
