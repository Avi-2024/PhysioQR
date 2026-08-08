import assert from "node:assert/strict";
import test from "node:test";
import { createQuotationDocumentStorage } from "../apps/lead-management-service/src/services/quotation-document.storage.js";
import { processQuotationDocumentBatch } from "../apps/lead-management-service/src/services/quotation-document-worker.service.js";
import { sanitizeQuotationHtml } from "../apps/lead-management-service/src/services/quotation-content.service.js";
import { buildQuotationDocumentHtml } from "../apps/lead-management-service/src/services/quotation-pdf.service.js";
import { createQuotationService } from "../apps/lead-management-service/src/services/quotation.service.js";

const context = {
  tenantId: "11111111-1111-4111-8111-111111111111",
  user: { id: "22222222-2222-4222-8222-222222222222" },
};
const lead = {
  id: "33333333-3333-4333-8333-333333333333",
  fullName: "Example Client",
  assignedTo: context.user.id,
  assignedTeamId: null,
  createdBy: context.user.id,
};

// Creates a complete persisted quotation fixture for service tests.
function quotationFixture(overrides = {}) {
  return {
    id: "44444444-4444-4444-8444-444444444444",
    tenantId: context.tenantId,
    leadId: lead.id,
    quoteNumber: "QT-2026-00001",
    leadNameSnapshot: lead.fullName,
    lead,
    title: "CRM implementation",
    contentHtml: "<p>Implementation scope</p>",
    status: "DRAFT",
    revisionNumber: 1,
    documentStatus: "NOT_GENERATED",
    documentError: null,
    quoteDate: new Date("2026-07-13T00:00:00.000Z"),
    expiryDate: new Date("2026-07-28T00:00:00.000Z"),
    sentAt: null,
    createdBy: context.user.id,
    createdAt: new Date("2026-07-13T10:00:00.000Z"),
    updatedAt: new Date("2026-07-13T10:00:00.000Z"),
    revisions: [],
    ...overrides,
  };
}

// Creates quotation service dependencies with overridable test doubles.
function quotationDependencies(overrides = {}) {
  return {
    quotationRepository: {
      findById: async () => quotationFixture(),
      ...(overrides.quotationRepository || {}),
    },
    leadService: overrides.leadService || { getById: async () => lead },
    authorizationService: overrides.authorizationService || {
      checkPermission: async () => ({ allowed: true, teamIds: [] }),
      assertPermission: async () => ({ allowed: true, teamIds: [] }),
    },
    documentStorage: overrides.documentStorage || { enabled: true, createDownloadUrl: async () => ({ url: "signed", expiresAt: "later" }) },
  };
}

test("Quotation HTML sanitizer removes executable markup and unsafe attributes", () => {
  const sanitized = sanitizeQuotationHtml('<h2 onclick="alert(1)">Safe</h2><script>alert(1)</script><a href="javascript:alert(1)">link</a>');
  assert.equal(sanitized.includes("script"), false);
  assert.equal(sanitized.includes("onclick"), false);
  assert.equal(sanitized.includes("javascript:"), false);
  assert.match(sanitized, /<h2>Safe<\/h2>/);
});

test("Quotation creation requires a linked writable lead and sanitizes persisted content", async () => {
  let persisted = null;
  let assertedPermission = null;
  const service = createQuotationService(quotationDependencies({
    quotationRepository: {
      createQuotation: async (input) => {
        persisted = input;
        return quotationFixture({ contentHtml: input.payload.contentHtml });
      },
    },
    authorizationService: {
      checkPermission: async () => ({ allowed: true, teamIds: [] }),
      assertPermission: async (input) => { assertedPermission = input.permission; return { allowed: true }; },
    },
  }));

  const result = await service.create(context, {
    leadId: lead.id,
    title: "CRM implementation",
    contentHtml: '<p onmouseover="bad()">Implementation scope</p>',
    date: "2026-07-13",
    expiryDate: "2026-07-28",
  });

  assert.equal(assertedPermission, "lead.lead.update.own");
  assert.equal(persisted.payload.leadId, lead.id);
  assert.equal(persisted.payload.contentHtml, "<p>Implementation scope</p>");
  assert.equal(result.leadId, lead.id);
});

test("Sent quotations reject direct edits and require a revision", async () => {
  const service = createQuotationService(quotationDependencies({
    quotationRepository: {
      findById: async () => quotationFixture({ status: "SENT", sentAt: new Date() }),
      updateQuotation: async () => assert.fail("locked quotation must not update"),
    },
  }));
  await assert.rejects(
    () => service.update(context, "44444444-4444-4444-8444-444444444444", { title: "Changed" }),
    (error) => error.code === "QUOTATION_REVISION_LOCKED",
  );
});

