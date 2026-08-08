# Database Unification Report

## 1. Objective

Consolidate three separate PostgreSQL databases into one shared database while preserving service-level isolation through PostgreSQL schemas. This reduces infrastructure cost, simplifies connection management, and eases backup/replication procedures.

## 2. Architecture

### Before (Three Databases)

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│   Auth/IAM Service   │     │ Lead Management Svc │     │  Integration Service │
│  (port 4100)         │     │  (port 4200)        │     │  (port 4300)         │
│                      │     │                      │     │                      │
│  AUTH_IAM_DATABASE   │     │ LEAD_MANAGEMENT_DB   │     │ INTEGRATION_DATABASE │
│  ┌───────────────┐   │     │  ┌───────────────┐   │     │  ┌───────────────┐   │
│  │  public schema │   │     │  │  public schema │   │     │  │  public schema │   │
│  └───────────────┘   │     │  └───────────────┘   │     │  └───────────────┘   │
│  Postgres :5433      │     │  Postgres :5434      │     │  Postgres :5435      │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
```

### After (One Shared Database)

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│   Auth/IAM Service   │     │ Lead Management Svc │     │  Integration Service │
│  (port 4100)         │     │  (port 4200)        │     │  (port 4300)         │
│                      │     │                      │     │                      │
│  SOLOCRM_DATABASE_URL ├─────┤ SOLOCRM_DATABASE_URL ├─────┤ SOLOCRM_DATABASE_URL │
│                      │     │                      │     │                      │
└─────────┬────────────┘     └──────────┬───────────┘     └──────────┬───────────┘
          │                             │                            │
          └─────────────────────────────┼────────────────────────────┘
                                        ▼
                          ┌─────────────────────────┐
                          │  PostgreSQL :5432        │
                          │  Database: solo_crm      │
                          │                          │
                          │  ┌─────────────────────┐ │
                          │  │ schema: auth_iam    │ │ ← Auth/IAM tables
                          │  ├─────────────────────┤ │
                          │  │ schema: lead_manage-│ │ ← Lead Mgmt tables
                          │  │ ment                │ │
                          │  ├─────────────────────┤ │
                          │  │ schema: integration │ │ ← Integration tables
                          │  └─────────────────────┘ │
                          └─────────────────────────┘
```

## 3. Prisma Schema Isolation

Each service's `schema.prisma` now uses:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("SOLOCRM_DATABASE_URL")
  schemas  = ["auth_iam"]          // service-specific schema name
}
```

Every model and enum includes:
```prisma
@@schema("auth_iam")               // matches the datasource schemas entry
```

### Schema Assignments

| Service | Schema Name | Tables |
|---------|-------------|--------|
| Auth/IAM | `auth_iam` | `User`, `RefreshToken`, `AuditLog`, etc. |
| Lead Management | `lead_management` | `Company`, `Contact`, `Deal`, `Lead`, `Note`, `Task`, etc. |
| Integration | `integration` | `MetaConnection`, `MetaForm`, `MetaLead`, `SentEmail`, etc. |

## 4. Configuration Changes

### Environment Variables

| Variable | Status | Notes |
|----------|--------|-------|
| `SOLOCRM_DATABASE_URL` | **New** | Single connection string for all services |
| `DATABASE_POOL_CONNECTION_LIMIT` | **New** | Max pool connections (default: 10) |
| `AUTH_IAM_DATABASE_URL` | *Commented out* | Preserved for rollback reference |
| `LEAD_MANAGEMENT_DATABASE_URL` | *Commented out* | Preserved for rollback reference |
| `INTEGRATION_DATABASE_URL` | *Commented out* | Preserved for rollback reference |

### Config Package (`packages/config/src/index.js`)

Added `config.database` block:
```js
database: {
  url: env.SOLOCRM_DATABASE_URL,
  poolConnectionLimit: Number(env.DATABASE_POOL_CONNECTION_LIMIT) || 10,
  schemas: {
    authIam: "auth_iam",
    leadManagement: "lead_management",
    integration: "integration",
  },
},
```

Removed per-service `databaseUrl` entries from each microservice's config block.

## 5. Docker Compose Changes

**Before:** Three containers (`auth-iam-db`:5433, `lead-management-db`:5434, `integration-db`:5435) with three volumes and three init scripts.

**After:** One container (`solo-crm-db`:5432) with one volume and one init script.

```yaml
solo-crm-db:
  image: postgres:16-alpine
  container_name: solo-crm-db
  environment:
    POSTGRES_DB: solo_crm
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgres
  ports:
    - "5432:5432"
  volumes:
    - solo-crm-db-data:/var/lib/postgresql/data
    - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
