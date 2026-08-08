import { DEFAULT_OWNER_PERMISSIONS } from "../../../../packages/contracts/src/permissions.js";

// Creates persistence methods for auth sessions and user lookup.
function createAuthRepository(prisma) {
  // Finds a user by email globally.
  async function findUserByEmail(email) {
    return prisma.user.findFirst({
      where: {
        email: String(email).toLowerCase(),
        deletedAt: null,
      },
    });
  }

  // Finds an active user by ID.
  async function findUserById(userId) {
    return prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
    });
  }

  // Finds active permission keys assigned to one user.
  async function getUserPermissionKeys(userId) {
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    const permissions = new Set();
    for (const userRole of userRoles) {
      if (!userRole.role?.isActive) continue;
      for (const rolePermission of userRole.role.rolePermissions) {
        if (rolePermission.permission.isActive) {
          permissions.add(rolePermission.permission.key);
        }
      }
    }

    return {
      permissions: [...permissions].sort(),
      roleIds: userRoles.map((item) => item.roleId),
    };
  }

  // Ensures the bootstrap admin user exists idempotently.
  async function ensureBootstrapUser({ user, passwordHash }) {
    return prisma.$transaction(
      async (tx) => {
        const normalizedEmail = String(user.email).toLowerCase();

        let bootstrapUser = await tx.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (!bootstrapUser) {
          bootstrapUser = await tx.user.create({
            data: {
              name: user.name,
              email: normalizedEmail,
              phone: user.phone || null,
              passwordHash,
            },
          });
        } else if (bootstrapUser.deletedAt || bootstrapUser.status !== "ACTIVE") {
          bootstrapUser = await tx.user.update({
            where: { id: bootstrapUser.id },
            data: {
              name: user.name,
              passwordHash,
              status: "ACTIVE",
              deletedAt: null,
            },
          });
        }

        const ownerRole = await tx.role.upsert({
          where: { code: "OWNER" },
          create: {
            name: "Owner",
            code: "OWNER",
            description: "Company owner with all default permissions",
            isSystemRole: true,
          },
          update: {
            isActive: true,
            isSystemRole: true,
          },
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

        const permissions = await tx.permission.findMany({
          where: { key: { in: DEFAULT_OWNER_PERMISSIONS } },
          select: { id: true },
        });

        await tx.rolePermission.createMany({
          data: permissions.map((permission) => ({
            roleId: ownerRole.id,
            permissionId: permission.id,
          })),
          skipDuplicates: true,
        });

        const existingUserRole = await tx.userRole.findFirst({
          where: {
            userId: bootstrapUser.id,
            roleId: ownerRole.id,
            teamId: null,
          },
        });

        if (!existingUserRole) {
          await tx.userRole.create({
            data: {
              userId: bootstrapUser.id,
              roleId: ownerRole.id,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            actorUserId: bootstrapUser.id,
            action: "user.bootstrap",
            resourceType: "user",
            resourceId: bootstrapUser.id,
            metadata: { email: bootstrapUser.email },
          },
        });

        return { user: bootstrapUser };
      },
      { maxWait: 10000, timeout: 30000 },
    );
  }

  // Creates a login session and stores the current refresh token hash.
  async function createSession({ userId, refreshTokenHash, tokenFamilyId, tokenVersion, expiresAt, ipAddress, userAgent }) {
    return prisma.session.create({
      data: {
        userId,
        refreshTokenHash,
        tokenFamilyId,
        tokenVersion,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });
  }

  // Finds an active session by refresh token hash.
  async function findActiveSessionByRefreshHash(refreshTokenHash) {
    return prisma.session.findFirst({
      where: {
        refreshTokenHash,
        status: "ACTIVE",
        expiresAt: { gt: new Date() },
      },
    });
  }

  // Rotates a refresh token and revokes the previous session atomically.
  async function rotateSession({ currentSessionId, userId, refreshTokenHash, tokenFamilyId, tokenVersion, expiresAt, ipAddress, userAgent }) {
    return prisma.$transaction(async (tx) => {
      await tx.session.update({
        where: { id: currentSessionId },
        data: {
          status: "REVOKED",
          revokedAt: new Date(),
        },
      });

      return tx.session.create({
        data: {
          userId,
          refreshTokenHash,
          tokenFamilyId,
          tokenVersion,
          expiresAt,
          ipAddress,
          userAgent,
        },
      });
    });
  }

  // Revokes one active session for logout.
  async function revokeSession(sessionId) {
    return prisma.session.update({
      where: { id: sessionId },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
      },
    });
  }

  // Revokes a token family when refresh token replay is detected.
  async function revokeTokenFamily(tokenFamilyId) {
    return prisma.session.updateMany({
      where: {
        tokenFamilyId,
        status: "ACTIVE",
      },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
      },
    });
  }

  // Marks successful login time for a user.
  async function markLogin(userId) {
    return prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  return Object.freeze({
    createSession,
    ensureBootstrapUser,
    findActiveSessionByRefreshHash,
    findUserByEmail,
    findUserById,
    getUserPermissionKeys,
    markLogin,
    revokeSession,
    revokeTokenFamily,
    rotateSession,
  });
}

export { createAuthRepository };
