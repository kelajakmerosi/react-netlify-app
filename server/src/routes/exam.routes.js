const { Router } = require('express')
const {
  getExamCatalog,
  createExamCheckout,
  startExamAttempt,
  saveExamAnswer,
  submitExamAttempt,
  getExamAttemptSession,
  getExamAttemptResult,
} = require('../controllers/exam.controller')
const { protect, requireCapability } = require('../middleware/auth.middleware')
const { validateBody, validateParams, validateQuery } = require('../middleware/validate.middleware')
const {
  ExamCatalogQuerySchema,
  ExamPathParamsSchema,
  ExamCheckoutIntentSchema,
  ExamAttemptPathParamsSchema,
  ExamAttemptAnswerSchema,
} = require('../../../shared/contracts')

const router = Router()

router.get('/', protect, requireCapability('learn'), validateQuery(ExamCatalogQuerySchema), getExamCatalog)
router.post('/:examId/checkout', protect, requireCapability('buy'), validateParams(ExamPathParamsSchema), validateBody(ExamCheckoutIntentSchema), createExamCheckout)
router.post('/:examId/attempts/start', protect, requireCapability('learn'), validateParams(ExamPathParamsSchema), startExamAttempt)
router.patch('/attempts/:attemptId/answers', protect, requireCapability('learn'), validateParams(ExamAttemptPathParamsSchema), validateBody(ExamAttemptAnswerSchema), saveExamAnswer)
router.post('/attempts/:attemptId/submit', protect, requireCapability('learn'), validateParams(ExamAttemptPathParamsSchema), submitExamAttempt)
router.get('/attempts/:attemptId/session', protect, requireCapability('learn'), validateParams(ExamAttemptPathParamsSchema), getExamAttemptSession)
router.get('/attempts/:attemptId/result', protect, requireCapability('learn'), validateParams(ExamAttemptPathParamsSchema), getExamAttemptResult)

module.exports = router
