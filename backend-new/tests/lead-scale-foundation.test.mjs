import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PERMISSIONS } from "../packages/contracts/src/permissions.js";
import {
  createLeadService,
  decodeLeadCursor,
  encodeLeadCursor,
  maskLeadEmail,
  maskLeadPhone,
} from "../apps/lead-management-service/src/services/lead.service.js";
import { LeadValidators } from "../apps/lead-management-service/src/validators/lead.validators.js";

const tenantId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const leadId = "33333333-3333-4333-8333-333333333333";

// Creates service dependencies with all-scope lead read permission.
function serviceDependencies(overrides = {}) {
  return {
    leadRepository: {},
    configRepository: {},
    authorizationService: {
      checkPermission: async ({ permission }) => ({
        allowed: permission === PERMISSIONS.LEAD_READ_ALL,
        teamIds: [],
      }),
    },
    userDirectoryService: {
      resolveUsers: async () => [],
    },
    ...overrides,
  };
}

// Returns a tenant and user context for lead service tests.
function requestContext() {
  return { tenantId, user: { id: userId } };
}

test("lead cursors round-trip deterministic pagination state and reject mismatched queries", () => {
  const encoded = encodeLeadCursor({
    id: leadId,
    createdAt: "2026-07-14T10:00:00.000Z",
    sortBy: "newest",
    search: "rohit",
    rank: 2,
    score: 0.75,
  });
  const decoded = decodeLeadCursor(encoded, { sortBy: "newest", search: " Rohit " });

  assert.equal(decoded.id, leadId);
  assert.equal(decoded.createdAt.toISOString(), "2026-07-14T10:00:00.000Z");
  assert.equal(decoded.rank, 2);
  assert.throws(
    () => decodeLeadCursor(encoded, { sortBy: "oldest", search: "rohit" }),
    (error) => error.code === "VALIDATION_FAILED" && error.statusCode === 400,
  );
  assert.throws(
    () => decodeLeadCursor("not-a-valid-cursor", { sortBy: "newest" }),
    (error) => error.code === "VALIDATION_FAILED",
  );
});

test("lead selector masks phone and email contact data in the service", async () => {
  let repositoryCall;
  const service = createLeadService(serviceDependencies({
    leadRepository: {
      listLeadOptions: async (...args) => {
        repositoryCall = args;
        return {
          data: [{
            id: leadId,
            fullName: "Rohit Bajpai",
            phone: "+91 98765 43210",
            email: "Rohit@example.com",
            source: { name: "Meta Lead Ads" },
            status: { name: "New" },
            createdAt: new Date("2026-07-14T10:00:00.000Z"),
          }],
          hasMore: false,
          nextPosition: null,
        };
      },
    },
  }));

  const result = await service.listOptions(requestContext(), { q: "rohit", limit: 20 });

  assert.equal(repositoryCall[0], tenantId);
  assert.deepEqual(repositoryCall[3], { scope: "all", userId, teamIds: [] });
  assert.deepEqual(result.data[0], {
    id: leadId,
    fullName: "Rohit Bajpai",
    maskedPhone: "********3210",
    maskedEmail: "r***@example.com",
    sourceName: "Meta Lead Ads",
    statusName: "New",
    createdAt: new Date("2026-07-14T10:00:00.000Z"),
  });
  assert.equal(maskLeadPhone(null), null);
  assert.equal(maskLeadEmail("invalid"), "***");
});

test("lead summary preserves repository counts and resolves only directory-backed assignees", async () => {
  let repositoryScope;
  const service = createLeadService(serviceDependencies({
    leadRepository: {
      summarizeLeads: async (_tenantId, scope) => {
        repositoryScope = scope;
        return {
          total: 10,
          today: 4,
          hot: 3,
          urgent: 2,
          assigned: 8,
          unassigned: 2,
          assignmentRate: 80,
          statusBreakdown: [{ statusId: "status-1", statusName: "New", count: 6 }],
          assigneeBreakdown: [
            { assignedTo: userId, count: 5 },
            { assignedTo: "unresolved-user", count: 3 },
          ],
        };
      },
    },
    userDirectoryService: {
      resolveUsers: async (_context, ids) => {
        assert.deepEqual(ids, [userId, "unresolved-user"]);
        return [{ id: userId, name: "Khushi", email: "khushi@example.com" }];
      },
    },
  }));

  const result = await service.summary(requestContext());

  assert.deepEqual(repositoryScope, { scope: "all", userId, teamIds: [] });
  assert.equal(result.total, 10);
  assert.equal(result.today, 4);
  assert.equal(result.assignmentRate, 80);
  assert.deepEqual(result.statusBreakdown, [{ id: "status-1", label: "New", count: 6 }]);
  assert.deepEqual(result.assigneeBreakdown, [{ id: userId, label: "Khushi", count: 5 }]);
});

