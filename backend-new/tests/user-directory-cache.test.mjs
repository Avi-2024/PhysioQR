import assert from "node:assert/strict";
import test from "node:test";
import { createUserDirectoryService } from "../apps/lead-management-service/src/services/user-directory.service.js";

test("user directory listUsers caches active users per tenant", async (t) => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          data: [
            {
              email: "staff@example.com",
              id: "11111111-1111-4111-8111-111111111111",
              name: "Staff User",
              roleIds: [],
              roles: [],
              status: "ACTIVE",
              teamIds: [],
              teams: [],
            },
          ],
          pagination: { total: 1 },
        };
      },
    };
  };

  const service = createUserDirectoryService();
  const context = {
    rawAuthorization: "Bearer test",
    requestId: "req-1",
    tenantId: "tenant-a",
    user: { id: "11111111-1111-4111-8111-111111111111" },
  };

  const first = await service.listUsers(context);
  const second = await service.listUsers(context);
  await service.listUsers({ ...context, tenantId: "tenant-b" });

  assert.equal(calls.length, 2);
  assert.equal(first[0].name, "Staff User");
  assert.deepEqual(second, first);
  assert.match(calls[0], /status=ACTIVE/);
});
