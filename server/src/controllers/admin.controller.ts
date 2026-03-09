import { Request, Response, NextFunction } from 'express'
import User from '../models/User.model'
// @ts-ignore
import Analytics from '../models/Analytics.model'
// @ts-ignore
import Billing from '../models/Billing.model'
import Subject from '../models/Subject.model'
import SubjectScope from '../models/SubjectScope.model'
// @ts-ignore
import Exam from '../models/Exam.model'
// @ts-ignore
import MaterialPack from '../models/MaterialPack.model'
// @ts-ignore
import Payment from '../models/Payment.model'
// @ts-ignore
import Progress from '../models/Progress.model'
import { pool } from '../config/db'
import ERROR_CODES from '../constants/errorCodes'
import { sendError, sendSuccess } from '../utils/http'
import {
  getAdminEmails,
  getAdminPhones,
  getSuperAdminEmails,
  getSuperAdminPhones,
  getAdminSource,
  isSuperAdminUser,
} from '../utils/adminAccess'

interface AuthRequest extends Request {
  user?: any
}

const DEMO_SUBJECT_TITLE = 'Demo Matematika'
const DEMO_SUBJECT_DESCRIPTION = 'Demo beta subject for exam and material commerce flows.'
const DEMO_EXAM_TITLE = 'Attestatsiya Demo Exam (35)'
const DEMO_EXAM_DESCRIPTION = 'Demo attestation exam with fixed timer and pass threshold.'
const DEMO_MATERIAL_TITLE = 'Demo Material Pack'
const DEMO_MATERIAL_DESCRIPTION = 'Demo downloadable pack to validate library unlock flow.'

const buildDemoQuestions = (count = 35): any[] => (
  Array.from({ length: count }).map((_, idx) => {
    const order = idx + 1
    const base = order * 3
    return {
      questionOrder: order,
      promptText: `Demo savol ${order}: ${base} + ${order} = ?`,
      options: [
        String(base + order - 1),
        String(base + order),
        String(base + order + 1),
        String(base + order + 2),
      ],
      correctIndex: 1,
      keyVerified: true,
      promptRich: {
        ingest: {
          sourceType: 'demo',
          parseConfidence: 'high',
          needsManualReview: false,
        },
      },
      blockOrder: 1,
      difficulty: order <= 12 ? 'easy' : order <= 24 ? 'medium' : 'hard',
      sourceRef: 'demo-bootstrap',
    }
  })
)

const ensureDemoSubject = async ({ requestedSubjectId }: { requestedSubjectId?: string | number }): Promise<any> => {
  if (requestedSubjectId) {
    const subject = await Subject.findById(requestedSubjectId)
    if (subject) return subject
  }

  const existing = await pool.query(
    `SELECT *
     FROM subjects
     WHERE title = $1
     LIMIT 1`,
    [DEMO_SUBJECT_TITLE],
  )
  if (existing.rows[0]) return existing.rows[0]

  return Subject.create({
    title: DEMO_SUBJECT_TITLE,
    description: DEMO_SUBJECT_DESCRIPTION,
    icon: 'Calculator',
    color: '#1f6fda',
    order: 1,
    topics: [],
  })
}

const ensureDemoExam = async ({ subjectId, ownerUserId, reviewerId }: { subjectId: any, ownerUserId: any, reviewerId: any }): Promise<any> => {
  const existing = await pool.query(
    `SELECT id
     FROM exams
     WHERE subject_id = $1
       AND owner_user_id = $2
       AND title = $3
     ORDER BY created_at DESC
     LIMIT 1`,
    [subjectId, ownerUserId, DEMO_EXAM_TITLE],
  )

  let exam: any = null
  if (existing.rows[0]?.id) {
    exam = await Exam.getById(existing.rows[0].id)
  } else {
    exam = await Exam.createDraft({
      subjectId,
      ownerUserId,
      title: DEMO_EXAM_TITLE,
      description: DEMO_EXAM_DESCRIPTION,
      requiredQuestionCount: 35,
      priceUzs: 25000,
    })
    // @ts-ignore
    await Exam.replaceStructure({
      examId: exam.id,
      blocks: [{ blockOrder: 1, title: 'Demo Block' }] as any,
      questions: buildDemoQuestions(35) as any,
    })
  }

  if (!exam) throw new Error('Exam creation failed')

  await pool.query(
    `UPDATE exams
     SET status = 'published',
         is_active = TRUE,
         required_question_count = 35,
         approved_by = $2,
         published_at = COALESCE(published_at, NOW()),
         duration_sec = 7200,
         pass_percent = 80,
         updated_at = NOW()
     WHERE id = $1`,
    [exam.id, reviewerId],
  )

  return Exam.getById(exam.id)
}

