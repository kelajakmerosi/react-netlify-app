const { Router } = require('express')
const {
  createTeacherExam,
  updateTeacherExam,
  getTeacherExamValidation,
  getTeacherExamQuestions,
  updateTeacherExamQuestionKey,
  importTeacherExamFromSource,
  getTeacherExamImportJob,
  submitTeacherExamReview,
} = require('../controllers/exam.controller')
const {
  createTeacherMaterialPack,
  updateTeacherMaterialPack,
  submitTeacherMaterialPackReview,
} = require('../controllers/material.controller')
const { protect, requireCapability, teacherSubjectScopeRequired } = require('../middleware/auth.middleware')
const { uploadExamSource } = require('../middleware/upload.middleware')
const { validateBody, validateParams } = require('../middleware/validate.middleware')
const {
  ExamCreateSchema,
  ExamUpdateSchema,
  ExamPathParamsSchema,
  ExamQuestionPathParamsSchema,
  ExamQuestionKeyUpdateSchema,
  ImportJobPathParamsSchema,
  MaterialPackCreateSchema,
  MaterialPackUpdateSchema,
  MaterialPackPathParamsSchema,
} = require('../../../shared/contracts')

const router = Router()

router.post('/exams', protect, requireCapability('teach'), validateBody(ExamCreateSchema), teacherSubjectScopeRequired({ subjectParam: 'subjectId' }), createTeacherExam)
router.post('/exams/import', protect, requireCapability('teach'), uploadExamSource, teacherSubjectScopeRequired({ subjectParam: 'subjectId' }), importTeacherExamFromSource)
router.get('/exams/import-jobs/:jobId', protect, requireCapability('teach'), validateParams(ImportJobPathParamsSchema), getTeacherExamImportJob)
router.patch('/exams/:examId', protect, requireCapability('teach'), validateParams(ExamPathParamsSchema), validateBody(ExamUpdateSchema), updateTeacherExam)
router.get('/exams/:examId/validation', protect, requireCapability('teach'), validateParams(ExamPathParamsSchema), getTeacherExamValidation)
router.get('/exams/:examId/questions', protect, requireCapability('teach'), validateParams(ExamPathParamsSchema), getTeacherExamQuestions)
router.patch('/exams/:examId/questions/:questionId/key', protect, requireCapability('teach'), validateParams(ExamQuestionPathParamsSchema), validateBody(ExamQuestionKeyUpdateSchema), updateTeacherExamQuestionKey)
router.post('/exams/:examId/submit-review', protect, requireCapability('teach'), validateParams(ExamPathParamsSchema), submitTeacherExamReview)

router.post('/material-packs', protect, requireCapability('teach'), validateBody(MaterialPackCreateSchema), teacherSubjectScopeRequired({ subjectParam: 'subjectId' }), createTeacherMaterialPack)
router.patch('/material-packs/:packId', protect, requireCapability('teach'), validateParams(MaterialPackPathParamsSchema), validateBody(MaterialPackUpdateSchema), updateTeacherMaterialPack)
router.post('/material-packs/:packId/submit-review', protect, requireCapability('teach'), validateParams(MaterialPackPathParamsSchema), submitTeacherMaterialPackReview)

module.exports = router
