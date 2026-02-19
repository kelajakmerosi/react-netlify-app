const ERROR_CODES = require('../constants/errorCodes');
const { sendError } = require('../utils/http');

/**
 * 404 handler — mounted last, before errorHandler.
 */
exports.notFound = (req, res) => {
  return sendError(res, {
    status: 404,
    code: ERROR_CODES.ROUTE_NOT_FOUND,
    message: `Route ${req.originalUrl} not found`,
    requestId: req.id,
  });
};

/**
 * Global error handler — catches anything passed via next(err).
 */
// eslint-disable-next-line no-unused-vars
exports.errorHandler = (err, req, res, next) => {
  const statusCode = err.status ?? (res.statusCode !== 200 ? res.statusCode : 500);

  // Mongoose validation error → 400
  if (err.name === 'ValidationError') {
    return sendError(res, {
      status: 400,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Validation failed',
      requestId: req.id,
      details: Object.values(err.errors).map((e) => e.message),
    });
  }

  // Mongoose duplicate key → 409
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return sendError(res, {
      status: 409,
      code: ERROR_CODES.DUPLICATE_KEY,
      message: `${field} is already taken`,
      requestId: req.id,
    });
  }

  const logger = req.log || console;
  logger.error({ err, requestId: req.id }, err.message || 'Unhandled server error');

  return sendError(res, {
    status: statusCode,
    code: err.errorCode || ERROR_CODES.INTERNAL_SERVER_ERROR,
    message: err.message || 'Internal server error',
    requestId: req.id,
    ...(process.env.NODE_ENV === 'development' && { details: err.stack }),
  });
};