const ensureDemoMaterialPack = async ({ subjectId, ownerUserId, reviewerId }: { subjectId: any, ownerUserId: any, reviewerId: any }): Promise<any> => {
  const existing = await pool.query(
    `SELECT id
     FROM material_packs
     WHERE subject_id = $1
       AND owner_user_id = $2
       AND title = $3
     ORDER BY created_at DESC
     LIMIT 1`,
    [subjectId, ownerUserId, DEMO_MATERIAL_TITLE],
  )

  let pack: any = null
  if (existing.rows[0]?.id) {
    pack = await MaterialPack.getById(existing.rows[0].id)
  } else {
    pack = await MaterialPack.createDraft({
      subjectId,
      ownerUserId,
      title: DEMO_MATERIAL_TITLE,
      description: DEMO_MATERIAL_DESCRIPTION,
      priceUzs: 15000,
    })
  }

  if (!pack) throw new Error('Material pack creation failed')

  await pool.query(
    `UPDATE material_packs
     SET status = 'published',
         is_active = TRUE,
         approved_by = $2,
         published_at = COALESCE(published_at, NOW()),
         updated_at = NOW()
     WHERE id = $1`,
    [pack.id, reviewerId],
  )

  const assets = await MaterialPack.listAssets(pack.id)
  if (!assets.length) {
    await MaterialPack.addAsset({
      packId: pack.id,
      storageKey: `demo/materials/${pack.id}/guide.txt`,
      fileName: 'demo-guide.txt',
      mimeType: 'text/plain',
      sizeBytes: 1024,
      checksum: 'demo-checksum',
      uploadedBy: reviewerId,
    } as any)
  }

  return MaterialPack.getById(pack.id)
}

const ensureDemoExamEntitlement = async ({ userId, examId, amountUzs }: { userId: any, examId: any, amountUzs: any }) => {
  const existing = await pool.query(
    `SELECT id
     FROM exam_entitlements
     WHERE user_id = $1
       AND exam_id = $2
       AND attempts_remaining > 0
     LIMIT 1`,
    [userId, examId],
  )
  if (existing.rows[0]) return

  const payment: any = await Payment.createCheckoutIntent({
    userId,
    paymentType: 'exam_attempt_pack',
    provider: 'manual',
    amountUzs: Number(amountUzs || 0),
    payload: {
      examId,
      attempts: 1,
      source: 'demo-bootstrap',
    },
  })

  if (!payment) throw new Error('Failed to create payment')

  await Exam.grantEntitlement({
    userId,
    examId,
    attemptsTotal: 1,
    sourcePaymentId: payment.id,
  })
}

const ensureDemoMaterialEntitlement = async ({ userId, packId, amountUzs }: { userId: any, packId: any, amountUzs: any }) => {
  const existing = await pool.query(
    `SELECT id
     FROM material_entitlements
     WHERE user_id = $1
       AND pack_id = $2
       AND revoked_at IS NULL
     LIMIT 1`,
    [userId, packId],
  )
  if (existing.rows[0]) return

  const payment: any = await Payment.createCheckoutIntent({
    userId,
    paymentType: 'material_pack',
    provider: 'manual',
    amountUzs: Number(amountUzs || 0),
    payload: {
      packId,
      source: 'demo-bootstrap',
    },
  })

  if (!payment) throw new Error('Failed to create payment')

  await MaterialPack.grantEntitlement({
    userId,
    packId,
    sourcePaymentId: payment.id,
  })
}

