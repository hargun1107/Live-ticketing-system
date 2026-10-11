// Centralized error handler. Controllers call next(err) (or throw
// inside an async wrapper) and this formats a consistent response
// instead of scattering try/catch-and-format logic everywhere.

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err);

  // MySQL duplicate entry (e.g. email already registered)
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, message: 'Duplicate entry: this record already exists.' });
  }

  // MySQL foreign key violation
  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(400).json({ success: false, message: 'Invalid reference: related record does not exist.' });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error.';

  res.status(statusCode).json({ success: false, message });
}

// Wraps an async route handler so rejected promises are forwarded to
// errorHandler instead of crashing the process / hanging the request.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// Small helper for controllers to throw a specific HTTP status.
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = { errorHandler, asyncHandler, ApiError };
