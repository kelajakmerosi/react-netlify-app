const User = require('../models/User.model')
const SubjectScope = require('../models/SubjectScope.model')
const ERROR_CODES = require('../constants/errorCodes')
const { sendError, sendSuccess } = require('../utils/http')

exports.updateUserCapabilities = async (req, res, next) => {
  try {
    const target = await User.findById(req.params.userId)
    if (!target) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.USER_NO_LONGER_EXISTS,
        message: 'User not found',
        requestId: req.id,
      })
    }

    const updated = await User.updateCapabilities(req.params.userId, req.body)
    return sendSuccess(res, {
      user: User.toPublic(updated),
      capabilitiesUpdated: true,
    })
  } catch (err) {
    return next(err)
  }
}

exports.listAdminSubjectScopes = async (req, res, next) => {
  try {
    const scopes = await SubjectScope.listAdminScopes({
      userId: req.query.userId,
      subjectId: req.query.subjectId,
    })
    return sendSuccess(res, scopes)
  } catch (err) {
    return next(err)
  }
}

exports.assignAdminSubjectScope = async (req, res, next) => {
  try {
    const target = await User.findById(req.body.adminUserId)
    if (!target) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.USER_NO_LONGER_EXISTS,
        message: 'Target admin user not found',
        requestId: req.id,
      })
    }

    const scope = await SubjectScope.assignAdminScope({
      adminUserId: req.body.adminUserId,
      subjectId: req.body.subjectId,
      canManageContent: req.body.canManageContent,
      canManagePricing: req.body.canManagePricing,
      createdBy: req.user?.id || null,
    })

    return sendSuccess(res, { scope, assigned: true })
  } catch (err) {
    return next(err)
  }
}

exports.revokeAdminSubjectScope = async (req, res, next) => {
  try {
    const removed = await SubjectScope.revokeAdminScope(req.params.scopeId)
    if (!removed) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.ROUTE_NOT_FOUND,
        message: 'Admin subject scope not found',
        requestId: req.id,
      })
    }

    return sendSuccess(res, { removed: true, scopeId: removed.id })
  } catch (err) {
    return next(err)
  }
}

exports.listTeacherSubjectScopes = async (req, res, next) => {
  try {
    const scopes = await SubjectScope.listTeacherScopes({
      userId: req.query.userId,
      subjectId: req.query.subjectId,
      status: req.query.status,
    })

    return sendSuccess(res, scopes)
  } catch (err) {
    return next(err)
  }
}

exports.assignTeacherSubjectScope = async (req, res, next) => {
  try {
    const target = await User.findById(req.body.teacherUserId)
    if (!target) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.USER_NO_LONGER_EXISTS,
        message: 'Target teacher user not found',
        requestId: req.id,
      })
    }

    const scope = await SubjectScope.assignTeacherScope({
      teacherUserId: req.body.teacherUserId,
      subjectId: req.body.subjectId,
      status: req.body.status,
      approvedBy: req.user?.id || null,
    })

    return sendSuccess(res, { scope, assigned: true })
  } catch (err) {
    return next(err)
  }
}

exports.revokeTeacherSubjectScope = async (req, res, next) => {
  try {
    const removed = await SubjectScope.revokeTeacherScope(req.params.scopeId)
    if (!removed) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.ROUTE_NOT_FOUND,
        message: 'Teacher subject scope not found',
        requestId: req.id,
      })
    }

    return sendSuccess(res, { removed: true, scopeId: removed.id })
  } catch (err) {
    return next(err)
  }
}