const ensureAdminAccessNotRemoved = async ({ req, res, targetUser, removeDbRole = false, removeAllowlist = false }: { req: AuthRequest, res: Response, targetUser: any, removeDbRole: boolean, removeAllowlist: boolean }) => {
  if (!removeDbRole && !removeAllowlist) return true

  const [dbRoleAdminCount, allowlistAdminCount] = await Promise.all([
    User.countDbRoleAdmins(),
    User.countAllowlistAdmins(),
  ])

  const remainingDbRoleAdmins = Math.max(0, dbRoleAdminCount - (removeDbRole ? 1 : 0))
  const remainingAllowlistAdmins = Math.max(0, allowlistAdminCount - (removeAllowlist ? 1 : 0))

  if (remainingDbRoleAdmins > 0 || remainingAllowlistAdmins > 0) return true

  return sendError(res, {
    status: 409,
    code: ERROR_CODES.ADMIN_LAST_PROTECTED,
    message: 'Cannot remove the last admin with access.',
    requestId: typeof req.id === 'string' ? req.id : undefined,
    details: {
      targetUserId: targetUser?.id,
      remainingDbRoleAdmins,
      remainingAllowlistAdmins,
    },
  })
}

const resolveTargetUser = async ({ userId, email, phone }: { userId?: string, email?: string, phone?: string }) => {
  if (userId) return User.findById(userId)
  return User.findByIdentity({ email, phone })
}

export const getSystemInfo = async (req: AuthRequest, res: Response) => {
  const uptimeSec = Math.round(process.uptime())
  return sendSuccess(res, {
    uptime: `${uptimeSec}s`,
    version: process.env.npm_package_version || '1.0.0',
    env: process.env.NODE_ENV || 'development',
    googleConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    eskizConfigured: Boolean(process.env.ESKIZ_EMAIL && process.env.ESKIZ_PASSWORD && process.env.ESKIZ_BASE_URL),
    adminAccess: {
      emailCount: getAdminEmails().size,
      phoneCount: getAdminPhones().size,
      superAdminEmailCount: getSuperAdminEmails().size,
      superAdminPhoneCount: getSuperAdminPhones().size,
    },
  })
}

export const getAdminUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const users = await User.listPublicSummaries()
    const adminCount = users.filter((user: any) => user.role === 'admin' || user.role === 'superadmin').length
    return sendSuccess(res, users, {
      total: users.length,
      admins: adminCount,
      users: users.length - adminCount,
    })
  } catch (err) {
    return next(err)
  }
}

export const updateUserRole = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params
    const { role } = req.body
    const target = await User.findById(userId as string)
    if (!target) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.USER_NO_LONGER_EXISTS,
        message: 'User not found',
        requestId: typeof req.id === 'string' ? req.id : undefined,
      })
    }

    const isDemotion = target.role !== 'student' && role === 'student'
    if (isDemotion) {
      const adminSource = getAdminSource(target)
      const guardResult = await ensureAdminAccessNotRemoved({
        req,
        res,
        targetUser: target,
        removeDbRole: true,
        removeAllowlist: false,
      })
      if (guardResult !== true) return guardResult

      if (adminSource === 'allowlist' || adminSource === 'both') {
        // Demotion is still allowed because env allowlist can keep access.
      }
    }

    const updated = await User.updateRole(userId as string, role)
    return sendSuccess(res, {
      user: User.toPublic(updated),
      roleUpdated: true,
    })
  } catch (err) {
    return next(err)
  }
}

export const grantAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const target = await resolveTargetUser(req.body)
    if (!target) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.USER_NO_LONGER_EXISTS,
        message: 'User not found for provided identity',
        requestId: typeof req.id === 'string' ? req.id : undefined,
      })
    }

    const updated = (target.role === 'admin' || target.role === 'superadmin')
      ? target
      : await User.updateRole(target.id as string, 'admin')

    return sendSuccess(res, {
      user: User.toPublic(updated),
      granted: true,
    })
  } catch (err) {
    return next(err)
  }
}

