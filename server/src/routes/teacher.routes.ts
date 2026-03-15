import {  Router  } from 'express'
import { 
  listTeacherExams,
  createTeacherExam,
  updateTeacherExam,
  getTeacherExamValidation,
  getTeacherExamQuestions,
  updateTeacherExamQuestionKey,
  importTeacherExamFromSource,
  getTeacherExamImportJob,
  submitTeacherExamReview,
  deleteTeacherExam,
 } from '../controllers/exam.controller'
import { 
  createTeacherMaterialPack,
  updateTeacherMaterialPack,
  submitTeacherMaterialPackReview,
 } from '../controllers/material.controller'
import {  protect, requireCapability, requireTeachCapabilityOrAdmin, teacherSubjectScopeRequired  } from '../middleware/auth.middleware'
import {  uploadExamSource  } from '../middleware/upload.middleware'
import {  validateBody, validateParams  } from '../middleware/validate.middleware'
import { 
  ExamCreateSchema,
  ExamUpdateSchema,
  ExamPathParamsSchema,
  ExamQuestionPathParamsSchema,
  ExamQuestionKeyUpdateSchema,
  ImportJobPathParamsSchema,
  MaterialPackCreateSchema,
  MaterialPackUpdateSchema,
  MaterialPackPathParamsSchema,
 } from '../../../shared/contracts'

const router = Router()

router.get('/exams', protect as any, requireTeachCapabilityOrAdmin as any, listTeacherExams)
router.post('/exams', protect as any, requireTeachCapabilityOrAdmin as any, validateBody(ExamCreateSchema), teacherSubjectScopeRequired({ subjectParam: 'subjectId' }), createTeacherExam)
router.post('/exams/import', protect as any, requireTeachCapabilityOrAdmin as any, uploadExamSource, teacherSubjectScopeRequired({ subjectParam: 'subjectId' }), importTeacherExamFromSource)
router.get('/exams/import-jobs/:jobId', protect as any, requireTeachCapabilityOrAdmin as any, validateParams(ImportJobPathParamsSchema), getTeacherExamImportJob)
router.patch('/exams/:examId', protect as any, requireTeachCapabilityOrAdmin as any, validateParams(ExamPathParamsSchema), validateBody(ExamUpdateSchema), updateTeacherExam)
router.delete('/exams/:examId', protect as any, requireTeachCapabilityOrAdmin as any, validateParams(ExamPathParamsSchema), deleteTeacherExam)
router.get('/exams/:examId/validation', protect as any, requireTeachCapabilityOrAdmin as any, validateParams(ExamPathParamsSchema), getTeacherExamValidation)
router.get('/exams/:examId/questions', protect as any, requireTeachCapabilityOrAdmin as any, validateParams(ExamPathParamsSchema), getTeacherExamQuestions)
router.patch('/exams/:examId/questions/:questionId/key', protect as any, requireTeachCapabilityOrAdmin as any, validateParams(ExamQuestionPathParamsSchema), validateBody(ExamQuestionKeyUpdateSchema), updateTeacherExamQuestionKey)
router.post('/exams/:examId/submit-review', protect as any, requireTeachCapabilityOrAdmin as any, validateParams(ExamPathParamsSchema), submitTeacherExamReview)

router.post('/material-packs', protect as any, requireCapability('teach' as any), validateBody(MaterialPackCreateSchema), teacherSubjectScopeRequired({ subjectParam: 'subjectId' }), createTeacherMaterialPack)
router.patch('/material-packs/:packId', protect as any, requireCapability('teach' as any), validateParams(MaterialPackPathParamsSchema), validateBody(MaterialPackUpdateSchema), updateTeacherMaterialPack)
router.post('/material-packs/:packId/submit-review', protect as any, requireCapability('teach' as any), validateParams(MaterialPackPathParamsSchema), submitTeacherMaterialPackReview)

export default router
