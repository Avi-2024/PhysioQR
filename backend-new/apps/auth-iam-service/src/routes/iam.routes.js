import { Router } from "express";
import { asyncHandler, requireAuth, validateRequest } from "../../../../packages/common/src/index.js";
import { PERMISSIONS } from "../../../../packages/contracts/src/permissions.js";
import { IamValidators } from "../validators/iam.validators.js";
import { requirePermission } from "../require-permission.js";

function createIamRoutes({ iamController, iamService }) {
  const router = Router();
  const enforce = (permission) => requirePermission(iamService, permission);

  router.use(requireAuth);

  router.get("/users", enforce(PERMISSIONS.AUTH_USER_READ), validateRequest(IamValidators.listUsers), asyncHandler(iamController.listUsers));
  router.post("/users", enforce(PERMISSIONS.AUTH_USER_CREATE), validateRequest(IamValidators.createUser), asyncHandler(iamController.createUser));
  router.get("/roles", enforce(PERMISSIONS.AUTH_ROLE_MANAGE), validateRequest(IamValidators.empty), asyncHandler(iamController.listRoles));
  router.post("/roles", enforce(PERMISSIONS.AUTH_ROLE_MANAGE), validateRequest(IamValidators.createRole), asyncHandler(iamController.createRole));
  router.get("/permissions", enforce(PERMISSIONS.AUTH_PERMISSION_READ), validateRequest(IamValidators.empty), asyncHandler(iamController.listPermissions));
  router.post("/roles/:id/permissions", enforce(PERMISSIONS.AUTH_ROLE_MANAGE), validateRequest(IamValidators.rolePermissions), asyncHandler(iamController.replaceRolePermissions));
  router.post("/iam/check-permission", validateRequest(IamValidators.checkPermission), asyncHandler(iamController.checkPermission));

  return router;
}

export { createIamRoutes };
