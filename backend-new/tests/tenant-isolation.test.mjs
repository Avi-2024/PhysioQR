import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

// Reads a repository file as UTF-8 text.
function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

test("lead-owned tables include tenantId and tenant-first indexes", () => {
  const schema = read("apps/lead-management-service/prisma/schema.prisma");
  const modelBlocks = [...schema.matchAll(/model\s+(\w+)\s+\{([\s\S]*?)\n\}/g)];
  const tenantOwnedModels = modelBlocks.map((match) => [match[1], match[2]]);

  for (const [modelName, block] of tenantOwnedModels) {
    assert.match(block, /tenantId\s+String\s+@map\("tenant_id"\)/, `${modelName} must include tenantId`);
    assert.match(block, /@@index\(\[tenantId|@@unique\(\[tenantId/, `${modelName} must include a tenant-first index or unique key`);
  }
});

test("lead repositories apply tenantId to read and write paths", () => {
  const leadRepository = read("apps/lead-management-service/src/repositories/lead.repository.js");
  const configRepository = read("apps/lead-management-service/src/repositories/config.repository.js");
  const meetingRepository = read("apps/lead-management-service/src/repositories/meeting.repository.js");

  for (const snippet of [
    "where: { tenantId",
    "where: { tenantId, id: leadId",
    "where: { tenantId, leadId",
    "where: { tenantId, pipelineId",
    "where: { tenantId, id: sourceId",
  ]) {
    assert.ok(`${leadRepository}\n${configRepository}\n${meetingRepository}`.includes(snippet), `${snippet} should be present`);
  }

  assert.match(meetingRepository, /tenantId,\s*deletedAt:\s*null/);
  assert.match(meetingRepository, /where:\s*\{\s*id:\s*meetingId,\s*tenantId/);
});

test("lead service delegates RBAC and ABAC checks to Auth/IAM before workflows", () => {
  const leadService = read("apps/lead-management-service/src/services/lead.service.js");

  for (const permission of [
    "LEAD_CREATE_OWN",
    "LEAD_READ_OWN",
    "LEAD_READ_TEAM",
    "LEAD_READ_ALL",
    "LEAD_UPDATE_OWN",
    "LEAD_ASSIGN_ALL",
    "LEAD_BULK_ASSIGN_ALL",
    "LEAD_STATUS_CHANGE_OWN",
    "LEAD_FOLLOWUP_CREATE_OWN",
  ]) {
    assert.ok(leadService.includes(permission), `${permission} should be checked`);
  }
});
