import { Request, Response, NextFunction } from 'express'
interface AuthRequest extends Request { user?: any; file?: any; }
// @ts-ignore
import ContentUploadJob from '../models/ContentUploadJob.model'
// @ts-ignore
import Payment from '../models/Payment.model'
// @ts-ignore
import Analytics from '../models/Analytics.model'
import SubjectScope from '../models/SubjectScope.model'
import fs from 'fs/promises'
import ERROR_CODES from '../constants/errorCodes'
import { sendError, sendSuccess } from '../utils/http'
import { isSuperAdminUser } from '../utils/adminAccess'
import { isExamsCommerceEnabled, isPaymeClickEnabled } from '../config/featureFlags'
import { importExamFromSource } from '../services/ingestion/importExamFromSource'
import Exam from '../models/Exam.model'
const {
  FIXED_EXAM_DURATION_SEC,
  FIXED_EXAM_PASS_PERCENT,
  DEFAULT_REQUIRED_EXAM_QUESTION_COUNT,
} = Exam

const parseAllowedQuestionCounts = () => {
  const raw = String(process.env.EXAM_ALLOWED_QUESTION_COUNTS || '35,50')
  const parsed = raw
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0)
  return new Set(parsed) as any
}

const ALLOWED_REQUIRED_QUESTION_COUNTS = parseAllowedQuestionCounts()

const inferSourceType = ({ sourceType, sourcePath = '', originalName = '', mimeType = '' }: any): string => {
  const normalizedExplicit = String(sourceType || '').trim().toLowerCase()
  if (normalizedExplicit === 'docx' || normalizedExplicit === 'pdf') return normalizedExplicit

  const candidate = `${sourcePath} ${originalName}`.toLowerCase()
  if (candidate.includes('.docx')) return 'docx'
  if (candidate.includes('.pdf')) return 'pdf'

  const normalizedMime = String(mimeType || '').toLowerCase()
  if (normalizedMime.includes('wordprocessingml.document')) return 'docx'
  if (normalizedMime === 'application/pdf') return 'pdf'

  return ''
}

const cleanupUploadedFile = async (filePath: string | null | undefined): Promise<void> => {
  if (!filePath) return
  try {
    await fs.unlink(filePath)
  } catch {
    // best effort cleanup for temp uploads
  }
}

const mapAttemptReasonToError = (reason: string): any => {
  if (reason === 'exam_unavailable') {
    return {
      status: 404,
      code: ERROR_CODES.EXAM_NOT_PUBLISHED,
      message: 'Exam is not published or inactive',
    }
  }
  if (reason === 'no_entitlement') {
    return {
      status: 402,
      code: ERROR_CODES.EXAM_ENTITLEMENT_MISSING,
      message: 'No available paid attempts for this exam',
    }
  }
  if (reason === 'attempt_not_found') {
    return {
      status: 404,
      code: ERROR_CODES.EXAM_ATTEMPT_NOT_FOUND,
      message: 'Attempt not found',
    }
  }
  if (reason === 'attempt_expired') {
    return {
      status: 409,
      code: ERROR_CODES.EXAM_ATTEMPT_EXPIRED,
      message: 'Attempt is expired',
    }
  }
  if (reason === 'invalid_answer') {
    return {
      status: 400,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Selected answer is outside question options range',
    }
  }
  if (reason === 'exam_invalid_structure') {
    return {
      status: 409,
      code: ERROR_CODES.EXAM_INVALID_STATE,
      message: 'Exam structure is invalid for launch policy',
    }
  }
  return {
    status: 409,
    code: ERROR_CODES.EXAM_ATTEMPT_FINALIZED,
    message: 'Attempt already finalized',
  }
}

export const listTeacherExams = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const isSuperadmin = isSuperAdminUser(req.user)
    const scopes = isSuperadmin
      ? []
      : await SubjectScope.listTeacherScopes({ userId: req.user.id, status: 'active' })

    const exams = await Exam.listManaged({
      userId: req.user.id,
      isSuperadmin,
      subjectIds: scopes.map((scope) => scope.subject_id),
    })

    return sendSuccess(res, exams)
  } catch (err) {
    return next(err)
  }
}

