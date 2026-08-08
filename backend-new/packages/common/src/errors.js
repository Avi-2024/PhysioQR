// Represents an operational error that is safe to expose as a short message.
class AppError extends Error {
  // Creates a public-safe application error.
  constructor(statusCode, message, code, details = undefined) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }
}

// Converts unknown errors into a public-safe error response.
function toErrorResponse(error, requestId) {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      body: {
        error: {
          code: error.code,
          message: error.message,
          requestId,
          details: error.details,
        },
      },
    };
  }

  return {
    statusCode: 500,
    body: {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unexpected server error",
        requestId,
      },
    },
  };
}

// Handles missing routes through the centralized error pipeline.
function notFoundHandler(req, _res, next) {
  next(new AppError(404, `Route not found: ${req.method} ${req.path}`, "ROUTE_NOT_FOUND"));
}

// Handles application errors without exposing stack traces publicly.
function errorHandler(logger) {
  return (error, req, res, _next) => {
    const requestId = req.context?.requestId;
    const response = toErrorResponse(error, requestId);
    const logPayload = {
      err: error,
      requestId,
      userId: req.context?.user?.id,
      statusCode: response.statusCode,
      code: response.body.error.code,
    };

    if (response.statusCode >= 500) {
      logger?.error(logPayload, "Request failed");
    } else {
      logger?.warn(logPayload, "Request rejected");
    }

    res.status(response.statusCode).json(response.body);
  };
}

export { AppError, errorHandler, notFoundHandler, toErrorResponse };
