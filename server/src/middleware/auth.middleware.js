const jwt  = require('jsonwebtoken');
const User = require('../models/User.model');
const ERROR_CODES = require('../constants/errorCodes');
const { sendError } = require('../utils/http');

/**
 * Protect — verifies the Bearer JWT and attaches `req.user`.
 */
exports.protect = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer '))
      return sendError(res, {
        status: 401,
        code: ERROR_CODES.NOT_AUTHORISED_NO_TOKEN,
        message: 'Not authorised, no token',
        requestId: req.id,
      });

    const token   = auth.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return sendError(res, {
        status: 401,
        code: ERROR_CODES.USER_NO_LONGER_EXISTS,
        message: 'User no longer exists',
        requestId: req.id,
      });
    }

    next();
  } catch {
    return sendError(res, {
      status: 401,
      code: ERROR_CODES.NOT_AUTHORISED_INVALID_TOKEN,
      message: 'Not authorised, invalid token',
      requestId: req.id,
    });
  }
};

/**
 * adminOnly — must come after `protect`.
 */
exports.adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin')
    return sendError(res, {
      status: 403,
      code: ERROR_CODES.ADMIN_ACCESS_REQUIRED,
      message: 'Admin access required',
      requestId: req.id,
    });
  next();
};
