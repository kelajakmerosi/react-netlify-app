import jwt from 'jsonwebtoken'
import { Request, Response, NextFunction } from 'express'
import User from '../models/User.model'
import SubjectScope from '../models/SubjectScope.model'
import ERROR_CODES from '../constants/errorCodes'
import { sendError } from '../utils/http'
import { isAdminUser, isSuperAdminUser } from '../utils/adminAccess'

export interface AuthRequest extends Request {
  user?: any
}

/**
 * Protect — verifies the Bearer JWT and attaches `req.user`.
 */
export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const auth = req.headers.authorization
    if (!auth?.startsWith('Bearer ')) {
      return sendError(res, {
        status: 401,
        code: ERROR_CODES.NOT_AUTHORISED_NO_TOKEN,
        message: 'Not authorised, no token',
        requestId: typeof req.id === 'string' ? req.id : undefined,
      })
    }

    const token = auth.split(' ')[1]
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string)

    req.user = await User.findById(decoded.id)
    if (!req.user) {
      return sendError(res, {
        status: 401,
        code: ERROR_CODES.USER_NO_LONGER_EXISTS,
        message: 'User no longer exists',
        requestId: typeof req.id === 'string' ? req.id : undefined,
      })
    }

    next()
  } catch {
    return sendError(res, {
      status: 401,
      code: ERROR_CODES.NOT_AUTHORISED_INVALID_TOKEN,
      message: 'Not authorised, invalid token',
      requestId: typeof req.id === 'string' ? req.id : undefined,
    })
  }
}

/**
 * adminOnly — must come after `protect`.
 */
export const adminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!isAdminUser(req.user)) {
    return sendError(res, {
      status: 403,
      code: ERROR_CODES.ADMIN_ACCESS_REQUIRED,
      message: 'Admin access required',
      requestId: typeof req.id === 'string' ? req.id : undefined,
    })
  }
  next()
}

/**
 * superAdminOnly — must come after `protect`.
 */
export const superAdminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!isSuperAdminUser(req.user)) {
    return sendError(res, {
      status: 403,
      code: ERROR_CODES.SUPERADMIN_ACCESS_REQUIRED,
      message: 'Superadmin access required',
      requestId: typeof req.id === 'string' ? req.id : undefined,
    })
  }
  next()
}

const capabilityFieldByKey: Record<string, string> = Object.freeze({
  teach: 'can_teach',
  buy: 'can_buy',
  learn: 'can_learn',
})

export const requireCapability = (capability: string) => (req: AuthRequest, res: Response, next: NextFunction) => {
  const field = capabilityFieldByKey[capability]
  if (!field) {
    return sendError(res, {
      status: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      message: `Unknown capability: ${capability}`,
      requestId: typeof req.id === 'string' ? req.id : undefined,
    })
  }

  if (req.user?.[field]) return next()

  return sendError(res, {
    status: 403,
    code: ERROR_CODES.CAPABILITY_REQUIRED,
    message: `Capability ${capability} is required`,
    requestId: typeof req.id === 'string' ? req.id : undefined,
    details: { capability },
  })
}

const resolveSubjectId = (req: AuthRequest, subjectParam: string): string | null => {
  const param = req.params?.[subjectParam]
  if (param) return Array.isArray(param) ? param[0] : param
  if (req.body?.subjectId) return req.body.subjectId
  return null
}

export interface AdminSubjectScopeRequiredParams {
  subjectParam?: string
  requireContent?: boolean
  requirePricing?: boolean
}

export const adminSubjectScopeRequired = ({
  subjectParam = 'id',
  requireContent = true,
  requirePricing = false,
}: AdminSubjectScopeRequiredParams = {}) => async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!isAdminUser(req.user)) {
    return sendError(res, {
      status: 403,
      code: ERROR_CODES.ADMIN_ACCESS_REQUIRED,
      message: 'Admin access required',
      requestId: typeof req.id === 'string' ? req.id : undefined,
    })
  }

  if (isSuperAdminUser(req.user)) return next()

  const subjectId = resolveSubjectId(req, subjectParam)
  if (!subjectId) {
    return sendError(res, {
      status: 400,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'subjectId is required for scope validation',
      requestId: typeof req.id === 'string' ? req.id : undefined,
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
      requestId: typeof req.id === 'string' ? req.id : undefined,
      details: { subjectId, requireContent, requirePricing },
    })
  } catch (err) {
    return next(err)
  }
}

export interface TeacherSubjectScopeRequiredParams {
  subjectParam?: string
}

export const teacherSubjectScopeRequired = ({
  subjectParam = 'subjectId',
}: TeacherSubjectScopeRequiredParams = {}) => async (req: AuthRequest, res: Response, next: NextFunction) => {
  const subjectId = resolveSubjectId(req, subjectParam)
  if (!subjectId) {
    return sendError(res, {
      status: 400,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'subjectId is required for teacher scope validation',
      requestId: typeof req.id === 'string' ? req.id : undefined,
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
      requestId: typeof req.id === 'string' ? req.id : undefined,
      details: { subjectId },
    })
  } catch (err) {
    return next(err)
  }
}
