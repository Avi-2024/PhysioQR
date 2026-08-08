import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import jwt from "jsonwebtoken";
import { config } from "../packages/config/src/index.js";
import { createLeadConfigRepository } from "../apps/lead-management-service/src/repositories/config.repository.js";
import { createLeadConfigService } from "../apps/lead-management-service/src/services/config.service.js";
import { createLeadService } from "../apps/lead-management-service/src/services/lead.service.js";
import { createMetaFieldMapper } from "../apps/integration-service/src/services/meta-field-mapper.js";
import { createMetaService } from "../apps/integration-service/src/services/meta.service.js";
import { createIntegrationRepository } from "../apps/integration-service/src/repositories/integration.repository.js";
import { MetaValidators } from "../apps/integration-service/src/validators/meta.validators.js";
import { runMetaWorkerLoop } from "../apps/integration-service/src/workers.meta.js";

const root = fileURLToPath(new URL("..", import.meta.url));

// Reads a repository file as UTF-8 text.
function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

test("Meta mapper sends standard fields to lead core fields", () => {
  const mapper = createMetaFieldMapper();
  const mapped = mapper.mapFieldData({
    fieldData: [
      { name: "full_name", values: ["Asha Sharma"] },
      { name: "phone_number", values: ["9999999999"] },
      { name: "email", values: ["asha@example.com"] },
    ],
    mappings: [],
  });

  assert.deepEqual(mapped.standard, {
    fullName: "Asha Sharma",
    phone: "9999999999",
    email: "asha@example.com",
  });
});

test("Meta mapper converts custom ad questions into dynamic custom fields", () => {
  const mapper = createMetaFieldMapper();
  const mapped = mapper.mapFieldData({
    fieldData: [
      { name: "Which course are you interested in?", values: ["MBA"] },
      { name: "Preferred City", values: ["Delhi"] },
    ],
    mappings: [],
  });

  assert.equal(mapped.customFields.which_course_are_you_interested_in, "MBA");
  assert.equal(mapped.customFields.preferred_city, "Delhi");
  assert.equal(mapped.customFieldLabels.which_course_are_you_interested_in, "Which course are you interested in?");
});

test("Meta mapper honors explicit per-form field mappings", () => {
  const mapper = createMetaFieldMapper();
  const mapped = mapper.mapFieldData({
    fieldData: [{ name: "whatsapp_number", values: ["8888888888"] }],
    mappings: [
      {
        externalFieldKey: "whatsapp_number",
        crmFieldKey: "phone",
        targetType: "STANDARD",
      },
    ],
  });

  assert.equal(mapped.standard.phone, "8888888888");
});

test("Integration service verifies signatures and uses tenant-scoped webhook storage", () => {
  const signatureService = read("apps/integration-service/src/services/meta-signature.service.js");
  const repository = read("apps/integration-service/src/repositories/integration.repository.js");

  assert.match(signatureService, /x-hub-signature-256|timingSafeEqual|createHmac/);
  assert.match(repository, /tenantId,\s*sourceFormId,\s*externalEventId/);
  assert.match(repository, /processingStatus:\s*"PROCESSED"/);
  assert.match(repository, /processingStatus:\s*finalFailure \? "FAILED" : "RETRYING"/);
  assert.match(repository, /claimPendingWebhookEvents/);
  assert.match(repository, /lockedAt:\s*now/);
  assert.match(repository, /processingStatus:\s*"UNMATCHED"/);
});

