const jwt  = require('jsonwebtoken');
const User = require('../models/User.model');
const SubjectScope = require('../models/SubjectScope.model');
const ERROR_CODES = require('../constants/errorCodes');
const { sendError } = require('../utils/http');
const { isAdminUser, isSuperAdminUser } = require('../utils/adminAccess');

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
  if (!isAdminUser(req.user))
    return sendError(res, {
      status: 403,
      code: ERROR_CODES.ADMIN_ACCESS_REQUIRED,
      message: 'Admin access required',
      requestId: req.id,
    });
  next();
};

/**
 * superAdminOnly — must come after `protect`.
 */
exports.superAdminOnly = (req, res, next) => {
  if (!isSuperAdminUser(req.user)) {
    return sendError(res, {
      status: 403,
      code: ERROR_CODES.SUPERADMIN_ACCESS_REQUIRED,
      message: 'Superadmin access required',
      requestId: req.id,
    });
  }
  next();
};

const capabilityFieldByKey = Object.freeze({
  teach: 'can_teach',
  buy: 'can_buy',
  learn: 'can_learn',
})

exports.requireCapability = (capability) => (req, res, next) => {
  const field = capabilityFieldByKey[capability]
  if (!field) {
    return sendError(res, {
      status: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      message: `Unknown capability: ${capability}`,
      requestId: req.id,
    })
  }

  if (req.user?.[field]) return next()

  return sendError(res, {
    status: 403,
    code: ERROR_CODES.CAPABILITY_REQUIRED,
    message: `Capability ${capability} is required`,
    requestId: req.id,
    details: { capability },
  })
}

const resolveSubjectId = (req, subjectParam) => {
  if (req.params?.[subjectParam]) return req.params[subjectParam]
  if (req.body?.subjectId) return req.body.subjectId
  return null
}

exports.adminSubjectScopeRequired = ({
  subjectParam = 'id',
  requireContent = true,
  requirePricing = false,
} = {}) => async (req, res, next) => {
  if (!isAdminUser(req.user)) {
    return sendError(res, {
      status: 403,
      code: ERROR_CODES.ADMIN_ACCESS_REQUIRED,
      message: 'Admin access required',
      requestId: req.id,
    })
  }

  if (isSuperAdminUser(req.user)) return next()

  const subjectId = resolveSubjectId(req, subjectParam)
  if (!subjectId) {
    return sendError(res, {
      status: 400,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'subjectId is required for scope validation',
      requestId: req.id,
    })
  }

  try {
    const hasScope = await SubjectScope.hasAdminScope({
      userId: req.user.id,
      subjectId,
      requireContent,
      requirePricing,
    })

    if (hasScope) return next()

    return sendError(res, {
      status: 403,
      code: ERROR_CODES.SUBJECT_SCOPE_REQUIRED,
      message: 'Subject scope access is required',
      requestId: req.id,
      details: { subjectId, requireContent, requirePricing },
    })
  } catch (err) {
    return next(err)
  }
}

exports.teacherSubjectScopeRequired = ({
  subjectParam = 'subjectId',
} = {}) => async (req, res, next) => {
  const subjectId = resolveSubjectId(req, subjectParam)
  if (!subjectId) {
    return sendError(res, {
      status: 400,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'subjectId is required for teacher scope validation',
      requestId: req.id,
    })
  }

  if (isSuperAdminUser(req.user)) return next()

  try {
    const hasScope = await SubjectScope.hasTeacherScope({ userId: req.user.id, subjectId })
    if (hasScope) return next()

    return sendError(res, {
      status: 403,
      code: ERROR_CODES.TEACHER_SCOPE_REQUIRED,
      message: 'Teacher scope is required',
      requestId: req.id,
      details: { subjectId },
    })
  } catch (err) {
    return next(err)
  }
}
