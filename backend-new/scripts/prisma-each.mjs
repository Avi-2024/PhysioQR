import { spawnSync } from "node:child_process";
import dotenv from "dotenv";

const schemas = [
  "apps/auth-iam-service/prisma/schema.prisma",
  "apps/lead-management-service/prisma/schema.prisma",
  "apps/integration-service/prisma/schema.prisma",
];

const actions = {
  validate: ["validate"],
  generate: ["generate"],
  push: ["db", "push", "--skip-generate"],
};

dotenv.config();
dotenv.config({ path: ".env.example", override: false });

// Builds a cross-platform Prisma command invocation.
function prismaInvocation(actionArgs, schema) {
  if (process.platform === "win32") {
    return {
      command: "cmd.exe",
      args: ["/c", "npx", "prisma", ...actionArgs, "--schema", schema],
    };
  }

  return {
    command: "npx",
    args: ["prisma", ...actionArgs, "--schema", schema],
  };
}

// Runs Prisma for every service schema.
function runPrismaForSchemas(action) {
  const actionArgs = actions[action];
  for (const schema of schemas) {
    const invocation = prismaInvocation(actionArgs, schema);
    const result = spawnSync(invocation.command, invocation.args, {
      stdio: "inherit",
      shell: false,
      env: process.env,
    });

    if (result.status !== 0) {
      process.exit(result.status || 1);
    }
  }
}

const requestedActions = process.argv.slice(2);
if (requestedActions.length === 0 || requestedActions.some((action) => !actions[action])) {
  console.error("Usage: node scripts/prisma-each.mjs <validate|generate|push> [...more actions]");
  process.exit(1);
}

for (const action of requestedActions) {
  runPrismaForSchemas(action);
}