export const revokeAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const target = await resolveTargetUser(req.body)
    if (!target) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.USER_NO_LONGER_EXISTS,
        message: 'User not found for provided identity',
        requestId: typeof req.id === 'string' ? req.id : undefined,
      })
    }

    if (target.role === 'student') {
      return sendSuccess(res, {
        user: User.toPublic(target),
        revoked: false,
      })
    }

    const guardResult = await ensureAdminAccessNotRemoved({
      req,
      res,
      targetUser: target,
      removeDbRole: true,
      removeAllowlist: false,
    })
    if (guardResult !== true) return guardResult

    const updated = await User.updateRole(target.id as string, 'student')
    return sendSuccess(res, {
      user: User.toPublic(updated),
      revoked: true,
    })
  } catch (err) {
    return next(err)
  }
}

export const deleteAdminUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params
    const target = await User.findById(userId as string)
    if (!target) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.USER_NO_LONGER_EXISTS,
        message: 'User not found',
        requestId: typeof req.id === 'string' ? req.id : undefined,
      })
    }

    const adminSource = getAdminSource(target)
    const guardResult = await ensureAdminAccessNotRemoved({
      req,
      res,
      targetUser: target,
      removeDbRole: target.role === 'admin' || target.role === 'superadmin',
      removeAllowlist: adminSource === 'allowlist' || adminSource === 'both',
    })
    if (guardResult !== true) return guardResult

    const selfDeleted = req.user?.id === userId
    const deleted = await User.deleteById(userId as string)
    if (!deleted) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.USER_NO_LONGER_EXISTS,
        message: 'User not found',
        requestId: typeof req.id === 'string' ? req.id : undefined,
      })
    }

    return sendSuccess(res, { deleted: true, userId: deleted.id, selfDeleted })
  } catch (err) {
    return next(err)
  }
}

export const getAnalyticsSummary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const analyticsQuery = isSuperAdminUser(req.user)
      ? req.query
      : { ...req.query, userId: req.user?.id }
    const data = await Analytics.getSummary(analyticsQuery)
    return sendSuccess(res, data)
  } catch (err) {
    return next(err)
  }
}

export const getAnalyticsTimeseries = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const analyticsQuery = isSuperAdminUser(req.user)
      ? req.query
      : { ...req.query, userId: req.user?.id }
    const data = await Analytics.getTimeseries(analyticsQuery)
    return sendSuccess(res, data)
  } catch (err) {
    return next(err)
  }
}

export const getAnalyticsBreakdowns = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const analyticsQuery = isSuperAdminUser(req.user)
      ? req.query
      : { ...req.query, userId: req.user?.id }
    const data = await Analytics.getBreakdown(analyticsQuery)
    return sendSuccess(res, data)
  } catch (err) {
    return next(err)
  }
}

export const getPricingCatalog = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await Billing.getPricingCatalog()
    return sendSuccess(res, data)
  } catch (err) {
    return next(err)
  }
}

export const updatePricingPlan = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { planKey } = req.params
    const plan = await Billing.upsertPlan({
      planKey,
      title: req.body.title,
      description: req.body.description,
      priceMonthlyUzs: req.body.priceMonthlyUzs,
      isActive: req.body.isActive,
      features: req.body.features,
    })

    return sendSuccess(res, { plan, updated: true })
  } catch (err) {
    return next(err)
  }
}

export const upsertCoursePricing = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const subjectId = req.params.subjectId || req.body.subjectId
    const coursePrice = await Billing.upsertCoursePrice({
      subjectId,
      subjectTitle: req.body.subjectTitle,
      priceUzs: req.body.priceUzs,
      isActive: req.body.isActive,
    })

    return sendSuccess(res, { coursePrice, updated: true })
  } catch (err) {
    return next(err)
  }
}

export const getFinanceSummary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await Billing.getFinanceSummary(req.query)
    return sendSuccess(res, data)
  } catch (err) {
    return next(err)
  }
}