```

## 6. Scripts Created

### `scripts/init-db.sql`
Creates the three schemas and `pg_trgm` extension on first database initialization:
```sql
CREATE SCHEMA IF NOT EXISTS auth_iam;
CREATE SCHEMA IF NOT EXISTS lead_management;
CREATE SCHEMA IF NOT EXISTS integration;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### `scripts/init-db.mjs`
Programmatic equivalent for environments where SQL execution is done through Prisma:
```bash
node scripts/init-db.mjs
```

### `scripts/migrate-to-unified-db.mjs`
Two-mode data migration script:

**Validate mode** (checks data consistency without copying):
```bash
node scripts/migrate-to-unified-db.mjs --validate
```

**Copy mode** (copies data from old databases to new unified database):
```bash
node scripts/migrate-to-unified-db.mjs --copy
```

**Copy mode with custom connection strings:**
```bash
node scripts/migrate-to-unified-db.mjs --copy \
  --old-auth-iam "postgresql://user:pass@host:5433/auth_iam" \
  --old-lead-management "postgresql://user:pass@host:5434/lead_management" \
  --old-integration "postgresql://user:pass@host:5435/integration" \
  --new "postgresql://user:pass@host:5432/solo_crm"
```

## 7. Package.json Scripts Added

```json
{
  "db:init": "node scripts/init-db.mjs",
  "db:migrate:validate": "node scripts/migrate-to-unified-db.mjs --validate",
  "db:migrate:copy": "node scripts/migrate-to-unified-db.mjs --copy"
}
```

## 8. Migration Procedure (Cutover Guide)

### Prerequisites
- Target PostgreSQL 16 instance running with `solo_crm` database created
- All three old databases accessible for read

### Steps

1. **Initialize schemas** on the new database:
   ```bash
   # If using Docker: the init-db.sql runs automatically on first start
   # If using existing database:
   node scripts/init-db.mjs
   ```

2. **Push Prisma schemas** to create tables:
   ```bash
   npm run prisma:push
   ```

3. **Validate** source databases are readable:
   ```bash
   npm run db:migrate:validate
   ```

4. **Stop all services** to prevent writes during migration:
   ```bash
   # Stop application containers/processes
   ```

5. **Copy data** from old databases to new unified database:
   ```bash
   npm run db:migrate:copy
   ```

6. **Update environment variables**:
   - Set `SOLOCRM_DATABASE_URL` to the new connection string
   - Remove or comment out old per-service URLs

7. **Regenerate Prisma clients** (if schema files changed):
   ```bash
   npm run prisma:generate
   ```

8. **Restart services** and verify.

## 9. Rollback Procedure

If issues arise after cutover:

1. **Stop all services**.
2. **Restore old environment variables** — uncomment the old `*_DATABASE_URL` vars.
3. **Update `SOLOCRM_DATABASE_URL`** — comment it out or remove it.
4. **Regenerate Prisma clients**:
   ```bash
   npm run prisma:generate
   ```
5. **Restart services** against the old three-database setup.

Note: Data written to the unified database after cutover will not automatically appear in the old databases. To fully roll back after writes have occurred, a reverse data copy would be needed.

