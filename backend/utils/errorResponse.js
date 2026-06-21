// utils/errorResponse.js
// Utility to send standardized JSON error responses

const sendError = (res, statusCode, message, details = null) => {
  const errorResponse = {
    success: false,
    message: message,
    ...(details && { details }), // Optional: Include stack trace or extra info in dev
  };

  // In production, avoid leaking sensitive details
  if (process.env.NODE_ENV !== 'production' && details) {
    errorResponse.stack = details.stack;
  }

  return res.status(statusCode).json(errorResponse);
};

// Common error helpers
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err); // Log for debugging
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  sendError(res, statusCode, message, err);
};

module.exports = { sendError, errorHandler };