export const bootstrapDemoDataset = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) {
      return sendError(res, {
        status: 401,
        code: ERROR_CODES.NOT_AUTHORISED_INVALID_TOKEN,
        message: 'Not authorised',
        requestId: typeof req.id === 'string' ? req.id : undefined,
      })
    }

    await User.updateCapabilities(req.user.id, {
      canTeach: true,
      canBuy: true,
      canLearn: true,
    })

    const subject = await ensureDemoSubject({ requestedSubjectId: req.body?.subjectId })

    await SubjectScope.assignTeacherScope({
      teacherUserId: req.user.id,
      subjectId: subject.id,
      status: 'active',
      approvedBy: req.user.id,
    })

    await SubjectScope.assignAdminScope({
      adminUserId: req.user.id,
      subjectId: subject.id,
      canManageContent: true,
      canManagePricing: true,
      createdBy: req.user.id,
    })

    const exam = await ensureDemoExam({
      subjectId: subject.id,
      ownerUserId: req.user.id,
      reviewerId: req.user.id,
    })

    const materialPack = await ensureDemoMaterialPack({
      subjectId: subject.id,
      ownerUserId: req.user.id,
      reviewerId: req.user.id,
    })

    await ensureDemoExamEntitlement({
      userId: req.user.id,
      examId: exam.id,
      amountUzs: exam.priceUzs,
    })
    await ensureDemoMaterialEntitlement({
      userId: req.user.id,
      packId: materialPack.id,
      amountUzs: materialPack.priceUzs,
    })

    return sendSuccess(res, {
      seeded: true,
      subject: {
        id: subject.id,
        title: subject.title,
      },
      exam: {
        id: exam.id,
        title: exam.title,
        status: exam.status,
        requiredQuestionCount: exam.requiredQuestionCount,
      },
      materialPack: {
        id: materialPack.id,
        title: materialPack.title,
        status: materialPack.status,
      },
    })
  } catch (err) {
    if (req?.id) {
      return sendError(res, {
        status: 500,
        code: ERROR_CODES.DEMO_BOOTSTRAP_FAILED,
        message: err instanceof Error ? err.message : 'Demo bootstrap failed',
        requestId: typeof req.id === 'string' ? req.id : undefined,
      })
    }
    return next(err)
  }
}

export const getUserAudit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params
    const target = await User.findById(userId as string)
    if (!target) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.USER_NO_LONGER_EXISTS,
        message: 'User not found',
        requestId: typeof req.id === 'string' ? req.id : undefined,
      })
    }

    const [transactions, exams, completedSubjects] = await Promise.all([
      Payment.findByUserId(userId),
      (Exam as any).findAttemptsByUserId(userId),
      Progress.findCompletedSubjectsByUserId(userId),
    ])

    return sendSuccess(res, {
      profile: target,
      transactions,
      exams,
      completedSubjects,
    })
  } catch (err) {
    return next(err)
  }
}

export const updateUserProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params
    const { firstName, lastName, email, phone } = req.body

    const target = await User.findById(userId as string)
    if (!target) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.USER_NO_LONGER_EXISTS,
        message: 'User not found',
        requestId: typeof req.id === 'string' ? req.id : undefined,
      })
    }

    const updated = await User.updateProfile(userId as string, { firstName, lastName, email, phone })
    return sendSuccess(res, {
      profile: User.toPublic(updated),
      updated: true,
    })
  } catch (err) {
    return next(err)
  }
}

export const suspendUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params
    const { isSuspended } = req.body

    const target = await User.findById(userId as string)
    if (!target) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.USER_NO_LONGER_EXISTS,
        message: 'User not found',
        requestId: typeof req.id === 'string' ? req.id : undefined,
      })
    }

    const guardResult = await ensureAdminAccessNotRemoved({
      req,
      res,
      targetUser: target,
      removeDbRole: true,
      removeAllowlist: false,
    })

    if (isSuspended && guardResult !== true) {
      return guardResult
    }

    const updated = await User.setSuspension(userId as string, isSuspended)
    return sendSuccess(res, {
      profile: User.toPublic(updated),
      suspended: Boolean(updated.is_suspended),
    })
  } catch (err) {
    return next(err)
  }
}
