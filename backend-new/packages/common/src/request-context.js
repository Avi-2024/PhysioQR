import crypto from "node:crypto";

// Creates request context with request ID and user placeholders.
function requestContext(req, res, next) {
  const requestId = req.headers["x-request-id"] || crypto.randomUUID();
  req.context = {
    requestId,
    user: null,
    permissions: [],
  };
  res.setHeader("x-request-id", requestId);
  next();
}

export { requestContext };