test("lead updates merge changed custom fields without erasing Meta answers", async () => {
  let repositoryInput;
  const existingLead = {
    id: leadId,
    tenantId,
    assignedTo: userId,
    assignedTeamId: null,
    createdBy: userId,
    customFieldsJson: {
      interest: "Old interest",
      what_type_of_service_are_you_looking_for: "crm",
    },
  };
  const service = createLeadService(serviceDependencies({
    authorizationService: {
      assertPermission: async () => ({ allowed: true }),
    },
    configRepository: {
      listFields: async () => [{
        id: "field-interest",
        fieldKey: "interest",
        fieldType: "TEXT",
        isRequired: false,
      }],
    },
    leadRepository: {
      findById: async () => existingLead,
      updateLead: async (input) => {
        repositoryInput = input;
        return { ...existingLead, ...input.patch };
      },
    },
  }));

  await service.update(requestContext(), leadId, { customFields: { interest: "CRM implementation" } });

  assert.deepEqual(repositoryInput.patch.customFieldsJson, {
    interest: "CRM implementation",
    what_type_of_service_are_you_looking_for: "crm",
  });
  assert.equal(repositoryInput.customValues.length, 1);
  assert.equal(repositoryInput.customValues[0].fieldKey, "interest");
});

test("lead list keeps legacy pagination and uses count-free repository method for cursors", async () => {
  let legacyCalls = 0;
  let cursorCalls = 0;
  const service = createLeadService(serviceDependencies({
    leadRepository: {
      listLeads: async () => {
        legacyCalls += 1;
        return { data: [{ id: leadId }], total: 101 };
      },
      listLeadsCursor: async () => {
        cursorCalls += 1;
        return { data: [{ id: leadId }], hasMore: false, nextPosition: null };
      },
    },
  }));

  const legacy = await service.list(requestContext(), { page: 2, limit: 25 });
  assert.equal(legacy.pagination.page, 2);
  assert.equal(legacy.pagination.total, 101);
  assert.equal(legacyCalls, 1);

  const cursor = encodeLeadCursor({
    id: leadId,
    createdAt: "2026-07-14T10:00:00.000Z",
    sortBy: "newest",
    search: "",
  });
  const cursorResult = await service.list(requestContext(), { cursor, limit: 20 });
  assert.equal(cursorResult.meta.hasMore, false);
  assert.equal(cursorResult.meta.nextCursor, null);
  assert.equal(cursorCalls, 1);
  assert.equal(legacyCalls, 1);

  const firstCursorPage = await service.list(requestContext(), { limit: 20 });
  assert.equal(firstCursorPage.meta.hasMore, false);
  assert.equal(cursorCalls, 2);
});

test("lead options validation normalizes short queries and enforces default limits", () => {
  const valid = LeadValidators.listOptions.safeParse({ body: {}, params: {}, query: {} });
  const tooShort = LeadValidators.listOptions.safeParse({ body: {}, params: {}, query: { q: "r" } });
  const tooLarge = LeadValidators.listOptions.safeParse({ body: {}, params: {}, query: { limit: "51" } });

  assert.equal(valid.success, true);
  assert.equal(valid.data.query.limit, 20);
  assert.equal(tooShort.success, true);
  assert.equal(tooShort.data.query.q, undefined);
  assert.equal(tooLarge.success, false);
});

test("lead attribution filter options retain the resolved read scope", async () => {
  let repositoryCall;
  const service = createLeadService(serviceDependencies({
    leadRepository: {
      listAttributionOptions: async (...args) => {
        repositoryCall = args;
        return {
          campaigns: [{ id: "campaign-1", name: "Summer Campaign", leadCount: 12 }],
          forms: [{ id: "form-1", name: "Website Leads", leadCount: 8 }],
          adSets: [{ id: "adset-1", name: "Business Owners", leadCount: 6 }],
        };
      },
    },
  }));

  const result = await service.filterOptions(requestContext());

  assert.equal(repositoryCall[0], tenantId);
  assert.deepEqual(repositoryCall[1], { scope: "all", userId, teamIds: [] });
  assert.equal(result.campaigns[0].leadCount, 12);
  assert.equal(result.forms[0].name, "Website Leads");
});

test("lead list validation accepts bounded external attribution identifiers", () => {
  const parsed = LeadValidators.list.safeParse({
    body: {},
    params: {},
    query: {
      externalCampaignId: "campaign-1",
      externalFormId: "form-1",
      externalAdSetId: "adset-1",
    },
  });

  assert.equal(parsed.success, true);
  assert.equal(parsed.data.query.externalCampaignId, "campaign-1");
  assert.equal(parsed.data.query.externalFormId, "form-1");
  assert.equal(parsed.data.query.externalAdSetId, "adset-1");
});

test("lead options and summary routes are declared before the dynamic lead ID route", () => {
  const routes = readFileSync(
    new URL("../apps/lead-management-service/src/routes/lead.routes.js", import.meta.url),
    "utf8",
  );

  assert.ok(routes.indexOf('router.get("/options"') < routes.indexOf('router.get("/:id"'));
  assert.ok(routes.indexOf('router.get("/filter-options"') < routes.indexOf('router.get("/:id"'));
  assert.ok(routes.indexOf('router.get("/summary"') < routes.indexOf('router.get("/:id"'));
});

test("lead attribution migration backfills Meta metadata and creates tenant-first indexes", () => {
  const migration = readFileSync(
    new URL("../apps/lead-management-service/prisma/migrations/20260717120000_add_lead_attribution_filters/migration.sql", import.meta.url),
    "utf8",
  );

  assert.match(migration, /custom_fields_json.*meta_form_id/s);
  assert.match(migration, /custom_fields_json.*meta_campaign_id/s);
  assert.match(migration, /leads_tenant_deleted_form_created_idx/);
  assert.match(migration, /leads_tenant_deleted_campaign_created_idx/);
  assert.match(migration, /leads_tenant_deleted_adset_created_idx/);
});