export const createTeacherExam = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (
      req.body.requiredQuestionCount !== undefined
      && !ALLOWED_REQUIRED_QUESTION_COUNTS.has(Number(req.body.requiredQuestionCount))
    ) {
      return sendError(res, {
        status: 400,
        code: ERROR_CODES.VALIDATION_ERROR,
        message: `requiredQuestionCount must be one of: ${Array.from(ALLOWED_REQUIRED_QUESTION_COUNTS).join(', ')}`,
        requestId: req.id as any,
      })
    }

    const exam = await Exam.createDraft({
      subjectId: req.body.subjectId,
      ownerUserId: req.user.id,
      title: req.body.title,
      description: req.body.description,
      durationSec: FIXED_EXAM_DURATION_SEC,
      passPercent: FIXED_EXAM_PASS_PERCENT,
      requiredQuestionCount: req.body.requiredQuestionCount,
    })

    if (!exam) throw new Error('Failed to create draft exam')

    if (Array.isArray(req.body.questions) || Array.isArray(req.body.blocks)) {
      await Exam.replaceStructure({
        examId: exam.id,
        blocks: req.body.blocks || [],
        questions: req.body.questions || [],
      })
    }

    const full = await Exam.getById(exam.id)
    return sendSuccess(res, full, undefined, 201)
  } catch (err) {
    return next(err)
  }
}

export const importTeacherExamFromSource = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const uploadedPath = req.file?.path
  try {
    const subjectId = String(req.body?.subjectId || '').trim()
    const title = String(req.body?.title || '').trim()
    const description = String(req.body?.description || '').trim()
    const sourcePath = String(req.body?.sourcePath || uploadedPath || '').trim()
    const sourceType = inferSourceType({
      sourceType: req.body?.sourceType,
      sourcePath,
      originalName: req.file?.originalname,
      mimeType: req.file?.mimetype,
    })
    const parsedRequiredCount = req.body?.requiredQuestionCount === undefined || req.body?.requiredQuestionCount === ''
      ? undefined
      : Number(req.body.requiredQuestionCount)

    if (!subjectId || !title || !sourcePath || !sourceType) {
      return sendError(res, {
        status: 400,
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'subjectId, title and a valid DOCX/PDF source are required',
        requestId: req.id as any,
      })
    }

    if (
      parsedRequiredCount !== undefined
      && !ALLOWED_REQUIRED_QUESTION_COUNTS.has(Number(parsedRequiredCount))
    ) {
      return sendError(res, {
        status: 400,
        code: ERROR_CODES.VALIDATION_ERROR,
        message: `requiredQuestionCount must be one of: ${Array.from(ALLOWED_REQUIRED_QUESTION_COUNTS).join(', ')}`,
        requestId: req.id as any,
      })
    }

    const job = await ContentUploadJob.create({
      uploaderId: req.user.id,
      subjectId,
      sourceType,
      sourceStorageKey: sourcePath,
    })

    if (!job) throw new Error('Failed to create content upload job')

    try {
      const imported = await importExamFromSource({
        sourceType,
        sourcePath,
        subjectId,
        title,
        description,
        ownerUserId: req.user.id,
        requiredQuestionCount: parsedRequiredCount,
      })

      const updatedJob = await ContentUploadJob.markNeedsReview({
        jobId: job.id,
        parseOutput: imported,
      })

      return sendSuccess(res, {
        job: updatedJob,
        examId: imported.examId,
        validation: imported.validation,
      }, undefined, 201)
    } catch (importError) {
      const failedJob = await ContentUploadJob.markFailed({
        jobId: job.id,
        error: {
          message: importError instanceof Error ? importError.message : String(importError),
        },
      })

      return sendError(res, {
        status: 422,
        code: ERROR_CODES.INGESTION_IMPORT_FAILED,
        message: 'Document import failed',
        requestId: req.id as any,
        details: {
          job: failedJob,
        },
      })
    }
  } catch (err) {
    return next(err)
  } finally {
    await cleanupUploadedFile(uploadedPath)
  }
}

export const getTeacherExamImportJob = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const job = await ContentUploadJob.getById(req.params.jobId)
    if (!job) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.EXAM_NOT_FOUND,
        message: 'Import job not found',
        requestId: req.id as any,
      })
    }

    if (job.uploaderId !== req.user.id && req.user.role !== 'superadmin') {
      return sendError(res, {
        status: 403,
        code: ERROR_CODES.TEACHER_SCOPE_REQUIRED,
        message: 'Import job access denied',
        requestId: req.id as any,
      })
    }

    return sendSuccess(res, job)
  } catch (err) {
    return next(err)
  }
}

