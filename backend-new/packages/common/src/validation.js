import { AppError } from "./errors.js";

// Returns the safe body object used for request validation.
function validationBody(req) {
  if (["GET", "HEAD"].includes(req.method)) {
    return {};
  }
  return req.body && typeof req.body === "object" ? req.body : {};
}

// Validates request body, params, and query with a Zod schema.
function validateRequest(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse({
      body: validationBody(req),
      params: req.params || {},
      query: req.query || {},
    });

    if (!result.success) {
      return next(
        new AppError(400, "Request validation failed", "VALIDATION_FAILED", result.error.flatten()),
      );
    }

    req.validated = result.data;
    return next();
  };
}

export { validateRequest, validationBody };
