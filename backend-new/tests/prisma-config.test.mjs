import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "apps/auth-iam-service/prisma/schema.prisma");
const schema = fs.readFileSync(schemaPath, "utf8");

test("auth IAM Prisma schema uses PostgreSQL provider with unified database URL and auth_iam schema", () => {
  assert.match(schema, /provider\s*=\s*"postgresql"/);
  assert.match(schema, /url\s*=\s*env\("SOLOCRM_DATABASE_URL"\)/);
  assert.match(schema, /schemas\s*=\s*\["auth_iam"\]/);
});
