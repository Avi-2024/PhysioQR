import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { createApiGatewayApp } from "../apps/api-gateway/src/app.js";

// Temporarily applies environment values for one async test.
async function withEnv(values, callback) {
  const previous = {};
  for (const key of Object.keys(values)) {
    previous[key] = process.env[key];
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }

  try {
    return await callback();
  } finally {
    for (const key of Object.keys(values)) {
      if (previous[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[key];
      }
    }
  }
}

test("API Gateway exposes public branding by domain", async () => {
  await withEnv(
    {
      PUBLIC_BRANDING_TENANT_SLUG: "royal-it",
      PUBLIC_BRANDING_APP_NAME: "Royal IT CRM",
    },
    async () => {
      const app = createApiGatewayApp();
      const response = await request(app).get("/public/branding?domain=demo.localhost").expect(200);

      assert.equal(response.body.data.tenantSlug, "royal-it");
      assert.equal(response.body.data.appName, "Royal IT CRM");
      assert.equal(response.body.data.logoUrl, "/brand/default-logo.png");
      assert.equal(response.body.data.faviconUrl, "/brand/default-favicon.svg");
    },
  );
});

test("API Gateway fallback branding uses Royal IT CRM", async () => {
  await withEnv(
    {
      PUBLIC_BRANDING_APP_NAME: undefined,
      BOOTSTRAP_TENANT_NAME: undefined,
    },
    async () => {
      const app = createApiGatewayApp();
      const response = await request(app).get("/public/branding?domain=unknown.example").expect(200);

      assert.equal(response.body.data.appName, "Royal IT CRM");
    },
  );
});
