import { AppError } from "../../../packages/common/src/index.js";

function requirePermission(iamService, permission) {
  return async (req, _res, next) => {
    try {
      const userId = req.context?.user?.id;
      const decision = await iamService.checkPermission({ userId, permission, resource: {} });

      if (!decision.allowed) {
        return next(new AppError(403, `Missing permission: ${permission}`, "RBAC_FORBIDDEN"));
      }

      req.context.permissions = decision.permissions;
      req.context.teamIds = decision.teamIds;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

export { requirePermission };
