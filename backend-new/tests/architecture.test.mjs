import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

// Reads a repository file as UTF-8 text.
function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

test("backend-new contains the planned microservice monorepo structure", () => {
  const expectedPaths = [
    "apps/api-gateway/src/app.js",
    "apps/auth-iam-service/prisma/schema.prisma",
    "apps/auth-iam-service/src/routes/auth.routes.js",
    "apps/auth-iam-service/src/routes/iam.routes.js",
    "apps/lead-management-service/prisma/schema.prisma",
    "apps/lead-management-service/src/routes/lead.routes.js",
    "apps/lead-management-service/src/routes/meeting.routes.js",
    "apps/lead-management-service/src/routes/quotation.routes.js",
    "apps/lead-management-service/src/routes/config.routes.js",
    "apps/integration-service/prisma/schema.prisma",
    "apps/integration-service/src/routes/meta.routes.js",
    "apps/integration-service/src/routes/webhook.routes.js",
    "packages/common/src/index.js",
    "packages/contracts/src/permissions.js",
    "packages/logger/src/index.js",
    "packages/config/src/index.js",
  ];

  for (const expectedPath of expectedPaths) {
    assert.equal(existsSync(join(root, expectedPath)), true, `${expectedPath} should exist`);
  }
});

test("services use shared unified database with PostgreSQL schema isolation", () => {
  const authSchema = read("apps/auth-iam-service/prisma/schema.prisma");
  const leadSchema = read("apps/lead-management-service/prisma/schema.prisma");
  const integrationSchema = read("apps/integration-service/prisma/schema.prisma");

  assert.match(authSchema, /provider\s+=\s+"postgresql"/);
  assert.match(leadSchema, /provider\s+=\s+"postgresql"/);
  assert.match(integrationSchema, /provider\s+=\s+"postgresql"/);
  assert.match(authSchema, /env\("SOLOCRM_DATABASE_URL"\)/);
  assert.match(leadSchema, /env\("SOLOCRM_DATABASE_URL"\)/);
  assert.match(integrationSchema, /env\("SOLOCRM_DATABASE_URL"\)/);
  assert.match(authSchema, /@@schema\("auth_iam"\)/);
  assert.match(leadSchema, /@@schema\("lead_management"\)/);
  assert.match(integrationSchema, /@@schema\("integration"\)/);
});

test("schema isolation boundaries are correct and clinic_id is not used", () => {
  const authSchema = read("apps/auth-iam-service/prisma/schema.prisma");
  const leadSchema = read("apps/lead-management-service/prisma/schema.prisma");
  const integrationSchema = read("apps/integration-service/prisma/schema.prisma");
  const combined = `${authSchema}\n${leadSchema}\n${integrationSchema}`;

  assert.equal(combined.includes("clinic_id"), false);
  assert.match(authSchema, /@@schema\("auth_iam"\)/);
  assert.match(leadSchema, /@@schema\("lead_management"\)/);
  assert.match(integrationSchema, /@@schema\("integration"\)/);
});

test("public route surfaces match the phase-one API contract", () => {
  const authRoutes = read("apps/auth-iam-service/src/routes/auth.routes.js");
  const iamRoutes = read("apps/auth-iam-service/src/routes/iam.routes.js");
  const leadRoutes = read("apps/lead-management-service/src/routes/lead.routes.js");
  const meetingRoutes = read("apps/lead-management-service/src/routes/meeting.routes.js");
  const quotationRoutes = read("apps/lead-management-service/src/routes/quotation.routes.js");
  const configRoutes = read("apps/lead-management-service/src/routes/config.routes.js");
  const metaRoutes = read("apps/integration-service/src/routes/meta.routes.js");
  const webhookRoutes = read("apps/integration-service/src/routes/webhook.routes.js");

  for (const route of ["/register", "/login", "/refresh-token", "/logout", "/me"]) {
    assert.match(authRoutes, new RegExp(route.replace("/", "\\/")));
  }
  for (const route of ["/users", "/roles", "/permissions", "/iam/check-permission"]) {
    assert.match(iamRoutes, new RegExp(route.replace("/", "\\/")));
  }
  for (const route of ["/bulk-assign", "/:id/assign", "/:id/change-status", "/:id/followups", "/:id/timeline"]) {
    assert.match(leadRoutes, new RegExp(route.replace("/", "\\/")));
  }
  for (const route of ["/meetings", "/meetings/:id", "/meetings/:id/cancel", "/meeting-staff"]) {
    assert.match(meetingRoutes, new RegExp(route.replaceAll("/", "\\/")));
  }
  for (const route of ["/:id/mark-sent", "/:id/revisions", "/:id/revisions/:revisionNumber/download-url", "/:id/status"]) {
    assert.match(quotationRoutes, new RegExp(route.replaceAll("/", "\\/")));
  }
  for (const route of ["/lead-fields", "/pipelines", "/pipelines/:id/statuses"]) {
    assert.match(configRoutes, new RegExp(route.replace("/", "\\/")));
  }
  for (const route of ["/app-config", "/oauth/start", "/oauth/callback", "/accounts", "/pages", "/pages/:pageId/forms", "/forms", "/forms/connect", "/forms/:id/map-fields", "/sync-logs", "/process-pending"]) {
    assert.match(metaRoutes, new RegExp(route.replace("/", "\\/")));
  }
  for (const route of ["/meta"]) {
    assert.match(webhookRoutes, new RegExp(route.replace("/", "\\/")));
  }
});