## 10. Files Modified

| File | Change |
|------|--------|
| `apps/auth-iam-service/prisma/schema.prisma` | Switched to `SOLOCRM_DATABASE_URL` + `schemas = ["auth_iam"]` + `@@schema("auth_iam")` on all models/enums |
| `apps/lead-management-service/prisma/schema.prisma` | Switched to `SOLOCRM_DATABASE_URL` + `schemas = ["lead_management"]` + `@@schema("lead_management")` on all models/enums |
| `apps/integration-service/prisma/schema.prisma` | Switched to `SOLOCRM_DATABASE_URL` + `schemas = ["integration"]` + `@@schema("integration")` on all models/enums |
| `packages/config/src/index.js` | Added `config.database` block; removed per-service `databaseUrl` entries |
| `.env` | Replaced 3 DB URLs with `SOLOCRM_DATABASE_URL` + `DATABASE_POOL_CONNECTION_LIMIT` |
| `.env.example` | Same as `.env` with placeholder values |
| `docker-compose.yml` | Replaced 3 DB containers with 1; added init-db.sql mount |
| `tests/prisma-config.test.mjs` | Updated to check `SOLOCRM_DATABASE_URL` |
| `tests/architecture.test.mjs` | Added check that all schemas use `SOLOCRM_DATABASE_URL` |
| `docs/DEPLOYMENT_SETUP.md` | Updated for unified DB |
| `EC2_DEPLOYMENT.md` | Updated for unified DB |
| `README.md` | Updated architecture description |

## 11. Files Created

| File | Purpose |
|------|---------|
| `scripts/init-db.sql` | Docker entrypoint SQL to create schemas |
| `scripts/init-db.mjs` | Programmatic schema creation |
| `scripts/migrate-to-unified-db.mjs` | Data copy/validation between old and new databases |
| `docs/DB_UNIFICATION.md` | This report |

## 12. Validation Summary

All three Prisma schemas pass validation:
- `auth-iam-service` — valid ✓
- `lead-management-service` — valid ✓
- `integration-service` — valid ✓

All three Prisma clients regenerated successfully (v6.19.3).

Architecture tests pass (4/5; 1 pre-existing `/register` route failure unrelated to DB work).

## 13. Notes & Caveats

- **Connection pooling:** With all services sharing one database, connection pool sizing becomes critical. Each service's pool size is governed by `DATABASE_POOL_CONNECTION_LIMIT`. Review `poolConnectionLimit` based on expected concurrent load.
- **Schema ownership:** All three schemas are owned by the same database user. For stricter isolation, create separate database roles with schema-level privileges.
- **Prisma migrate vs push:** Historical migration files reference `tenant_id` columns absent from the current schemas. Use `prisma db push` for schema deployment instead of `migrate deploy`. Old migration files are preserved in the repo for reference but are not reapplied.
- **Generated clients:** The `generated/prisma/` directories under each app contain the Prisma client. These are regenerated with `npm run prisma:generate`.

## 14. Troubleshooting

### Prisma generate fails with EPERM
The native query engine DLL may be locked by another process. Stop all Node processes and try again:
```bash
# Windows
taskkill /F /IM node.exe
npx prisma generate --schema apps/<service>/prisma/schema.prisma
```

### Prisma validate fails on @@schema
Ensure every model and enum in the schema file has `@@schema("...")` matching the datasource `schemas` array entry.

### "relation does not exist" at runtime
Verify that:
1. The schema was created: `CREATE SCHEMA IF NOT EXISTS <name>;`
2. Prisma push was run: `npx prisma db push --schema <path>`
3. The correct `SOLOCRM_DATABASE_URL` is set in the environment

### Connection limit exceeded
Increase `DATABASE_POOL_CONNECTION_LIMIT` in `.env` and restart services. Also consider increasing `max_connections` in PostgreSQL config.