export const updateTeacherExam = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (
      req.body.requiredQuestionCount !== undefined
      && !ALLOWED_REQUIRED_QUESTION_COUNTS.has(Number(req.body.requiredQuestionCount))
    ) {
      return sendError(res, {
        status: 400,
        code: ERROR_CODES.VALIDATION_ERROR,
        message: `requiredQuestionCount must be one of: ${Array.from(ALLOWED_REQUIRED_QUESTION_COUNTS).join(', ')}`,
        requestId: req.id as any,
      })
    }

    const current = await Exam.getById((req.params.examId as string))
    if (!current) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.EXAM_NOT_FOUND,
        message: 'Exam not found',
        requestId: req.id as any,
      })
    }

    if (current.ownerUserId !== req.user.id && req.user.role !== 'superadmin') {
      return sendError(res, {
        status: 403,
        code: ERROR_CODES.TEACHER_SCOPE_REQUIRED,
        message: 'Teacher ownership is required for updates',
        requestId: req.id as any,
      })
    }

    if (!isSuperAdminUser(req.user)) {
      const hasTeacherScope = await SubjectScope.hasTeacherScope({
        userId: req.user.id,
        subjectId: current.subjectId,
      })
      if (!hasTeacherScope) {
        return sendError(res, {
          status: 403,
          code: ERROR_CODES.TEACHER_SCOPE_REQUIRED,
          message: 'Teacher subject scope is required for exam updates',
          requestId: req.id as any,
          details: { subjectId: current.subjectId },
        })
      }
    }

    if (current.status === 'published') {
      return sendError(res, {
        status: 409,
        code: ERROR_CODES.EXAM_INVALID_STATE,
        message: 'Published exam cannot be edited directly',
        requestId: req.id as any,
      })
    }

    const updated = await Exam.updateDraft((req.params.examId as string), req.body)

    if (Array.isArray(req.body.questions) || Array.isArray(req.body.blocks)) {
      await Exam.replaceStructure({
        examId: (req.params.examId as string),
        blocks: req.body.blocks || [],
        questions: req.body.questions || [],
      })
    }

    return sendSuccess(res, updated)
  } catch (err) {
    return next(err)
  }
}

export const submitTeacherExamReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const current = await Exam.getById((req.params.examId as string))
    if (!current) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.EXAM_NOT_FOUND,
        message: 'Exam not found',
        requestId: req.id as any,
      })
    }

    if (current.ownerUserId !== req.user.id && req.user.role !== 'superadmin') {
      return sendError(res, {
        status: 403,
        code: ERROR_CODES.TEACHER_SCOPE_REQUIRED,
        message: 'Teacher ownership is required for review submission',
        requestId: req.id as any,
      })
    }

    if (!isSuperAdminUser(req.user)) {
      const hasTeacherScope = await SubjectScope.hasTeacherScope({
        userId: req.user.id,
        subjectId: current.subjectId,
      })
      if (!hasTeacherScope) {
        return sendError(res, {
          status: 403,
          code: ERROR_CODES.TEACHER_SCOPE_REQUIRED,
          message: 'Teacher subject scope is required for exam review submission',
          requestId: req.id as any,
          details: { subjectId: current.subjectId },
        })
      }
    }

    if (current.status !== 'draft') {
      return sendError(res, {
        status: 409,
        code: ERROR_CODES.EXAM_INVALID_STATE,
        message: 'Only draft exams can be submitted for review',
        requestId: req.id as any,
      })
    }

    const validation = await Exam.validateExamStructure((req.params.examId as string))
    if (!validation.valid) {
      return sendError(res, {
        status: 400,
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Exam must satisfy structure checks before review submission',
        requestId: req.id as any,
        details: validation,
      })
    }

    if (current.durationSec !== FIXED_EXAM_DURATION_SEC || current.passPercent !== FIXED_EXAM_PASS_PERCENT) {
      return sendError(res, {
        status: 409,
        code: ERROR_CODES.EXAM_INVALID_STATE,
        message: 'Exam must use fixed 120 minute duration and 80 percent pass threshold',
        requestId: req.id as any,
      })
    }

    const submitted = await Exam.setStatus((req.params.examId as string), {
      status: 'pending_review',
      reviewerId: null,
    })
    if (!submitted) {
      return sendError(res, {
        status: 409,
        code: ERROR_CODES.EXAM_INVALID_STATE,
        message: 'Exam status transition is not allowed',
        requestId: req.id as any,
      })
    }

    return sendSuccess(res, { exam: submitted, submitted: true })
  } catch (err) {
    return next(err)
  }
}

