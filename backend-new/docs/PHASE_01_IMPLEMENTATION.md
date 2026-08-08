# Phase 1 Implementation Notes

Implemented scope:
- API Gateway.
- Auth/IAM service.
- Lead Management service.
- Integration service with Meta Lead Ads account, form, mapping, webhook, sync log, and worker support.
- Shared config, logger, contracts, and common middleware packages.
- Separate Prisma schemas and PostgreSQL datasource URLs per service.
- Tenant boundary standardized on `tenant_id`.

Important constraints:
- Meta integration is intentionally not implemented in Phase 1.
- Billing, subscriptions, white-label, AI scoring, and advanced reporting are not implemented in Phase 1.
- The gateway is intentionally thin; business logic remains inside services.

Verification commands:

```powershell
cd backend-new
npm install
npm run prisma:generate
npm run verify
```

Database commands require PostgreSQL instances:

```powershell
docker compose up -d
npx prisma migrate dev --schema apps/auth-iam-service/prisma/schema.prisma
npx prisma migrate dev --schema apps/lead-management-service/prisma/schema.prisma
```
