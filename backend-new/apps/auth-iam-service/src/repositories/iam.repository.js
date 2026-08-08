// Creates persistence methods for users, roles, permissions, and authorization.
function createIamRepository(prisma) {
  // Builds the safe user directory projection used by CRM services.
  function userDirectorySelect() {
    return {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      tokenVersion: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      userRoles: {
        select: {
          role: { select: { id: true, name: true, code: true } },
          team: { select: { id: true, name: true } },
        },
      },
    };
  }

  // Flattens role assignments into deduplicated safe role and team arrays.
  function formatDirectoryUser(user) {
    const roles = new Map();
    const teams = new Map();
    for (const assignment of user.userRoles || []) {
      if (assignment.role) roles.set(assignment.role.id, assignment.role);
      if (assignment.team) teams.set(assignment.team.id, assignment.team);
    }
    const safeUser = { ...user };
    delete safeUser.userRoles;
    return {
      ...safeUser,
      roleIds: [...roles.keys()],
      teamIds: [...teams.keys()],
      roles: [...roles.values()],
      teams: [...teams.values()],
    };
  }

  // Finds permissions granted to a user.
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
        team: true,
      },
    });

    const permissions = new Set();
    const teamIds = new Set();
    for (const userRole of userRoles) {
      if (userRole.teamId) teamIds.add(userRole.teamId);
      for (const rolePermission of userRole.role.rolePermissions) {
        if (rolePermission.permission.isActive) {
          permissions.add(rolePermission.permission.key);
        }
      }
    }

    return {
      permissions: [...permissions].sort(),
      teamIds: [...teamIds].sort(),
      roleIds: userRoles.map((item) => item.roleId),
    };
  }

  // Lists users without exposing password hashes.
  async function listUsers(_scope, { skip = 0, limit = 25, search, status } = {}) {
    const where = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: userDirectorySelect(),
      }),
      prisma.user.count({ where }),
    ]);

    return { data: data.map(formatDirectoryUser), total };
  }

  // Resolves a bounded set of users for cross-service validation.
  async function resolveUsers(_scope, userIds) {
    if (!userIds.length) return [];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds }, deletedAt: null },
      orderBy: { name: "asc" },
      select: userDirectorySelect(),
    });
    return users.map(formatDirectoryUser);
  }

  // Creates a user and assigns a role transactionally.
  async function createUserWithRole({ user, passwordHash, roleId, teamId, actorUserId, requestId }) {
    return prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name: user.name,
          email: String(user.email).toLowerCase(),
          phone: user.phone || null,
          passwordHash,
        },
      });

      if (roleId) {
        await tx.userRole.create({
          data: {
            userId: createdUser.id,
            roleId,
            teamId: teamId || null,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId,
          action: "user.created",
          resourceType: "user",
          resourceId: createdUser.id,
          requestId,
          metadata: { email: createdUser.email, roleId, teamId },
        },
      });

      return createdUser;
    });
  }

  // Lists active roles.
  async function listRoles(_scope) {
    return prisma.role.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  }

  // Creates a role.
  async function createRole({ name, code, description }) {
    return prisma.role.create({
      data: {
        name,
        code,
        description: description || null,
      },
    });
  }

  // Lists active permissions from the global permission catalog.
  async function listPermissions() {
    return prisma.permission.findMany({
      where: { isActive: true },
      orderBy: { key: "asc" },
    });
  }

  // Replaces all permissions for one role.
  async function replaceRolePermissions({ roleId, permissionKeys, actorUserId, requestId }) {
    return prisma.$transaction(async (tx) => {
      const role = await tx.role.findFirstOrThrow({
        where: { id: roleId },
      });

      await tx.rolePermission.deleteMany({
        where: { roleId },
      });

      const permissionRows = [];
      for (const permissionKey of permissionKeys) {
        const permission = await tx.permission.upsert({
          where: { key: permissionKey },
          update: { isActive: true },
          create: { key: permissionKey, description: permissionKey },
        });
        permissionRows.push(permission);
      }

      for (const permission of permissionRows) {
        await tx.rolePermission.create({
          data: {
            roleId: role.id,
            permissionId: permission.id,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId,
          action: "role.permissions_replaced",
          resourceType: "role",
          resourceId: role.id,
          requestId,
          metadata: { permissionKeys },
        },
      });

      await tx.outboxEvent.create({
        data: {
          eventName: "permission.updated",
          aggregateId: role.id,
          payload: { roleId: role.id, permissionKeys },
        },
      });

      const rolePermissions = await tx.rolePermission.findMany({
        where: { roleId: role.id },
        include: { permission: true },
      });
      return rolePermissions.map((item) => item.permission.key).sort();
    });
  }

  return Object.freeze({
    createRole,
    createUserWithRole,
    getUserPermissionKeys,
    listPermissions,
    listRoles,
    listUsers,
    resolveUsers,
    replaceRolePermissions,
  });
}

export { createIamRepository };

