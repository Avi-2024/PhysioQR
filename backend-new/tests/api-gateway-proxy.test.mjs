import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import test from "node:test";
import request from "supertest";
import { createApiGatewayApp } from "../apps/api-gateway/src/app.js";

// Starts a short-lived downstream auth service for gateway proxy tests.
async function startAuthStub() {
  const app = express();
  app.use(express.json());
  app.post("/auth/login", (req, res) => {
    assert.equal(req.headers["x-strip-me"], undefined);
    assert.equal(req.headers.expect, undefined);
    assert.equal(req.headers.upgrade, undefined);
    assert.equal(req.body.email, "crm@gmail.com");
    res.cookie("upstep_refresh_token", "stub-refresh", { httpOnly: true }).status(200).json({
      data: {
        accessToken: "stub-access",
        user: {
          email: req.body.email,
          tenantSlug: req.body.tenantSlug,
        },
      },
    });
  });

  const server = app.listen(0);
  await once(server, "listening");
  return server;
}

test("API Gateway proxies auth login without forwarding hop-by-hop headers", async () => {
  const authServer = await startAuthStub();

  try {
    const { port } = authServer.address();
    const app = createApiGatewayApp({
      serviceUrls: {
        authIam: `http://127.0.0.1:${port}`,
      },
    });

    const response = await request(app)
      .post("/auth/login")
      .set("connection", "keep-alive, x-strip-me")
      .set("expect", "100-continue")
      .set("upgrade", "websocket")
      .set("x-strip-me", "should-not-forward")
      .send({
        tenantSlug: "royal-it",
        email: "crm@gmail.com",
        password: "12345678",
      })
      .expect(200);

    assert.equal(response.body.data.user.email, "crm@gmail.com");
    assert.match(response.headers["set-cookie"][0], /HttpOnly/);
  } finally {
    authServer.close();
  }
});

test("API Gateway forwards downstream OAuth redirects without following them", async () => {
  const integrationApp = express();
  integrationApp.get("/integrations/meta/oauth/callback", (_req, res) => {
    res.redirect(302, "http://localhost:5173/integrations?meta=connected");
  });

  const integrationServer = integrationApp.listen(0);
  await once(integrationServer, "listening");

  try {
    const { port } = integrationServer.address();
    const app = createApiGatewayApp({
      serviceUrls: {
        integration: `http://127.0.0.1:${port}`,
      },
    });

    const response = await request(app).get("/integrations/meta/oauth/callback?code=abc&state=xyz").expect(302);
    assert.equal(response.headers.location, "http://localhost:5173/integrations?meta=connected");
  } finally {
    integrationServer.close();
  }
});

test("API Gateway preserves raw webhook bodies for downstream signature checks", async () => {
  const rawPayload = '{"entry":[{"id":"page-1","changes":[{"field":"leadgen","value":{"leadgen_id":"lead-1"}}]}]}';
  const integrationApp = express();
  integrationApp.use(express.raw({ type: "application/json" }));
  integrationApp.post("/webhooks/meta", (req, res) => {
    assert.equal(req.headers["x-hub-signature-256"], "sha256=test-signature");
    assert.equal(req.body.toString("utf8"), rawPayload);
    res.status(200).json({ data: { ok: true } });
  });

  const integrationServer = integrationApp.listen(0);
  await once(integrationServer, "listening");

  try {
    const { port } = integrationServer.address();
    const app = createApiGatewayApp({
      serviceUrls: {
        integration: `http://127.0.0.1:${port}`,
      },
    });

    await request(app)
      .post("/webhooks/meta")
      .set("content-type", "application/json")
      .set("x-hub-signature-256", "sha256=test-signature")
      .send(rawPayload)
      .expect(200);
  } finally {
    integrationServer.close();
  }
});

test("API Gateway proxies quotation lifecycle requests to Lead Management", async () => {
  const leadApp = express();
  leadApp.use(express.json());
  leadApp.post("/quotations", (req, res) => {
    assert.equal(req.body.leadId, "33333333-3333-4333-8333-333333333333");
    res.status(201).json({ data: { id: "quotation-1", status: "DRAFT" } });
  });
  const leadServer = leadApp.listen(0);
  await once(leadServer, "listening");
  try {
    const { port } = leadServer.address();
    const app = createApiGatewayApp({ serviceUrls: { leadManagement: `http://127.0.0.1:${port}` } });
    const response = await request(app)
      .post("/quotations")
      .send({ leadId: "33333333-3333-4333-8333-333333333333" })
      .expect(201);
    assert.equal(response.body.data.status, "DRAFT");
  } finally {
    leadServer.close();
  }
});