test("Mark sent returns the frozen revision and queues document generation", async () => {
  let marked = false;
  const sentAt = new Date("2026-07-13T11:00:00.000Z");
  const service = createQuotationService(quotationDependencies({
    quotationRepository: {
      findById: async () => quotationFixture(),
      markSent: async () => {
        marked = true;
        return quotationFixture({
          status: "SENT",
          sentAt,
          documentStatus: "PENDING",
          revisions: [{
            id: "55555555-5555-4555-8555-555555555555",
            revisionNumber: 1,
            title: "CRM implementation",
            status: "SENT",
            quoteDate: new Date("2026-07-13T00:00:00.000Z"),
            expiryDate: new Date("2026-07-28T00:00:00.000Z"),
            sentAt,
            documentStatus: "PENDING",
            documentError: null,
            pdfGeneratedAt: null,
            createdAt: sentAt,
          }],
        });
      },
    },
  }));

  const result = await service.markSent(context, "44444444-4444-4444-8444-444444444444");
  assert.equal(marked, true);
  assert.equal(result.status, "SENT");
  assert.equal(result.documentStatus, "PENDING");
  assert.equal(result.revisions[0].revisionNumber, 1);
});

test("Approved quotations cannot create another revision", async () => {
  const service = createQuotationService(quotationDependencies({
    quotationRepository: {
      findById: async () => quotationFixture({ status: "APPROVED", sentAt: new Date() }),
      createRevision: async () => assert.fail("approved quotation must remain locked"),
    },
  }));
  await assert.rejects(
    () => service.createRevision(context, "44444444-4444-4444-8444-444444444444"),
    (error) => error.code === "QUOTATION_APPROVED_LOCKED",
  );
});

test("Quotation PDF worker uploads and completes a claimed immutable revision", async () => {
  let completed = null;
  const revision = {
    id: "revision-1",
    tenantId: context.tenantId,
    quotationId: "quotation-1",
    revisionNumber: 1,
    attemptCount: 1,
    quotation: quotationFixture(),
  };
  const summary = await processQuotationDocumentBatch({
    quotationRepository: {
      claimDocumentJobs: async () => [revision],
      completeDocumentJob: async (input) => { completed = input; },
      failDocumentJob: async () => assert.fail("successful PDF must not fail"),
    },
    storage: {
      enabled: true,
      uploadPdf: async () => ({ objectKey: "tenant/key.pdf", etag: "etag", sha256: "hash", size: 3, generatedAt: new Date() }),
    },
    renderer: { render: async () => Buffer.from("pdf") },
    logger: { error: () => undefined },
  });
  assert.equal(summary.ready, 1);
  assert.equal(completed.revision.id, revision.id);
  assert.equal(completed.document.objectKey, "tenant/key.pdf");
});

test("Quotation PDF worker persists failure for retry instead of losing the job", async () => {
  let failed = null;
  const revision = {
    id: "revision-1",
    tenantId: context.tenantId,
    quotationId: "quotation-1",
    revisionNumber: 1,
    attemptCount: 1,
    quotation: quotationFixture(),
  };
  const summary = await processQuotationDocumentBatch({
    quotationRepository: {
      claimDocumentJobs: async () => [revision],
      completeDocumentJob: async () => assert.fail("failed PDF must not complete"),
      failDocumentJob: async (input) => { failed = input; },
    },
    storage: { enabled: true, uploadPdf: async () => assert.fail("render failed first") },
    renderer: { render: async () => { throw Object.assign(new Error("browser failed"), { code: "BROWSER_FAILED" }); } },
    logger: { error: () => undefined },
  });
  assert.equal(summary.failed, 1);
  assert.equal(failed.revision.id, revision.id);
  assert.match(failed.errorMessage, /BROWSER_FAILED/);
});

test("S3 storage uses deterministic tenant revision keys and returns durable metadata", async () => {
  let command = null;
  const storage = createQuotationDocumentStorage({
    region: "ap-south-1",
    bucket: "private-quotes",
    client: { send: async (input) => { command = input; return { ETag: '"etag-value"' }; } },
  });
  const result = await storage.uploadPdf({
    tenantId: context.tenantId,
    quotationId: "quotation-1",
    revisionNumber: 2,
    pdfBuffer: Buffer.from("pdf"),
  });
  assert.equal(command.input.Bucket, "private-quotes");
  assert.equal(command.input.Key, `tenants/${context.tenantId}/quotations/quotation-1/revisions/2/quotation.pdf`);
  assert.equal(result.objectKey, command.input.Key);
  assert.equal(result.etag, "etag-value");
});

test("Server PDF template escapes metadata while retaining sanitized revision content", () => {
  const html = buildQuotationDocumentHtml({
    quotation: quotationFixture({ quoteNumber: '<script id="number">' }),
    revision: {
      revisionNumber: 1,
      title: "<Unsafe>",
      contentHtml: "<p>Safe body</p>",
      quoteDate: new Date("2026-07-13T00:00:00.000Z"),
      expiryDate: new Date("2026-07-28T00:00:00.000Z"),
    },
  });
  assert.equal(html.includes('<script id="number">'), false);
  assert.match(html, /&lt;Unsafe&gt;/);
  assert.match(html, /<p>Safe body<\/p>/);
});