test("Meta setup flow lists pages, lists lead forms, and subscribes selected pages", () => {
  const metaApiService = read("apps/integration-service/src/services/meta-api.service.js");
  const metaService = read("apps/integration-service/src/services/meta.service.js");
  const metaRoutes = read("apps/integration-service/src/routes/meta.routes.js");

  assert.match(metaApiService, /me\/accounts/);
  assert.match(metaApiService, /me\/adaccounts/);
  assert.match(metaApiService, /\/campaigns/);
  assert.match(metaApiService, /leadgen_forms/);
  assert.match(metaApiService, /subscribed_apps/);
  assert.match(metaApiService, /fetchPageSubscribedApps/);
  assert.match(metaApiService, /subscribed_fields", "leadgen"/);
  assert.match(metaApiService, /config_id/);
  assert.match(metaApiService, /scope/);
  assert.match(metaApiService, /loginConfigId/);
  assert.match(metaService, /sourceType:\s*"META_OAUTH"/);
  assert.match(metaService, /sourceType:\s*"META"/);
  assert.match(metaService, /connectSourceForm/);
  assert.match(metaService, /upsertSourceForm/);
  assert.match(metaRoutes, /\/pages/);
  assert.match(metaRoutes, /\/ad-accounts/);
  assert.match(metaRoutes, /\/ad-accounts\/:adAccountId\/campaigns/);
  assert.match(metaRoutes, /\/overview/);
  assert.match(metaRoutes, /\/pages\/:pageId\/forms/);
  assert.match(metaRoutes, /\/forms\/connect/);
  assert.match(metaRoutes, /\/forms\/connect-bulk/);
  assert.match(metaRoutes, /\/forms\/:id\/activate-webhooks/);
  assert.match(metaRoutes, /\/forms\/:id\/health/);
  assert.match(metaRoutes, /\/forms\/:id\/retry-failed/);
  assert.match(metaRoutes, /\/forms\/:id\/deactivate/);
});

test("Default development and Render startup supervise Meta capture and realtime workers", () => {
  const packageJson = read("package.json");

  assert.match(packageJson, /"dev":\s*"npm run start:render"/);
  assert.match(packageJson, /dev:services/);
  assert.match(packageJson, /start:render/);
  assert.match(packageJson, /--kill-others-on-fail/);
  assert.match(packageJson, /workers\.meta\.js/);
  assert.match(packageJson, /lead-management-service\/src\/workers\.outbox\.js/);
  assert.match(packageJson, /auth-iam-service\/src\/workers\.outbox\.js/);
});

test("Manual Meta fallback validates token access and subscribes before saving", () => {
  const metaService = read("apps/integration-service/src/services/meta.service.js");

  assert.match(metaService, /async function createConnectedAccount/);
  assert.match(metaService, /repository\.upsertConnectedAccount/);
  assert.match(metaService, /async function createSourceForm/);
  assert.match(metaService, /activateMetaAutoCapture/);
  assert.match(metaService, /subscribePageLeadgen/);
  assert.match(metaService, /fetchFormLeads/);
  assert.match(metaService, /repository\.upsertSourceForm/);
});

test("Meta import payload accepts leads without required CRM fields", () => {
  const metaService = createMetaService({});
  const payload = metaService.buildLeadImportPayload({
    sourceForm: {
      externalFormId: "1011150787975533",
      externalPageId: "714830968391464",
      formName: "APP Development form | 24 June",
      autoCreateFields: true,
      fieldMappings: [],
    },
    metaLead: {
      id: "1365855308791509",
      field_data: [
        { name: "phone_number", values: ["<test lead: dummy data for phone_number>"] },
        { name: "email", values: ["not-an-email"] },
        { name: "x".repeat(200), values: ["answer"] },
      ],
      form_id: "1011150787975533",
      adMetadata: {
        campaign: { id: "campaign-1", name: "App Leads" },
        adset: { id: "adset-1", name: "Business Owners" },
      },
    },
  });

  assert.match(payload.fullName, /^Meta Lead /);
  assert.equal("phone" in payload, false);
  assert.equal("email" in payload, false);
  assert.equal(payload.external.rawAnswers.phone_number, "<test lead: dummy data for phone_number>");
  assert.equal(payload.external.externalFormName, "APP Development form | 24 June");
  assert.equal(payload.external.externalCampaignId, "campaign-1");
  assert.equal(payload.external.externalAdSetId, "adset-1");
  assert.ok(Object.values(payload.customFieldLabels).every((label) => label.length <= 160));
});

test("Lead Management exposes only trusted internal import route for integrations", () => {
  const internalRoutes = read("apps/lead-management-service/src/routes/internal.routes.js");
  const leadRoutes = read("apps/lead-management-service/src/routes/lead.routes.js");
  const leadService = read("apps/lead-management-service/src/services/lead.service.js");

  assert.match(internalRoutes, /requireInternalService/);
  assert.match(internalRoutes, /"\/import"/);
  assert.doesNotMatch(leadRoutes, /internal\/import/);
  assert.match(leadService, /importFromIntegration/);
  assert.match(leadService, /ensureIntegrationFields/);
  assert.match(leadService, /enforceRequired:\s*false/);
});

test("Integration lead import bootstraps a default pipeline when tenant config is empty", async () => {
  let ensuredDefault = false;
  let createdLead = null;
  const service = createLeadService({
    leadRepository: {
      findByExternalIdentity: async () => null,
      findDuplicate: async () => null,
      createLead: async (payload) => {
        createdLead = payload.lead;
        return { id: "lead-1", ...payload.lead };
      },
    },
    configRepository: {
      ensureDefaultPipelineAndStatus: async () => {
        ensuredDefault = true;
        return {
          pipeline: { id: "pipeline-1" },
          status: { id: "status-1", pipelineId: "pipeline-1" },
        };
      },
      ensureFields: async () => [],
      findDefaultPipeline: async () => null,
      getAssignmentSettings: async () => ({ roundRobinEnabled: false }),
      ensureSource: async () => ({ id: "source-meta" }),
      listFields: async () => [],
    },
    authorizationService: {},
    userDirectoryService: {},
  });

  const lead = await service.importFromIntegration(
    { tenantId: "tenant-1", user: null },
    {
      fullName: "Meta Lead 123",
      customFields: {},
      external: {
        sourceType: "META",
        externalLeadId: "123",
        externalFormId: "form-1",
        externalFormName: "Website Leads",
        externalCampaignId: "campaign-1",
        externalCampaignName: "App Leads",
        externalAdSetId: "adset-1",
        externalAdSetName: "Business Owners",
      },
    },
  );

  assert.equal(ensuredDefault, true);
  assert.equal(createdLead.pipelineId, "pipeline-1");
  assert.equal(createdLead.statusId, "status-1");
  assert.equal(createdLead.sourceId, "source-meta");
  assert.equal(createdLead.createdBy, null);
  assert.equal(createdLead.externalFormId, "form-1");
  assert.equal(createdLead.externalFormName, "Website Leads");
  assert.equal(createdLead.externalCampaignId, "campaign-1");
  assert.equal(createdLead.externalCampaignName, "App Leads");
  assert.equal(createdLead.externalAdSetId, "adset-1");
  assert.equal(createdLead.externalAdSetName, "Business Owners");
  assert.equal(lead.id, "lead-1");
});

test("Meta webhook receive stores events without blocking on pending processing", async () => {
  let storedEvent = null;
  const service = createMetaService({
    repository: {
      createWebhookEvent: async (payload) => {
        storedEvent = payload;
        return { id: "event-1" };
      },
      findMetaFormByExternalIds: async () => ({ id: "source-form-1", tenantId: "tenant-1" }),
    },
    signatureService: {
      verifySignature: () => undefined,
    },
  });

  const result = await service.receiveWebhook({
    rawBody: Buffer.from("{}"),
    signature: "sha256=test",
    payload: {
      entry: [
        {
          id: "page-1",
          changes: [
            {
              field: "leadgen",
              value: {
                page_id: "page-1",
                form_id: "form-1",
                leadgen_id: "lead-1",
              },
            },
          ],
        },
      ],
    },
  });

  assert.equal(storedEvent.tenantId, "tenant-1");
  assert.equal(storedEvent.sourceFormId, "source-form-1");
  assert.equal(storedEvent.externalLeadId, "lead-1");
  assert.deepEqual(result, {
    received: 1,
    queued: 1,
    stored: 1,
    unmatched: 0,
    ignored: [],
    processingScheduled: false,
  });
});

test("Unmatched Meta form deliveries are persisted for a uniquely connected Page", async () => {
  let unmatchedEvent = null;
  const service = createMetaService({
    repository: {
      findMetaFormByExternalIds: async () => null,
      findMetaPageAccounts: async () => [{ tenantId: "tenant-1" }],
      createWebhookEvent: async (payload) => {
        unmatchedEvent = payload;
        return { id: "unmatched-1" };
      },
    },
    signatureService: { verifySignature: () => undefined },
    logger: { warn: () => undefined },
  });

  const result = await service.receiveWebhook({
    rawBody: Buffer.from("{}"),
    signature: "sha256=test",
    payload: {
      entry: [{ id: "page-1", changes: [{ field: "leadgen", value: { form_id: "unknown-form", leadgen_id: "lead-1" } }] }],
    },
  });

  assert.equal(result.unmatched, 1);
  assert.equal(result.queued, 0);
  assert.equal(unmatchedEvent.processingStatus, "UNMATCHED");
  assert.equal(unmatchedEvent.externalPageId, "page-1");
  assert.equal(unmatchedEvent.externalFormId, "unknown-form");
});

test("Meta OAuth callback accepts a valid signed state when the nonce cookie is missing", async () => {
  assert.ok(config.auth.accessSecret);
  let savedAccount = null;
  const state = jwt.sign(
    {
      type: "meta_oauth_state",
      tenantId: "tenant-1",
      userId: "user-1",
      nonce: "missing-cookie-nonce",
      redirectUri: "https://upstep-crm.onrender.com/integrations/meta/oauth/callback",
      returnPath: "/integrations",
    },
    config.auth.accessSecret,
    { expiresIn: "10m" },
  );
  const service = createMetaService({
    repository: {
      upsertConnectedAccount: async (tenantId, payload) => {
        savedAccount = { tenantId, ...payload };
        return { id: "account-1", ...savedAccount };
      },
    },
    cryptoService: {
      encryptToken: (value) => `encrypted:${value}`,
    },
    metaApiService: {
      exchangeCodeForToken: async () => ({ access_token: "short-token", expires_in: 3600 }),
      extendAccessToken: async () => ({ access_token: "long-token", expires_in: 5184000 }),
      fetchAccountProfile: async () => ({ id: "meta-user-1", name: "Meta User" }),
    },
  });

  const result = await service.completeOAuth({
    code: "oauth-code",
    state,
    stateNonce: undefined,
  });

  assert.equal(result.account.id, "account-1");
  assert.equal(result.returnPath, "/integrations");
  assert.equal(savedAccount.tenantId, "tenant-1");
  assert.equal(savedAccount.sourceType, "META_OAUTH");
  assert.equal(savedAccount.accessTokenEncrypted, "encrypted:long-token");
});

test("OAuth form connection stores ad-account and campaign snapshots without capture filtering", async () => {
  let savedPageAccount = null;
  let savedAssets = null;
  const tokenExpiresAt = new Date(Date.now() + 60_000);
  const service = createMetaService({
    authorizationService: { assertPermission: async () => undefined },
    cryptoService: {
      decryptToken: () => "oauth-token",
      encryptToken: (value) => `encrypted:${value}`,
    },
    metaApiService: {
      fetchPages: async () => [{ id: "page-1", name: "Royal IT", access_token: "page-token" }],
      fetchPageLeadForms: async () => [{ id: "form-1", name: "Website leads", status: "ACTIVE" }],
      fetchAdAccounts: async () => [{ id: "act_1", account_id: "1", name: "Royal IT Ads" }],
      fetchCampaigns: async () => [
        { id: "campaign-1", name: "July Leads", status: "ACTIVE", effective_status: "ACTIVE" },
        { id: "campaign-2", name: "Other Campaign", status: "ACTIVE", effective_status: "ACTIVE" },
      ],
      subscribePageLeadgen: async () => ({ success: true }),
      fetchFormLeads: async () => [],
    },
    repository: {
      findConnectedAccountById: async () => ({
        id: "oauth-account-1",
        tenantId: "tenant-1",
        sourceType: "META_OAUTH",
        accessTokenEncrypted: "encrypted-oauth-token",
        tokenExpiresAt,
      }),
      findMetaFormByExternalFormId: async () => null,
      upsertConnectedAccount: async (_tenantId, payload) => {
        savedPageAccount = payload;
        return { id: "page-account-1", tenantId: "tenant-1", ...payload };
      },
      upsertSourceForm: async (_tenantId, payload) => ({ id: "source-form-1", tenantId: "tenant-1", ...payload }),
      upsertMetaAssetConnection: async (_tenantId, _sourceFormId, payload) => {
        savedAssets = payload;
        return payload;
      },
      attachUnmatchedWebhookEvents: async () => ({ count: 0 }),
      findSourceFormById: async () => ({
        id: "source-form-1",
        tenantId: "tenant-1",
        sourceType: "META",
        connectedAccountId: "page-account-1",
        externalFormId: "form-1",
        externalPageId: "page-1",
        formName: "Website leads",
        autoCreateFields: true,
        isActive: true,
        fieldMappings: [],
      }),
    },
  });

  await service.connectSourceForm(
    { tenantId: "tenant-1", user: { id: "user-1" } },
    {
      connectedAccountId: "oauth-account-1",
      adAccountId: "act_1",
      campaignIds: ["campaign-1"],
      pageId: "page-1",
      formId: "form-1",
    },
  );

  assert.equal(savedPageAccount.tokenExpiresAt, tokenExpiresAt);
  assert.equal(savedAssets.adAccountId, "act_1");
  assert.deepEqual(savedAssets.campaigns.map((campaign) => campaign.id), ["campaign-1"]);
});

test("Bulk Meta form connection subscribes once and verifies every selected form", async () => {
  let subscribeCalls = 0;
  const verifiedFormIds = [];
  let persisted = null;
  const service = createMetaService({
    authorizationService: { assertPermission: async () => undefined },
    cryptoService: {
      decryptToken: () => "oauth-token",
      encryptToken: (value) => `encrypted:${value}`,
    },
    metaApiService: {
      fetchPages: async () => [{ id: "page-1", name: "Royal IT", access_token: "page-token" }],
      fetchPageLeadForms: async () => [
        { id: "form-1", name: "Travel leads", status: "ACTIVE" },
        { id: "form-2", name: "Website leads", status: "ACTIVE" },
      ],
      subscribePageLeadgen: async () => {
        subscribeCalls += 1;
      },
      fetchFormLeads: async ({ formId }) => {
        verifiedFormIds.push(formId);
        return [];
      },
    },
    repository: {
      findConnectedAccountById: async () => ({
        id: "oauth-account-1",
        tenantId: "tenant-1",
        sourceType: "META_OAUTH",
        accessTokenEncrypted: "encrypted-oauth-token",
        tokenExpiresAt: null,
      }),
      findMetaFormsByExternalFormIds: async () => [],
      connectMetaSourceForms: async (payload) => {
        persisted = payload;
        return payload.forms.map((form, index) => ({
          id: `source-form-${index + 1}`,
          tenantId: payload.tenantId,
          sourceType: "META",
          connectedAccountId: "page-account-1",
          externalFormId: form.id,
          externalPageId: payload.page.id,
          formName: form.name,
          autoCreateFields: true,
          isActive: true,
          fieldMappings: [],
        }));
      },
    },
  });

  const result = await service.connectSourceForms(
    { tenantId: "tenant-1", user: { id: "user-1" } },
    {
      connectedAccountId: "oauth-account-1",
      pageId: "page-1",
      formIds: ["form-1", "form-2"],
    },
  );

  assert.equal(subscribeCalls, 1);
  assert.deepEqual(verifiedFormIds, ["form-1", "form-2"]);
  assert.deepEqual(persisted.forms.map((form) => form.id), ["form-1", "form-2"]);
  assert.equal(result.length, 2);
});

test("Page Lead Form options identify forms already connected to the tenant", async () => {
  const service = createMetaService({
    authorizationService: { assertPermission: async () => undefined },
    cryptoService: { decryptToken: () => "oauth-token" },
    metaApiService: {
      fetchPages: async () => [{ id: "page-1", name: "Royal IT", access_token: "page-token" }],
      fetchPageLeadForms: async () => [
        { id: "form-1", name: "Connected form", status: "ACTIVE" },
        { id: "form-2", name: "Available form", status: "ACTIVE" },
      ],
    },
    repository: {
      findConnectedAccountById: async () => ({
        id: "oauth-account-1",
        tenantId: "tenant-1",
        sourceType: "META_OAUTH",
        accessTokenEncrypted: "encrypted-token",
      }),
      listSourceFormsByPage: async () => [{
        id: "source-form-1",
        externalFormId: "form-1",
        isActive: true,
        createdAt: new Date("2026-07-16T10:00:00.000Z"),
      }],
    },
  });

  const forms = await service.listPageForms(
    { tenantId: "tenant-1", user: { id: "user-1" } },
    "page-1",
    { connectedAccountId: "oauth-account-1" },
  );

  assert.equal(forms[0].isConnected, true);
  assert.equal(forms[0].sourceFormId, "source-form-1");
  assert.equal(forms[1].isConnected, false);
  assert.equal(forms[1].sourceFormId, null);
});

test("Reconnecting active Meta forms skips duplicate subscription and lead-read checks", async () => {
  let subscribeCalls = 0;
  let leadReadCalls = 0;
  const service = createMetaService({
    authorizationService: { assertPermission: async () => undefined },
    cryptoService: {
      decryptToken: () => "oauth-token",
      encryptToken: (value) => `encrypted:${value}`,
    },
    metaApiService: {
      fetchPages: async () => [{ id: "page-1", name: "Royal IT", access_token: "page-token" }],
      fetchPageLeadForms: async () => [{ id: "form-1", name: "Connected form", status: "ACTIVE" }],
      subscribePageLeadgen: async () => {
        subscribeCalls += 1;
      },
      fetchFormLeads: async () => {
        leadReadCalls += 1;
        return [];
      },
    },
    repository: {
      findConnectedAccountById: async () => ({
        id: "oauth-account-1",
        tenantId: "tenant-1",
        sourceType: "META_OAUTH",
        accessTokenEncrypted: "encrypted-token",
      }),
      findMetaFormsByExternalFormIds: async () => [{
        id: "source-form-1",
        tenantId: "tenant-1",
        externalFormId: "form-1",
        externalPageId: "page-1",
      }],
      connectMetaSourceForms: async (payload) => payload.forms.map((form) => ({
        id: "source-form-1",
        tenantId: payload.tenantId,
        sourceType: "META",
        connectedAccountId: "page-account-1",
        externalFormId: form.id,
        externalPageId: payload.page.id,
        formName: form.name,
        isActive: true,
        autoCreateFields: true,
        fieldMappings: [],
      })),
    },
  });

  const forms = await service.connectSourceForms(
    { tenantId: "tenant-1", user: { id: "user-1" } },
    { connectedAccountId: "oauth-account-1", pageId: "page-1", formIds: ["form-1"] },
  );

  assert.equal(forms.length, 1);
  assert.equal(subscribeCalls, 0);
  assert.equal(leadReadCalls, 0);
});

test("Bulk Meta form validation rejects duplicate form IDs", () => {
  const result = MetaValidators.connectForms.safeParse({
    body: {
      connectedAccountId: "11111111-1111-4111-8111-111111111111",
      pageId: "page-1",
      formIds: ["form-1", "form-1"],
    },
    params: {},
    query: {},
  });

  assert.equal(result.success, false);
});

test("Bulk Meta form repository persists selected forms and unmatched recovery atomically", async () => {
  const sourceUpserts = [];
  const assetUpserts = [];
  const recoveredForms = [];
  let transactionOptions;
  const repository = createIntegrationRepository({
    $transaction: async (callback, options) => {
      transactionOptions = options;
      return callback({
        connectedAccount: {
          upsert: async () => ({ id: "page-account-1" }),
        },
        sourceForm: {
          upsert: async ({ create }) => {
            sourceUpserts.push(create.externalFormId);
            return { id: `source-${create.externalFormId}` };
          },
          findMany: async () => [
            { id: "source-form-1", externalFormId: "form-1" },
            { id: "source-form-2", externalFormId: "form-2" },
          ],
        },
        metaAssetConnection: {
          upsert: async ({ create }) => {
            assetUpserts.push(create.sourceFormId);
          },
        },
        webhookEvent: {
          updateMany: async ({ where }) => {
            recoveredForms.push(where.externalFormId);
          },
        },
      });
    },
  });

  const result = await repository.connectMetaSourceForms({
    tenantId: "tenant-1",
    pageAccount: { accessTokenEncrypted: "encrypted-page-token", tokenExpiresAt: null },
    oauthConnectedAccountId: "oauth-account-1",
    page: { id: "page-1", name: "Royal IT" },
    adAccount: null,
    campaigns: [],
    forms: [
      { id: "form-1", name: "Travel leads" },
      { id: "form-2", name: "Website leads" },
    ],
    lastVerifiedAt: new Date(),
  });

  assert.deepEqual(sourceUpserts, ["form-1", "form-2"]);
  assert.deepEqual(assetUpserts, ["source-form-1", "source-form-2"]);
  assert.deepEqual(recoveredForms, ["form-1", "form-2"]);
  assert.deepEqual(transactionOptions, { maxWait: 10_000, timeout: 30_000 });
  assert.equal(result.length, 2);
});

test("Connected Meta account responses never expose encrypted token columns", async () => {
  const service = createMetaService({
    authorizationService: { assertPermission: async () => undefined },
    repository: {
      listConnectedAccounts: async (_tenantId, sourceType) =>
        sourceType === "META_OAUTH"
          ? [
              {
                id: "account-1",
                tenantId: "tenant-1",
                sourceType,
                accountName: "Royal IT",
                externalAccountId: "meta-user-1",
                accessTokenEncrypted: "secret-ciphertext",
                refreshTokenEncrypted: "refresh-ciphertext",
                status: "ACTIVE",
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]
          : [],
    },
  });

  const accounts = await service.listConnectedAccounts({ tenantId: "tenant-1", user: { id: "user-1" } });

  assert.equal(accounts.length, 1);
  assert.equal("accessTokenEncrypted" in accounts[0], false);
  assert.equal("refreshTokenEncrypted" in accounts[0], false);
});

test("Manual Meta form setup subscribes the page and verifies lead retrieval before saving", async () => {
  let subscribedPageId = null;
  let verifiedFormId = null;
  let savedForm = null;
  const service = createMetaService({
    authorizationService: {
      assertPermission: async () => undefined,
    },
    cryptoService: {
      decryptToken: () => "page-token",
    },
    metaApiService: {
      subscribePageLeadgen: async ({ pageId }) => {
        subscribedPageId = pageId;
      },
      fetchFormLeads: async ({ formId }) => {
        verifiedFormId = formId;
        return [];
      },
    },
    repository: {
      findConnectedAccountById: async () => ({
        id: "account-1",
        accessTokenEncrypted: "encrypted-token",
      }),
      upsertSourceForm: async (_tenantId, payload) => {
        savedForm = payload;
        return { id: "source-form-1", ...payload };
      },
      findSourceFormById: async () => ({ id: "source-form-1", ...savedForm }),
    },
  });

  await service.createSourceForm(
    { tenantId: "tenant-1", user: { id: "user-1" } },
    {
      connectedAccountId: "11111111-1111-4111-8111-111111111111",
      externalPageId: "page-1",
      externalFormId: "form-1",
      formName: "Website leads",
      autoCreateFields: true,
    },
  );

  assert.equal(subscribedPageId, "page-1");
  assert.equal(verifiedFormId, "form-1");
  assert.equal(savedForm.externalFormId, "form-1");
});

test("Blocked Meta lead access fails setup with an actionable error", async () => {
  const service = createMetaService({
    authorizationService: {
      assertPermission: async () => undefined,
    },
    cryptoService: {
      decryptToken: () => "blocked-token",
    },
    metaApiService: {
      subscribePageLeadgen: async () => undefined,
      fetchFormLeads: async () => {
        throw {
          code: "META_FORM_LEADS_FETCH_FAILED",
          details: {
            error: {
              message: "API access blocked.",
              type: "OAuthException",
              code: 200,
            },
          },
        };
      },
    },
    repository: {
      findConnectedAccountById: async () => ({
        id: "account-1",
        accessTokenEncrypted: "encrypted-token",
      }),
      upsertSourceForm: async () => {
        throw new Error("should not save blocked form");
      },
    },
  });

  await assert.rejects(
    () =>
      service.createSourceForm(
        { tenantId: "tenant-1", user: { id: "user-1" } },
        {
          connectedAccountId: "11111111-1111-4111-8111-111111111111",
          externalPageId: "page-1",
          externalFormId: "form-1",
          formName: "Website leads",
        },
      ),
    (error) => error.code === "META_LEAD_ACCESS_BLOCKED",
  );
});

test("Meta form health reports when token works but no webhook has arrived", async () => {
  const service = createMetaService({
    authorizationService: {
      assertPermission: async () => undefined,
    },
    cryptoService: {
      decryptToken: () => "page-token",
    },
    metaApiService: {
      fetchFormLeads: async () => [],
      fetchPageSubscribedApps: async () => [{ id: config.meta.appId, subscribed_fields: ["leadgen"] }],
    },
    repository: {
      findSourceFormById: async () => ({
        id: "form-config-1",
        externalFormId: "form-1",
        externalPageId: "page-1",
        connectedAccount: {
          accessTokenEncrypted: "encrypted-token",
        },
      }),
      findLatestWebhookEvent: async () => null,
      findLatestPageWebhookEvent: async () => null,
      findLatestSyncLog: async () => null,
      findLatestSuccessfulSyncLog: async () => null,
      countWebhookStatuses: async () => ({}),
      countUnmatchedPageWebhookEvents: async () => 0,
      findWorkerHeartbeat: async () => ({
        instanceId: "worker-1",
        status: "RUNNING",
        lastSeenAt: new Date(),
        lastBatchJson: { processed: 0 },
      }),
    },
  });

  const health = await service.getSourceFormHealth({ tenantId: "tenant-1", user: { id: "user-1" } }, "form-config-1");

  assert.equal(health.status, "WAITING_FOR_FIRST_LEAD");
  assert.equal(health.tokenLeadRead.status, "OK");
  assert.equal(health.pageSubscription.status, "ACTIVE");
});

test("Meta form health rejects a leadgen subscription owned by another app", async () => {
  const service = createMetaService({
    authorizationService: { assertPermission: async () => undefined },
    cryptoService: { decryptToken: () => "page-token" },
    metaApiService: {
      fetchFormLeads: async () => [],
      fetchPageSubscribedApps: async () => [{ id: "different-app", subscribed_fields: ["leadgen"] }],
    },
    repository: {
      findSourceFormById: async () => ({
        id: "form-config-1",
        externalFormId: "form-1",
        externalPageId: "page-1",
        connectedAccount: { accessTokenEncrypted: "encrypted-token", tokenExpiresAt: null },
      }),
      findLatestWebhookEvent: async () => null,
      findLatestPageWebhookEvent: async () => null,
      findLatestSyncLog: async () => null,
      findLatestSuccessfulSyncLog: async () => null,
      countWebhookStatuses: async () => ({}),
      countUnmatchedPageWebhookEvents: async () => 0,
      findWorkerHeartbeat: async () => ({ instanceId: "worker-1", status: "RUNNING", lastSeenAt: new Date() }),
    },
  });

  const health = await service.getSourceFormHealth({ tenantId: "tenant-1", user: { id: "user-1" } }, "form-config-1");

  assert.equal(health.pageSubscription.status, "NOT_SUBSCRIBED");
  assert.equal(health.status, "WEBHOOK_NOT_SUBSCRIBED");
});

test("Meta overview uses persisted health and ignores failures older than the latest success", async () => {
  const successfulAt = new Date("2026-07-16T10:00:00.000Z");
  const failedAt = new Date("2026-07-16T09:00:00.000Z");
  const service = createMetaService({
    authorizationService: { assertPermission: async () => undefined },
    metaApiService: new Proxy({}, {
      get() {
        throw new Error("overview must not call Meta Graph");
      },
    }),
    repository: {
      listConnectedAccounts: async () => [],
      listSourceForms: async () => [{
        id: "source-form-1",
        tenantId: "tenant-1",
        sourceType: "META",
        connectedAccountId: "page-account-1",
        externalFormId: "form-1",
        externalPageId: "page-1",
        formName: "Travel leads",
        autoCreateFields: true,
        isActive: true,
        createdAt: new Date("2026-07-15T10:00:00.000Z"),
        connectedAccount: { tokenExpiresAt: null },
        fieldMappings: [],
        metaAssetConnection: {
          captureStatus: "CONNECTED",
          lastSuccessfulLeadAt: successfulAt,
          consecutiveFailures: 0,
          campaignsJson: [],
        },
      }],
      findWorkerHeartbeat: async () => null,
      findLatestWebhookEvent: async () => ({ createdAt: successfulAt, processingStatus: "PROCESSED" }),
      findLatestPageWebhookEvent: async () => ({ createdAt: successfulAt, processingStatus: "PROCESSED" }),
      findLatestSyncLog: async () => ({ status: "FAILED", message: "old failure", createdAt: failedAt }),
      findLatestSuccessfulSyncLog: async () => ({ status: "SUCCESS", crmLeadId: "lead-1", createdAt: successfulAt }),
      countWebhookStatuses: async () => ({ FAILED: 2, PROCESSED: 4 }),
      countUnmatchedPageWebhookEvents: async () => 0,
    },
  });

  const overview = await service.getOverview({ tenantId: "tenant-1", user: { id: "user-1" } });

  assert.equal(overview.healthByFormId["source-form-1"].status, "HEALTHY");
  assert.equal(overview.healthByFormId["source-form-1"].recentFailure, null);
  assert.equal(overview.healthByFormId["source-form-1"].eventCounts.failed, 2);
});

test("Meta reconciliation checks a shared Page once and verifies every connected form", async () => {
  let pageChecks = 0;
  let formChecks = 0;
  const healthUpdates = [];
  const sharedAccount = { accessTokenEncrypted: "encrypted-page-token" };
  const forms = ["form-1", "form-2"].map((externalFormId, index) => ({
    id: `source-form-${index + 1}`,
    tenantId: "tenant-1",
    connectedAccountId: "page-account-1",
    externalPageId: "page-1",
    externalFormId,
    connectedAccount: sharedAccount,
    metaAssetConnection: { captureStatus: "CONNECTED" },
  }));
  const service = createMetaService({
    cryptoService: { decryptToken: () => "page-token" },
    metaApiService: {
      fetchPageSubscribedApps: async () => {
        pageChecks += 1;
        return [{ id: config.meta.appId, subscribed_fields: ["leadgen"] }];
      },
      fetchFormLeads: async () => {
        formChecks += 1;
        return [];
      },
    },
    repository: {
      listActiveMetaFormsForReconciliation: async () => forms,
      updateMetaAssetHealth: async (...args) => healthUpdates.push(args),
    },
  });

  const result = await service.reconcileActiveConnections();

  assert.deepEqual(result, { checked: 2, connected: 2, actionRequired: 0 });
  assert.equal(pageChecks, 1);
  assert.equal(formChecks, 2);
  assert.equal(healthUpdates.length, 2);
  assert.ok(healthUpdates.every(([, , payload]) => payload.captureStatus === "CONNECTED"));
});

test("Meta reconciliation keeps transient Graph failures out of the primary action-required state", async () => {
  let healthPayload = null;
  const service = createMetaService({
    cryptoService: { decryptToken: () => "page-token" },
    metaApiService: {
      fetchPageSubscribedApps: async () => {
        throw new Error("Graph request timeout");
      },
      fetchFormLeads: async () => [],
    },
    repository: {
      listActiveMetaFormsForReconciliation: async () => [{
        id: "source-form-1",
        tenantId: "tenant-1",
        connectedAccountId: "page-account-1",
        externalPageId: "page-1",
        externalFormId: "form-1",
        connectedAccount: { accessTokenEncrypted: "encrypted-page-token" },
        metaAssetConnection: { captureStatus: "CONNECTED" },
      }],
      updateMetaAssetHealth: async (_tenantId, _sourceFormId, payload) => {
        healthPayload = payload;
      },
    },
  });

  const result = await service.reconcileActiveConnections();

  assert.deepEqual(result, { checked: 1, connected: 0, actionRequired: 0 });
  assert.equal(healthPayload.captureStatus, "CONNECTED");
  assert.equal(healthPayload.lastErrorMessage, "Graph request timeout");
});

test("Meta worker claims events and schedules retry after a transient Graph failure", async () => {
  let claimPayload = null;
  let failedPayload = null;
  const service = createMetaService({
    repository: {
      claimPendingWebhookEvents: async (payload) => {
        claimPayload = payload;
        return [
          {
            id: "event-1",
            tenantId: "tenant-1",
            externalLeadId: "lead-1",
            retryCount: 0,
            sourceForm: {
              id: "form-1",
              externalFormId: "external-form-1",
              externalPageId: "page-1",
              autoCreateFields: true,
              fieldMappings: [],
              connectedAccount: { accessTokenEncrypted: "encrypted-page-token" },
            },
          },
        ];
      },
      markWebhookFailed: async (payload) => {
        failedPayload = payload;
      },
    },
    cryptoService: { decryptToken: () => "page-token" },
    metaApiService: {
      fetchLeadDetails: async () => {
        throw Object.assign(new Error("Meta temporarily unavailable"), { code: "META_LEAD_FETCH_FAILED" });
      },
    },
  });

  const summary = await service.processPendingEvents({ limit: 7, workerId: "worker-7" });

  assert.deepEqual(claimPayload, { limit: 7, workerId: "worker-7" });
  assert.equal(summary.failed, 1);
  assert.equal(failedPayload.error.code, "META_LEAD_FETCH_FAILED");
  assert.ok(failedPayload.nextAttemptAt instanceof Date);
  assert.ok(failedPayload.nextAttemptAt.getTime() > Date.now());
});

test("Meta worker processes claimed events with bounded concurrency", async () => {
  let activeRequests = 0;
  let maxActiveRequests = 0;
  let processed = 0;
  const events = Array.from({ length: 5 }, (_, index) => ({
    id: `event-${index}`,
    tenantId: "tenant-1",
    externalLeadId: `lead-${index}`,
    retryCount: 0,
    sourceForm: {
      id: "form-1",
      externalFormId: "external-form-1",
      externalPageId: "page-1",
      autoCreateFields: true,
      fieldMappings: [],
      connectedAccount: { accessTokenEncrypted: "encrypted-page-token" },
    },
  }));
  const service = createMetaService({
    repository: {
      claimPendingWebhookEvents: async () => events,
      markWebhookProcessed: async () => {
        processed += 1;
      },
      markWebhookFailed: async () => undefined,
    },
    cryptoService: { decryptToken: () => "page-token" },
    metaApiService: {
      fetchLeadDetails: async ({ leadgenId }) => {
        activeRequests += 1;
        maxActiveRequests = Math.max(maxActiveRequests, activeRequests);
        await new Promise((resolve) => setTimeout(resolve, 5));
        activeRequests -= 1;
        return { id: leadgenId, field_data: [] };
      },
    },
    leadImportClient: { importLead: async () => ({ data: { id: "crm-lead" } }) },
  });

  const summary = await service.processPendingEvents({ limit: 5, workerId: "worker-1", concurrency: 2 });

  assert.equal(summary.synced, 5);
  assert.equal(processed, 5);
  assert.equal(maxActiveRequests, 2);
});

test("Meta permission failures stop futile retries and mark the connection actionable", async () => {
  let failedPayload = null;
  const service = createMetaService({
    repository: {
      claimPendingWebhookEvents: async () => [{
        id: "event-1",
        tenantId: "tenant-1",
        externalLeadId: "lead-1",
        retryCount: 0,
        sourceForm: {
          id: "form-1",
          externalFormId: "external-form-1",
          externalPageId: "page-1",
          autoCreateFields: true,
          fieldMappings: [],
          connectedAccount: { accessTokenEncrypted: "encrypted-page-token" },
        },
      }],
      markWebhookFailed: async (payload) => {
        failedPayload = payload;
      },
    },
    cryptoService: { decryptToken: () => "page-token" },
    metaApiService: {
      fetchLeadDetails: async () => {
        throw Object.assign(new Error("Requires leads_retrieval permission"), {
          code: "META_LEAD_FETCH_FAILED",
          statusCode: 400,
          details: { error: { code: 200, message: "Requires leads_retrieval permission" } },
        });
      },
    },
  });

  await service.processPendingEvents({ workerId: "worker-1" });

  assert.equal(failedPayload.retryable, false);
  assert.equal(failedPayload.actionRequired, true);
  assert.equal(failedPayload.nextAttemptAt, null);
});

test("Integration imports return an existing lead for the same external Meta identity", async () => {
  let createCalled = false;
  const existingLead = { id: "lead-existing", externalSourceType: "META", externalLeadId: "external-1" };
  const service = createLeadService({
    leadRepository: {
      findByExternalIdentity: async () => existingLead,
      createLead: async () => {
        createCalled = true;
      },
    },
    configRepository: {},
    authorizationService: {},
    userDirectoryService: {},
  });

  const result = await service.importFromIntegration(
    { tenantId: "tenant-1", user: null },
    { fullName: "Repeated lead", external: { sourceType: "META", externalLeadId: "external-1" } },
  );

  assert.equal(result.id, "lead-existing");
  assert.equal(createCalled, false);
});

test("Meta worker loop processes pending events repeatedly", async () => {
  const limits = [];
  const heartbeats = [];
  let disconnected = false;

  await runMetaWorkerLoop({
    intervalMs: 0,
    iterations: 2,
    limit: 7,
    logger: {
      info: () => undefined,
      error: () => undefined,
    },
    wakeListenerFactory: () => ({
      connect: async () => undefined,
      interrupt: () => undefined,
      wait: async () => "signal",
      close: async () => undefined,
    }),
    workerFactory: () => ({
      prisma: {
        $disconnect: async () => {
          disconnected = true;
        },
      },
      metaService: {
        processPendingEvents: async ({ limit }) => {
          limits.push(limit);
          return { processed: 0, synced: 0, failed: 0 };
        },
        recordWorkerHeartbeat: async (payload) => {
          heartbeats.push(payload);
        },
      },
    }),
  });

  assert.deepEqual(limits, [7, 7]);
  assert.equal(heartbeats.filter((heartbeat) => heartbeat.status !== "STOPPED").length, 2);
  assert.equal(heartbeats.at(-1).status, "STOPPED");
  assert.equal(disconnected, true);
});

test("Lead permission checks ignore service-generated non-UUID owners", async () => {
  let checkedResource = null;
  const service = createLeadService({
    leadRepository: {
      findById: async () => ({
        id: "lead-1",
        assignedTo: null,
        assignedTeamId: null,
        createdBy: "integration-service",
      }),
    },
    configRepository: {},
    authorizationService: {
      assertPermission: async ({ resource }) => {
        checkedResource = resource;
      },
    },
    userDirectoryService: {},
  });

  await service.getById({ tenantId: "tenant-1", user: { id: "22222222-2222-4222-8222-222222222222" } }, "lead-1");

  assert.deepEqual(checkedResource, { ownerId: null, teamId: null });
});

test("Missing assignment settings enable round robin by default", async () => {
  const repository = createLeadConfigRepository({
    leadAssignmentSetting: {
      findUnique: async () => null,
    },
  });

  const settings = await repository.getAssignmentSettings("tenant-1");

  assert.equal(settings.roundRobinEnabled, true);
  assert.deepEqual(settings.roundRobinUserIds, []);
});

test("Integration imports auto-assign to the least-loaded active user", async () => {
  let createdLead = null;
  let countedUserIds = null;
  const service = createLeadService({
    leadRepository: {
      findByExternalIdentity: async () => null,
      countActiveByAssignees: async (_tenantId, userIds) => {
        countedUserIds = userIds;
        return new Map([
          ["11111111-1111-4111-8111-111111111111", 3],
          ["22222222-2222-4222-8222-222222222222", 0],
        ]);
      },
      findDuplicate: async () => null,
      createLead: async (payload) => {
        createdLead = payload.lead;
        return { id: "lead-1", ...payload.lead };
      },
    },
    configRepository: {
      ensureDefaultPipelineAndStatus: async () => ({
        pipeline: { id: "pipeline-1" },
        status: { id: "status-1", pipelineId: "pipeline-1" },
      }),
      ensureFields: async () => [],
      ensureSource: async () => ({ id: "source-meta" }),
      getAssignmentSettings: async () => ({ roundRobinEnabled: true, roundRobinUserIds: [] }),
      listFields: async () => [],
    },
    authorizationService: {},
    userDirectoryService: {
      listUsers: async () => [
        { id: "11111111-1111-4111-8111-111111111111", email: "a@example.com", status: "ACTIVE" },
        { id: "22222222-2222-4222-8222-222222222222", email: "b@example.com", status: "ACTIVE" },
        { id: "33333333-3333-4333-8333-333333333333", email: "c@example.com", status: "INACTIVE" },
      ],
    },
  });

  await service.importFromIntegration(
    { tenantId: "tenant-1", user: { id: "integration-service", system: true } },
    {
      fullName: "Meta Lead 123",
      customFields: {},
      external: { sourceType: "META", externalLeadId: "123" },
    },
  );

  assert.deepEqual(countedUserIds, ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"]);
  assert.equal(createdLead.assignedTo, "22222222-2222-4222-8222-222222222222");
  assert.equal(createdLead.createdBy, null);
});

test("Integration imports never assign the internal service user when round robin is disabled", async () => {
  let createdLead = null;
  const service = createLeadService({
    leadRepository: {
      findByExternalIdentity: async () => null,
      findDuplicate: async () => null,
      createLead: async (payload) => {
        createdLead = payload.lead;
        return { id: "lead-1", ...payload.lead };
      },
    },
    configRepository: {
      ensureDefaultPipelineAndStatus: async () => ({
        pipeline: { id: "pipeline-1" },
        status: { id: "status-1", pipelineId: "pipeline-1" },
      }),
      ensureFields: async () => [],
      ensureSource: async () => ({ id: "source-meta" }),
      getAssignmentSettings: async () => ({ roundRobinEnabled: false, roundRobinUserIds: [] }),
      listFields: async () => [],
    },
    authorizationService: {},
    userDirectoryService: {
      listUsers: async () => {
        throw new Error("should not list users when disabled");
      },
    },
  });

  await service.importFromIntegration(
    { tenantId: "tenant-1", user: { id: "integration-service", system: true } },
    {
      fullName: "Meta Lead 123",
      customFields: {},
      external: { sourceType: "META", externalLeadId: "123" },
    },
  );

  assert.equal(createdLead.assignedTo, null);
});

test("Default pipeline bootstrap creates the standard sales statuses", async () => {
  const statuses = [];
  const repository = createLeadConfigRepository({
    $transaction: async (callback) =>
      callback({
        leadPipeline: {
          findFirst: async () => ({ id: "pipeline-1", name: "Default Sales Pipeline" }),
        },
        leadStatus: {
          findFirst: async ({ where }) => {
            if (where.isInitial) {
              return statuses.find((status) => status.isInitial) || null;
            }
            if (where.code) {
              return statuses.find((status) => status.code === where.code) || null;
            }
            return null;
          },
          upsert: async ({ create, update, where }) => {
            const existing = statuses.find((status) => status.code === where.tenantId_pipelineId_code.code);
            if (existing) {
              Object.assign(existing, update);
              return existing;
            }
            const status = { id: `status-${create.code}`, ...create };
            statuses.push(status);
            return status;
          },
        },
      }),
  });

  const result = await repository.ensureDefaultPipelineAndStatus("tenant-1");
  const codes = statuses.map((status) => status.code);

  assert.deepEqual(codes, ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"]);
  assert.equal(result.status.code, "NEW");
  assert.equal(statuses.find((status) => status.code === "WON").finalType, "WON");
  assert.equal(statuses.find((status) => status.code === "LOST").finalType, "LOST");
});

test("Default pipeline status list refreshes standard statuses before returning options", async () => {
  let ensuredDefaultStatuses = false;
  const service = createLeadConfigService({
    authorizationService: {
      assertPermission: async () => undefined,
      checkPermission: async ({ permission }) => ({ allowed: permission === "lead.lead.read.own" }),
    },
    configRepository: {
      ensureDefaultPipelineAndStatus: async () => {
        ensuredDefaultStatuses = true;
      },
      ensurePipelineStatuses: async () => {
        ensuredDefaultStatuses = true;
      },
      findPipelineById: async () => ({ id: "pipeline-1", isDefault: true }),
      listStatuses: async () => [{ id: "status-1", code: "NEW" }],
    },
  });

  const statuses = await service.listStatuses({ tenantId: "tenant-1", user: { id: "user-1" } }, "pipeline-1");

  assert.equal(ensuredDefaultStatuses, true);
  assert.deepEqual(statuses, [{ id: "status-1", code: "NEW" }]);
});
