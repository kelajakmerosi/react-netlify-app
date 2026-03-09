import { Router } from 'express'
import {
  getExamCatalog,
  createExamCheckout,
  startExamAttempt,
  saveExamAnswer,
  submitExamAttempt,
  getExamAttemptSession,
  getExamAttemptResult,
} from '../controllers/exam.controller'
import { protect, requireCapability } from '../middleware/auth.middleware'
import { validateBody, validateParams, validateQuery } from '../middleware/validate.middleware'
import {
  ExamCatalogQuerySchema,
  ExamPathParamsSchema,
  ExamCheckoutIntentSchema,
  ExamAttemptPathParamsSchema,
  ExamAttemptAnswerSchema,
} from '../../../shared/contracts'

const router = Router()

router.get('/', protect as any, requireCapability('learn') as any, validateQuery(ExamCatalogQuerySchema) as any, getExamCatalog as any)
router.post('/:examId/checkout', protect as any, requireCapability('buy') as any, validateParams(ExamPathParamsSchema) as any, validateBody(ExamCheckoutIntentSchema) as any, createExamCheckout as any)
router.post('/:examId/attempts/start', protect as any, requireCapability('learn') as any, validateParams(ExamPathParamsSchema) as any, startExamAttempt as any)
router.patch('/attempts/:attemptId/answers', protect as any, requireCapability('learn') as any, validateParams(ExamAttemptPathParamsSchema) as any, validateBody(ExamAttemptAnswerSchema) as any, saveExamAnswer as any)
router.post('/attempts/:attemptId/submit', protect as any, requireCapability('learn') as any, validateParams(ExamAttemptPathParamsSchema) as any, submitExamAttempt as any)
router.get('/attempts/:attemptId/session', protect as any, requireCapability('learn') as any, validateParams(ExamAttemptPathParamsSchema) as any, getExamAttemptSession as any)
router.get('/attempts/:attemptId/result', protect as any, requireCapability('learn') as any, validateParams(ExamAttemptPathParamsSchema) as any, getExamAttemptResult as any)

export default router