export const getTeacherExamValidation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const current = await Exam.getById((req.params.examId as string))
    if (!current) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.EXAM_NOT_FOUND,
        message: 'Exam not found',
        requestId: req.id as any,
      })
    }

    if (current.ownerUserId !== req.user.id && req.user.role !== 'superadmin') {
      return sendError(res, {
        status: 403,
        code: ERROR_CODES.TEACHER_SCOPE_REQUIRED,
        message: 'Teacher ownership is required for exam validation view',
        requestId: req.id as any,
      })
    }

    const validation = await Exam.validateExamStructure((req.params.examId as string))
    return sendSuccess(res, validation)
  } catch (err) {
    return next(err)
  }
}

export const getTeacherExamQuestions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const current = await Exam.getById((req.params.examId as string))
    if (!current) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.EXAM_NOT_FOUND,
        message: 'Exam not found',
        requestId: req.id as any,
      })
    }

    if (current.ownerUserId !== req.user.id && req.user.role !== 'superadmin') {
      return sendError(res, {
        status: 403,
        code: ERROR_CODES.TEACHER_SCOPE_REQUIRED,
        message: 'Teacher ownership is required for exam questions',
        requestId: req.id as any,
      })
    }

    const questions = await Exam.listQuestions((req.params.examId as string))
    return sendSuccess(res, questions)
  } catch (err) {
    return next(err)
  }
}

export const updateTeacherExamQuestionKey = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const current = await Exam.getById((req.params.examId as string))
    if (!current) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.EXAM_NOT_FOUND,
        message: 'Exam not found',
        requestId: req.id as any,
      })
    }

    if (current.ownerUserId !== req.user.id && req.user.role !== 'superadmin') {
      return sendError(res, {
        status: 403,
        code: ERROR_CODES.TEACHER_SCOPE_REQUIRED,
        message: 'Teacher ownership is required for answer key updates',
        requestId: req.id as any,
      })
    }

    const questions = await Exam.listQuestions((req.params.examId as string))
    const target = questions.find((question: any) => question.id === (req.params.questionId as string))
    if (!target) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.EXAM_NOT_FOUND,
        message: 'Question not found in exam',
        requestId: req.id as any,
      })
    }

    if (req.body.correctIndex >= target.options.length) {
      return sendError(res, {
        status: 400,
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'correctIndex is outside option range',
        requestId: req.id as any,
      })
    }

    await Exam.updateQuestionKey({
      examId: (req.params.examId as string),
      questionId: (req.params.questionId as string),
      correctIndex: req.body.correctIndex,
      keyVerified: req.body.keyVerified,
    })

    const validation = await Exam.validateExamStructure((req.params.examId as string))
    return sendSuccess(res, { updated: true, validation })
  } catch (err) {
    return next(err)
  }
}

export const approveExam = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const exam = await Exam.getById((req.params.examId as string))
    if (!exam) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.EXAM_NOT_FOUND,
        message: 'Exam not found',
        requestId: req.id as any,
      })
    }

    if (!isSuperAdminUser(req.user)) {
      const hasScope = await SubjectScope.hasAdminScope({
        userId: req.user.id,
        subjectId: exam.subjectId,
        requireContent: true,
      })
      if (!hasScope) {
        return sendError(res, {
          status: 403,
          code: ERROR_CODES.SUBJECT_SCOPE_REQUIRED,
          message: 'Admin subject scope is required for exam approval',
          requestId: req.id as any,
          details: { subjectId: exam.subjectId },
        })
      }
    }

    if (exam.status !== 'pending_review') {
      return sendError(res, {
        status: 409,
        code: ERROR_CODES.EXAM_INVALID_STATE,
        message: 'Only pending review exams can be approved',
        requestId: req.id as any,
      })
    }

    if (exam.durationSec !== FIXED_EXAM_DURATION_SEC || exam.passPercent !== FIXED_EXAM_PASS_PERCENT) {
      return sendError(res, {
        status: 409,
        code: ERROR_CODES.EXAM_INVALID_STATE,
        message: 'Exam must use fixed 120 minute duration and 80 percent pass threshold',
        requestId: req.id as any,
      })
    }

    const validation = await Exam.validateExamStructure((req.params.examId as string))
    if (!validation.valid) {
      return sendError(res, {
        status: 409,
        code: ERROR_CODES.EXAM_INVALID_STATE,
        message: 'Exam must satisfy structure checks before publish',
        requestId: req.id as any,
        details: validation,
      })
    }

    const published = await Exam.setStatus((req.params.examId as string), {
      status: 'published',
      reviewerId: req.user.id,
    })
    if (!published) {
      return sendError(res, {
        status: 409,
        code: ERROR_CODES.EXAM_INVALID_STATE,
        message: 'Exam status transition is not allowed',
        requestId: req.id as any,
      })
    }

    return sendSuccess(res, { exam: published, approved: true })
  } catch (err) {
    return next(err)
  }
}

