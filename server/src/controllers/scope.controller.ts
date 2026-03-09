import { Request, Response, NextFunction } from 'express'
import User from '../models/User.model'
import SubjectScope from '../models/SubjectScope.model'
import ERROR_CODES from '../constants/errorCodes'
import { sendError, sendSuccess } from '../utils/http'

interface AuthRequest extends Request {
  user?: any
}

export const updateUserCapabilities = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const target = await User.findById(req.params.userId as string)
    if (!target) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.USER_NO_LONGER_EXISTS,
        message: 'User not found',
        requestId: typeof req.id === 'string' ? req.id : undefined,
      })
    }

    const updated = await User.updateCapabilities(req.params.userId as string, req.body)
    return sendSuccess(res, {
      user: User.toPublic(updated),
      capabilitiesUpdated: true,
    })
  } catch (err) {
    return next(err)
  }
}

export const listAdminSubjectScopes = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const scopes = await SubjectScope.listAdminScopes({
      userId: req.query.userId as string,
      subjectId: req.query.subjectId as string,
    })
    return sendSuccess(res, scopes)
  } catch (err) {
    return next(err)
  }
}

export const assignAdminSubjectScope = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const target = await User.findById(req.body.adminUserId)
    if (!target) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.USER_NO_LONGER_EXISTS,
        message: 'Target admin user not found',
        requestId: typeof req.id === 'string' ? req.id : undefined,
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

export const revokeAdminSubjectScope = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const removed = await SubjectScope.revokeAdminScope(req.params.scopeId as string)
    if (!removed) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.ROUTE_NOT_FOUND,
        message: 'Admin subject scope not found',
        requestId: typeof req.id === 'string' ? req.id : undefined,
      })
    }

    return sendSuccess(res, { removed: true, scopeId: removed.id })
  } catch (err) {
    return next(err)
  }
}

export const listTeacherSubjectScopes = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const scopes = await SubjectScope.listTeacherScopes({
      userId: req.query.userId as string,
      subjectId: req.query.subjectId as string,
      status: req.query.status as string,
    })

    return sendSuccess(res, scopes)
  } catch (err) {
    return next(err)
  }
}

export const assignTeacherSubjectScope = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const target = await User.findById(req.body.teacherUserId)
    if (!target) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.USER_NO_LONGER_EXISTS,
        message: 'Target teacher user not found',
        requestId: typeof req.id === 'string' ? req.id : undefined,
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

export const revokeTeacherSubjectScope = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const removed = await SubjectScope.revokeTeacherScope(req.params.scopeId as string)
    if (!removed) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.ROUTE_NOT_FOUND,
        message: 'Teacher subject scope not found',
        requestId: typeof req.id === 'string' ? req.id : undefined,
      })
    }

    return sendSuccess(res, { removed: true, scopeId: removed.id })
  } catch (err) {
    return next(err)
  }
}
