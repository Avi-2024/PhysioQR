import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { DEFAULT_OWNER_PERMISSIONS } from "../packages/contracts/src/permissions.js";
import { PrismaClient } from "../apps/auth-iam-service/generated/prisma/index.js";

dotenv.config();
dotenv.config({ path: ".env.example", override: false });

const prisma = new PrismaClient();

const accountEmail = process.env.AUTH_ACCOUNT_EMAIL || process.argv[2] || "crm@gmail.com";
const accountPassword = process.env.AUTH_ACCOUNT_PASSWORD || process.argv[3] || "12345678";
const accountName = process.env.AUTH_ACCOUNT_NAME || "CRM Admin";
const tenantSlug = process.env.AUTH_ACCOUNT_TENANT_SLUG || process.env.BOOTSTRAP_TENANT_SLUG || "royal-it";
const tenantName = process.env.AUTH_ACCOUNT_TENANT_NAME || process.env.BOOTSTRAP_TENANT_NAME || "Royal IT";

// Normalizes emails before unique tenant-scoped lookup.
function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

// Ensures the tenant, owner role, permission catalog, and login user exist.
async function ensureAuthAccount() {
  const passwordHash = await bcrypt.hash(accountPassword, 12);
  const email = normalizeEmail(accountEmail);

  return prisma.$transaction(
    async (tx) => {
      const tenant = await tx.tenant.upsert({
        where: { slug: tenantSlug },
        update: { name: tenantName },
        create: { name: tenantName, slug: tenantSlug },
      });

      await tx.permission.createMany({
        data: DEFAULT_OWNER_PERMISSIONS.map((permissionKey) => ({
          key: permissionKey,
          description: permissionKey,
          isActive: true,
        })),
        skipDuplicates: true,
      });

      await tx.permission.updateMany({
        where: {
          key: { in: DEFAULT_OWNER_PERMISSIONS },
          isActive: false,
        },
        data: { isActive: true },
      });

      const existingOwnerRole = await tx.role.findFirst({
        where: { tenantId: tenant.id, code: "OWNER" },
      });

      const ownerRole = existingOwnerRole
        ? await tx.role.update({
            where: { id: existingOwnerRole.id },
            data: {
              name: "Owner",
              description: "Tenant owner with all default permissions",
              isSystemRole: true,
              isActive: true,
            },
          })
        : await tx.role.create({
            data: {
              tenantId: tenant.id,
              name: "Owner",
              code: "OWNER",
              description: "Tenant owner with all default permissions",
              isSystemRole: true,
            },
          });

      const permissions = await tx.permission.findMany({
        where: { key: { in: DEFAULT_OWNER_PERMISSIONS } },
        select: { id: true },
      });

      await tx.rolePermission.createMany({
        data: permissions.map((permission) => ({
          tenantId: tenant.id,
          roleId: ownerRole.id,
          permissionId: permission.id,
        })),
        skipDuplicates: true,
      });

      const existingUser = await tx.user.findFirst({
        where: {
          tenantId: tenant.id,
          email,
        },
      });

      const user = existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: {
              name: accountName,
              passwordHash,
              status: "ACTIVE",
              deletedAt: null,
              tokenVersion: { increment: 1 },
            },
          })
        : await tx.user.create({
            data: {
              tenantId: tenant.id,
              name: accountName,
              email,
              passwordHash,
            },
          });

      await tx.userRole.createMany({
        data: [
          {
            tenantId: tenant.id,
            userId: user.id,
            roleId: ownerRole.id,
          },
        ],
        skipDuplicates: true,
      });

      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          actorUserId: user.id,
          action: existingUser ? "user.seed_password_reset" : "user.seed_created",
          resourceType: "user",
          resourceId: user.id,
          metadata: { email: user.email, roleCode: ownerRole.code },
        },
      });

      return {
        created: !existingUser,
        tenantSlug: tenant.slug,
        email: user.email,
        roleCode: ownerRole.code,
      };
    },
    { maxWait: 10000, timeout: 30000 },
  );
}

try {
  const result = await ensureAuthAccount();
  console.log(
    JSON.stringify(
      {
        status: "ok",
        created: result.created,
        tenantSlug: result.tenantSlug,
        email: result.email,
        roleCode: result.roleCode,
      },
      null,
      2,
    ),
  );
} finally {
  await prisma.$disconnect();
}