export const rejectExam = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const exam = await Exam.getById((req.params.examId as string))
    if (!exam) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.EXAM_NOT_FOUND,
        message: 'Exam not found',
        requestId: req.id as any,
      })
    }

    if (!isSuperAdminUser(req.user)) {
      const hasScope = await SubjectScope.hasAdminScope({
        userId: req.user.id,
        subjectId: exam.subjectId,
        requireContent: true,
      })
      if (!hasScope) {
        return sendError(res, {
          status: 403,
          code: ERROR_CODES.SUBJECT_SCOPE_REQUIRED,
          message: 'Admin subject scope is required for exam rejection',
          requestId: req.id as any,
          details: { subjectId: exam.subjectId },
        })
      }
    }

    const nextStatus = req.body?.archive ? 'archived' : 'draft'
    const rejected = await Exam.setStatus((req.params.examId as string), {
      status: nextStatus,
      reviewerId: req.user.id,
    })
    if (!rejected) {
      return sendError(res, {
        status: 409,
        code: ERROR_CODES.EXAM_INVALID_STATE,
        message: 'Exam status transition is not allowed',
        requestId: req.id as any,
      })
    }

    return sendSuccess(res, { exam: rejected, rejected: true })
  } catch (err) {
    return next(err)
  }
}

export const getExamCatalog = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const exams = await Exam.listPublishedCatalog({
      subjectId: req.query.subjectId,
      userId: req.user?.id,
    })
    return sendSuccess(res, exams)
  } catch (err) {
    return next(err)
  }
}

export const createExamCheckout = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!isExamsCommerceEnabled()) {
      return sendError(res, {
        status: 403,
        code: ERROR_CODES.FEATURE_DISABLED,
        message: 'Exam commerce feature is disabled',
        requestId: req.id as any,
      })
    }

    if (req.body.provider !== 'manual' && !isPaymeClickEnabled()) {
      return sendError(res, {
        status: 409,
        code: ERROR_CODES.FEATURE_DISABLED,
        message: 'Payme/Click checkout is disabled',
        requestId: req.id as any,
      })
    }

    const exam = await Exam.getById((req.params.examId as string))
    if (!exam || exam.status !== 'published' || !exam.isActive) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.EXAM_NOT_PUBLISHED,
        message: 'Exam not available for purchase',
        requestId: req.id as any,
      })
    }

    const attempts = Math.max(1, Number(req.body.attempts || 1))
    const amountUzs = Number(exam.priceUzs || 0) * attempts

    const payment = await Payment.createCheckoutIntent({
      userId: req.user.id,
      paymentType: 'exam_attempt_pack',
      provider: req.body.provider,
      amountUzs,
      payload: {
        examId: exam.id,
        attempts,
      },
    })

    if (!payment) throw new Error('Failed to create checkout intent')

    if (payment.status === 'paid') {
      await Exam.grantEntitlement({
        userId: req.user.id,
        examId: exam.id,
        attemptsTotal: attempts,
        sourcePaymentId: payment.id,
      })
    }

    Analytics.trackEvent({
      eventType: 'exam_checkout_created',
      userId: req.user.id,
      subjectId: exam.subjectId,
      source: req.body.provider,
      payload: { examId: exam.id, attempts, paymentId: payment.id },
    }).catch(() => { })

    return sendSuccess(res, {
      payment,
      checkout: {
        provider: payment.provider,
        externalId: payment.externalId,
      },
    }, undefined, 201)
  } catch (err) {
    return next(err)
  }
}

