// Wraps async route handlers so errors reach centralized middleware.
function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export { asyncHandler };
