import assert from "node:assert/strict";
import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import test from "node:test";
import { config } from "../packages/config/src/index.js";
import { validateRequest } from "../packages/common/src/index.js";
import { createLeadRoutes } from "../apps/lead-management-service/src/routes/lead.routes.js";
import { LeadValidators } from "../apps/lead-management-service/src/validators/lead.validators.js";

const validLeadId = "a72fe807-9e7a-4d81-a67b-2df5c1b86020";

// Builds a valid access token for route middleware tests.
function authHeader() {
  const token = jwt.sign(
    {
      email: "test@example.com",
      sessionId: "test-session",
      tenantId: "11111111-1111-4111-8111-111111111111",
      tokenVersion: 1,
    },
    config.auth.accessSecret,
    { subject: "22222222-2222-4222-8222-222222222222" },
  );
  return `Bearer ${token}`;
}

// Creates a small validation-only app for lead detail route regressions.
function createValidationApp() {
  const app = express();
  app.use(express.json());
  app.get("/leads/:id", validateRequest(LeadValidators.byId), (req, res) => {
    res.status(200).json({ data: { id: req.validated.params.id } });
  });
  app.get("/leads/:id/followups", validateRequest(LeadValidators.byId), (req, res) => {
    res.status(200).json({ data: [], leadId: req.validated.params.id });
  });
  app.use((error, _req, res, _next) => {
    res.status(error.statusCode || 500).json({ error: { code: error.code, details: error.details } });
  });
  return app;
}

// Creates a lead router app with controller stubs for real route validation.
function createLeadRouteApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.context = { tenantId: "tenant-id", user: { id: "user-id" } };
    next();
  });
  app.use(
    "/leads",
    createLeadRoutes({
      leadController: {
        assign: (_req, res) => res.status(200).json({ data: {} }),
        bulkAssign: (_req, res) => res.status(200).json({ data: {} }),
        changeStatus: (_req, res) => res.status(200).json({ data: {} }),
        create: (_req, res) => res.status(201).json({ data: {} }),
        createFollowup: (_req, res) => res.status(201).json({ data: {} }),
        getById: (req, res) => res.status(200).json({ data: { id: req.validated.params.id } }),
        list: (_req, res) => res.status(200).json({ data: [] }),
        listFollowups: (req, res) => res.status(200).json({ data: [], leadId: req.validated.params.id }),
        listTimeline: (_req, res) => res.status(200).json({ data: [] }),
        remove: (_req, res) => res.status(200).json({ data: {} }),
        update: (_req, res) => res.status(200).json({ data: {} }),
      },
      meetingController: {
        create: (_req, res) => res.status(201).json({ data: {} }),
      },
    }),
  );
  app.use((error, _req, res, _next) => {
    res.status(error.statusCode || 500).json({ error: { code: error.code, details: error.details } });
  });
  return app;
}

test("lead detail GET validates params without requiring a request body", async () => {
  const response = await request(createValidationApp()).get(`/leads/${validLeadId}`).expect(200);

  assert.equal(response.body.data.id, validLeadId);
});

test("lead follow-up GET validates params without requiring a request body", async () => {
  const response = await request(createValidationApp()).get(`/leads/${validLeadId}/followups`).expect(200);

  assert.deepEqual(response.body.data, []);
  assert.equal(response.body.leadId, validLeadId);
});

test("lead detail GET tolerates a null runtime body", async () => {
  const result = LeadValidators.byId.safeParse({
    body: null,
    params: { id: validLeadId },
    query: {},
  });

  assert.equal(result.success, true);
});

test("lead follow-up accepts an optional pipeline status UUID", async () => {
  const result = LeadValidators.createFollowup.safeParse({
    body: {
      followupType: "CALL",
      note: "Qualified during the call.",
      statusId: "33333333-3333-4333-8333-333333333333",
    },
    params: { id: validLeadId },
    query: {},
  });

  assert.equal(result.success, true);
});

test("internal lead import drops malformed provider email without rejecting the lead", async () => {
  const result = LeadValidators.importLead.safeParse({
    body: {
      fullName: "Meta Lead",
      email: "not an email",
      external: {
        sourceType: "META",
        externalLeadId: "lead-1",
      },
    },
    params: {},
    query: {},
  });

  assert.equal(result.success, true);
  assert.equal(result.data.body.email, undefined);
});

test("lead detail GET still rejects invalid UUID params", async () => {
  const response = await request(createValidationApp()).get("/leads/not-a-uuid").expect(400);

  assert.equal(response.body.error.code, "VALIDATION_FAILED");
  assert.match(response.body.error.details.fieldErrors.params[0], /Invalid uuid/);
});

test("real lead routes validate detail and follow-up GETs without body validation", async () => {
  const app = createLeadRouteApp();

  const detail = await request(app).get(`/leads/${validLeadId}`).set("Authorization", authHeader()).expect(200);
  const followups = await request(app).get(`/leads/${validLeadId}/followups`).set("Authorization", authHeader()).expect(200);

  assert.equal(detail.body.data.id, validLeadId);
  assert.equal(followups.body.leadId, validLeadId);
});