export const startExamAttempt = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      attempt,
      reason,
      reused,
      validation,
    } = await Exam.startAttempt({ userId: req.user.id, examId: (req.params.examId as string) })

    if (!attempt) {
      const error = mapAttemptReasonToError(reason)
      return sendError(res, {
        status: error.status,
        code: error.code,
        message: error.message,
        requestId: req.id as any,
        details: reason === 'exam_invalid_structure' ? validation : undefined,
      })
    }

    Analytics.trackEvent({
      eventType: 'exam_attempt_started',
      userId: req.user.id,
      subjectId: attempt.snapshot?.subjectId,
      payload: { examId: (req.params.examId as string), attemptId: attempt.id },
    }).catch(() => { })

    const questions = (attempt.snapshot?.questions || []).map((question: any) => ({
      questionId: question.id,
      questionOrder: question.questionOrder,
      promptText: question.promptText,
      promptRich: question.promptRich,
      imageUrl: question.imageUrl,
      options: question.options,
      difficulty: question.difficulty,
      blockOrder: question.blockOrder,
      blockTitle: question.blockTitle,
    }))

    return sendSuccess(res, {
      attempt: {
        id: attempt.id,
        examId: attempt.examId,
        status: attempt.status,
        startedAt: attempt.startedAt,
        expiresAt: attempt.expiresAt,
        examTitle: attempt.snapshot?.examTitle,
        passPercent: attempt.snapshot?.passPercent,
        requiredQuestionCount: attempt.snapshot?.requiredQuestionCount,
        questionCount: Array.isArray(attempt.snapshot?.questions) ? attempt.snapshot.questions.length : 0,
        reused: Boolean(reused),
      },
      questions,
    }, undefined, reused ? 200 : 201)
  } catch (err) {
    return next(err)
  }
}

export const saveExamAnswer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await Exam.saveAttemptAnswer({
      attemptId: (req.params.attemptId as string),
      userId: req.user.id,
      questionId: req.body.questionId,
      selectedIndex: req.body.selectedIndex,
    })

    if (!result.updated) {
      const error = mapAttemptReasonToError(result.reason)
      return sendError(res, {
        status: error.status,
        code: error.code,
        message: error.message,
        requestId: req.id as any,
      })
    }

    return sendSuccess(res, { updated: true })
  } catch (err) {
    return next(err)
  }
}

export const submitExamAttempt = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { attempt, reason } = await Exam.submitAttempt({
      attemptId: (req.params.attemptId as string),
      userId: req.user.id,
    })

    if (!attempt) {
      const error = mapAttemptReasonToError(reason)
      return sendError(res, {
        status: error.status,
        code: error.code,
        message: error.message,
        requestId: req.id as any,
      })
    }

    const result = await Exam.getAttemptResult({
      attemptId: (req.params.attemptId as string),
      userId: req.user.id,
    })

    Analytics.trackEvent({
      eventType: 'exam_attempt_submitted',
      userId: req.user.id,
      payload: {
        examId: attempt.examId,
        attemptId: attempt.id,
        scorePercent: attempt.scorePercent,
        passed: attempt.passed,
      },
    }).catch(() => { })

    return sendSuccess(res, result)
  } catch (err) {
    return next(err)
  }
}

export const getExamAttemptResult = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await Exam.getAttemptResult({ attemptId: (req.params.attemptId as string), userId: req.user.id })
    if (!result) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.EXAM_ATTEMPT_NOT_FOUND,
        message: 'Attempt result not found',
        requestId: req.id as any,
      })
    }

    return sendSuccess(res, result)
  } catch (err) {
    return next(err)
  }
}

export const getExamAttemptSession = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const session = await Exam.getAttemptSession({ attemptId: (req.params.attemptId as string), userId: req.user.id })
    if (!session) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.EXAM_ATTEMPT_NOT_FOUND,
        message: 'Attempt session not found',
        requestId: req.id as any,
      })
    }

    return sendSuccess(res, session)
  } catch (err) {
    return next(err)
  }
}

export const deleteTeacherExam = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const exam = await Exam.getById((req.params.examId as string))
    if (!exam) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.ROUTE_NOT_FOUND,
        message: 'Exam not found',
        requestId: req.id as any,
      })
    }
    if (!isSuperAdminUser(req.user) && exam.ownerUserId !== req.user.id) {
      return sendError(res, {
        status: 403,
        code: ERROR_CODES.NOT_AUTHORISED_INVALID_TOKEN,
        message: 'Not authorized to delete this exam',
        requestId: req.id as any,
      })
    }
    const deleted = await Exam.remove((req.params.examId as string))
    return sendSuccess(res, { deleted })
  } catch (err) {
    return next(err)
  }
}
