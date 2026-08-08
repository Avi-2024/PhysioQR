import test from "node:test";
import assert from "node:assert/strict";
import { ensureDevelopmentBootstrapUser } from "../apps/auth-iam-service/src/bootstrap.js";

test("creates a bootstrap owner user when none exists", async () => {
  const created = [];
  const prisma = {
    user: {
      findFirst: async () => null,
    },
  };
  const logger = {
    info: () => {},
    error: () => {},
  };
  const authRepository = {
    createTenantOwner: async ({ tenant, user, passwordHash }) => {
      created.push({ tenant, user, passwordHash });
      return { tenant: { id: "tenant-1" }, user: { id: "user-1" } };
    },
  };

  process.env.NODE_ENV = "development";

  await ensureDevelopmentBootstrapUser({
    prisma,
    authRepository,
    logger,
    email: "royalit@gmail.com",
    password: "12345678",
    tenantName: "Royal IT",
    tenantSlug: "royal-it",
  });

  assert.equal(created.length, 1);
  assert.equal(created[0].tenant.slug, "royal-it");
  assert.equal(created[0].user.email, "royalit@gmail.com");
  assert.match(created[0].passwordHash, /\$2[aby]\$/);
});

test("skips bootstrap when a matching user already exists", async () => {
  const created = [];
  const prisma = {
    user: {
      findFirst: async () => ({ id: "existing-user" }),
    },
  };
  const logger = {
    info: () => {},
    error: () => {},
  };
  const authRepository = {
    createTenantOwner: async () => {
      created.push("called");
    },
  };

  process.env.NODE_ENV = "development";

  await ensureDevelopmentBootstrapUser({
    prisma,
    authRepository,
    logger,
    email: "royalit@gmail.com",
    password: "12345678",
    tenantName: "Royal IT",
    tenantSlug: "royal-it",
  });

  assert.deepEqual(created, []);
});

test("uses idempotent bootstrap owner helper when tenant slug may already exist", async () => {
  const calls = [];
  const prisma = {
    user: {
      findFirst: async () => null,
    },
  };
  const logger = {
    info: () => {},
    error: () => {},
  };
  const authRepository = {
    ensureBootstrapTenantOwner: async ({ tenant, user, passwordHash }) => {
      calls.push({ helper: "ensure", tenant, user, passwordHash });
      return { tenant: { id: "tenant-1" }, user: { id: "user-1" } };
    },
    createTenantOwner: async () => {
      calls.push({ helper: "create" });
    },
  };

  process.env.NODE_ENV = "development";

  await ensureDevelopmentBootstrapUser({
    prisma,
    authRepository,
    logger,
    email: "royalit@gmail.com",
    password: "12345678",
    tenantName: "Royal IT",
    tenantSlug: "royal-it",
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].helper, "ensure");
  assert.equal(calls[0].tenant.slug, "royal-it");
  assert.match(calls[0].passwordHash, /\$2[aby]\$/);
});
