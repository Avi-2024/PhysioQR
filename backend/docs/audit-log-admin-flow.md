# Audit Log Admin Flow

## Purpose

Audit logs provide a read-only investigation trail for important Admin, financial, clinical-safety, support, program, and agent actions.

## Write Path

Use:

```js
const { writeAuditLog } = require('../utils/auditLogger');
```

Example:

```js
await writeAuditLog({
  req,
  action: 'clinic_visit_updated',
  module: 'ClinicVisit',
  recordId: visit._id,
  previousValue,
  newValue: visit,
  reason: 'Agent updated follow-up notes',
});
```

The logger records:

- authenticated user
- user role
- action
- module
- record ID
- previous value
- new value
- reason
- IP address
- device/user-agent
- request ID
- method
- path
- status code
- optional metadata

Audit write failures are logged but do not crash the primary business operation.

## Admin List API

Endpoint:

`GET /api/admin/audit-logs`

Auth:

Admin only

Filters:

- `module`
- `action`
- `userRole`
- `recordId`
- `performedBy`
- `fromDate`
- `toDate`
- `search`
- `includeValues=true`
- `page`
- `limit`
- `sortBy`
- `sortOrder`

Default list excludes `previousValue` and `newValue` to keep responses light.

Use `includeValues=true` only on screens where before/after payloads are needed.

## Admin Detail API

Endpoint:

`GET /api/admin/audit-logs/:id`

Returns the full audit log with before/after values.

## Export API

Endpoint:

`GET /api/admin/audit-logs/export?format=csv`

Supported formats:

- `csv`
- `json`

Filters are the same as list.

Export limit is capped at 5000 records per request.

Example:

`GET /api/admin/audit-logs/export?format=csv&module=ClinicVisit&fromDate=2026-08-01&toDate=2026-08-31`

## Read-Only Rule

There is no normal API to update or delete audit logs.

Operational cleanup, archival, or retention jobs should be implemented separately from the Admin panel and should never allow normal Admin users to mutate historical audit records.

## Verification

Covered by `npm run test:integration`:

- Admin lists audit logs by module.
- Admin reads audit log detail.
- Admin exports audit logs as JSON.
