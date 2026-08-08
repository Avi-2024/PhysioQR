import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { PERMISSIONS } from "../packages/contracts/src/permissions.js";
import { PrismaClient } from "../apps/auth-iam-service/generated/prisma/index.js";

dotenv.config();
dotenv.config({ path: ".env.example", override: false });

const prisma = new PrismaClient();
const args = process.argv.slice(2);

let password = "12345678";
let emails = args;

if (args.length === 0) {
  console.error("Usage: node scripts/create-auth-accounts.mjs [password] email1 email2 ...");
  process.exit(1);
}

if (!args[0].includes("@")) {
  password = args[0];
  emails = args.slice(1);
}

if (emails.length === 0) {
  console.error("Please provide at least one email address.");
  process.exit(1);
}

const tenantSlug = process.env.AUTH_ACCOUNT_TENANT_SLUG || process.env.BOOTSTRAP_TENANT_SLUG || "royal-it";
const tenantName = process.env.AUTH_ACCOUNT_TENANT_NAME || process.env.BOOTSTRAP_TENANT_NAME || "Royal IT";

const employeePermissions = [
  PERMISSIONS.AUTH_USER_READ,
  PERMISSIONS.LEAD_CREATE_OWN,
  PERMISSIONS.LEAD_READ_OWN,
  PERMISSIONS.LEAD_UPDATE_OWN,
  PERMISSIONS.LEAD_STATUS_CHANGE_OWN,
  PERMISSIONS.LEAD_FOLLOWUP_CREATE_OWN,
  PERMISSIONS.LEAD_MEETING_CREATE_OWN,
  PERMISSIONS.LEAD_MEETING_READ_OWN,
  PERMISSIONS.LEAD_MEETING_UPDATE_OWN,
];

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

function nameFromEmail(email) {
  const local = normalizeEmail(email).split("@")[0];
  return local
    .split(/[._-]/g)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

async function createAuthAccounts() {
  const passwordHash = await bcrypt.hash(password, 12);

  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    update: { name: tenantName },
    create: { name: tenantName, slug: tenantSlug },
  });

  const employeeRole = await prisma.role.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: "EMPLOYEE" } },
    update: { name: "Employee", description: "Sales employee with assigned lead access", isActive: true },
    create: {
      tenantId: tenant.id,
      name: "Employee",
      code: "EMPLOYEE",
      description: "Sales employee with assigned lead access",
    },
  });

  await prisma.permission.createMany({
    data: employeePermissions.map((permissionKey) => ({
      key: permissionKey,
      description: permissionKey,
      isActive: true,
    })),
    skipDuplicates: true,
  });

  const employeePermissionRecords = await prisma.permission.findMany({
    where: { key: { in: employeePermissions } },
    select: { id: true },
  });

  await prisma.rolePermission.deleteMany({
    where: { tenantId: tenant.id, roleId: employeeRole.id },
  });

  await prisma.rolePermission.createMany({
    data: employeePermissionRecords.map((permission) => ({
      tenantId: tenant.id,
      roleId: employeeRole.id,
      permissionId: permission.id,
    })),
    skipDuplicates: true,
  });

  const ownerRole = await prisma.role.findFirst({
    where: { tenantId: tenant.id, code: "OWNER" },
  });

  const results = [];

  for (const rawEmail of emails) {
    const email = normalizeEmail(rawEmail);
    const name = nameFromEmail(email);

    const existingUser = await prisma.user.findFirst({
      where: { tenantId: tenant.id, email },
    });

    const user = existingUser
      ? await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name,
            passwordHash,
            status: "ACTIVE",
            deletedAt: null,
            tokenVersion: { increment: 1 },
          },
        })
      : await prisma.user.create({
          data: {
            tenantId: tenant.id,
            name,
            email,
            passwordHash,
            status: "ACTIVE",
          },
        });

    if (ownerRole) {
      await prisma.userRole.deleteMany({
        where: { tenantId: tenant.id, userId: user.id, roleId: ownerRole.id },
      });
    }

    await prisma.userRole.createMany({
      data: [
        {
          tenantId: tenant.id,
          userId: user.id,
          roleId: employeeRole.id,
        },
      ],
      skipDuplicates: true,
    });

    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorUserId: user.id,
        action: existingUser ? "user.seed_password_reset" : "user.seed_created",
        resourceType: "user",
        resourceId: user.id,
        metadata: { email: user.email, roleCode: employeeRole.code },
      },
    });

    results.push({
      email: user.email,
      created: !existingUser,
      roleCode: employeeRole.code,
    });
  }

  return { tenantSlug: tenant.slug, results };
}

try {
  const output = await createAuthAccounts();
  console.log(JSON.stringify({ status: "ok", tenantSlug: output.tenantSlug, users: output.results }, null, 2));
} finally {
  await prisma.$disconnect();
}
