import { Router } from "express";
import { asyncHandler, requireInternalService, validateRequest } from "../../../../packages/common/src/index.js";
import { IamValidators } from "../validators/iam.validators.js";

// Creates trusted internal Auth/IAM routes for other backend services.
function createInternalRoutes({ iamController }) {
  const router = Router();

  router.use(requireInternalService);
  router.get("/users", validateRequest(IamValidators.listUsers), asyncHandler(iamController.listUsers));
  router.post("/users/resolve", validateRequest(IamValidators.resolveUsers), asyncHandler(iamController.resolveUsers));

  return router;
}

export { createInternalRoutes };
