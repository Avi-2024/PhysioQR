import { Router } from "express";
import { asyncHandler, requireAuth, validateRequest } from "../../../../packages/common/src/index.js";
import { AuthValidators } from "../validators/auth.validators.js";

// Creates Auth routes with validation before controllers.
function createAuthRoutes({ authController }) {
  const router = Router();

  router.post("/login", validateRequest(AuthValidators.login), asyncHandler(authController.login));
  router.post("/refresh-token", validateRequest(AuthValidators.refresh), asyncHandler(authController.refresh));
  router.post("/logout", validateRequest(AuthValidators.logout), asyncHandler(authController.logout));
  router.get("/me", requireAuth, asyncHandler(authController.me));

  return router;
}

export { createAuthRoutes };
