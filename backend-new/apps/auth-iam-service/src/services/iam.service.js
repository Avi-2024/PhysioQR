import bcrypt from "bcryptjs";
import { AppError, normalizePagination, paginatedResponse } from "../../../../packages/common/src/index.js";

function createIamService({ iamRepository }) {
  function hasPermission(grantedPermissions, requiredPermission) {
    return grantedPermissions.includes(requiredPermission) || grantedPermissions.includes("*");
  }

  function resolveScopedPermission({ permissions, requiredPermission, userId, teamIds, resource = {} }) {
    if (hasPermission(permissions, requiredPermission)) return true;

    const parts = requiredPermission.split(".");
    if (parts.length < 4) return false;

    const allPermission = [...parts.slice(0, -1), "all"].join(".");
    const teamPermission = [...parts.slice(0, -1), "team"].join(".");
    const ownPermission = [...parts.slice(0, -1), "own"].join(".");

    if (hasPermission(permissions, allPermission)) return true;
    if (resource.teamId && teamIds.includes(resource.teamId) && hasPermission(permissions, teamPermission)) return true;
    if (resource.ownerId && resource.ownerId === userId && hasPermission(permissions, ownPermission)) return true;

    return false;
  }

  async function listUsers(_scope, query = {}) {
    const pagination = normalizePagination(query);
    const result = await iamRepository.listUsers(_scope, {
      skip: pagination.skip,
      limit: pagination.limit,
      search: query.search,
      status: query.status,
    });
    return paginatedResponse({ data: result.data, total: result.total, page: pagination.page, limit: pagination.limit });
  }

  async function resolveUsers(_scope, userIds) {
    return iamRepository.resolveUsers(_scope, [...new Set(userIds)]);
  }

  async function createUser(_scope, payload, context = {}) {
    const passwordHash = await bcrypt.hash(payload.password, 12);
    const user = await iamRepository.createUserWithRole({
      user: payload,
      passwordHash,
      roleId: payload.roleId,
      teamId: payload.teamId,
      actorUserId: context.user?.id,
      requestId: context.requestId,
    });
    return { id: user.id, name: user.name, email: user.email, phone: user.phone, status: user.status, createdAt: user.createdAt };
  }

  async function listRoles(_scope) {
    return iamRepository.listRoles(_scope);
  }

  async function createRole(_scope, payload) {
    return iamRepository.createRole({ name: payload.name, code: payload.code, description: payload.description });
  }

  async function listPermissions() {
    return iamRepository.listPermissions();
  }

  async function replaceRolePermissions(_scope, roleId, permissionKeys, context = {}) {
    return iamRepository.replaceRolePermissions({ roleId, permissionKeys, actorUserId: context.user?.id, requestId: context.requestId });
  }

  async function checkPermission({ userId, permission, resource }) {
    if (!userId) throw new AppError(400, "userId is required", "IAM_CONTEXT_REQUIRED");
    const access = await iamRepository.getUserPermissionKeys(userId);
    return {
      allowed: resolveScopedPermission({ permissions: access.permissions, requiredPermission: permission, userId, teamIds: access.teamIds, resource }),
      permissions: access.permissions,
      teamIds: access.teamIds,
      roleIds: access.roleIds,
    };
  }

  return Object.freeze({ checkPermission, createRole, createUser, listPermissions, listRoles, listUsers, resolveUsers, replaceRolePermissions });
}

export { createIamService };

