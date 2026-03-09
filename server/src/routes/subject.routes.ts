import { Router } from 'express'
import {
  getAllSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  createTopic,
  updateTopic,
  deleteTopic,
  reorderTopics,
} from '../controllers/subject.controller'
import { protect, superAdminOnly, adminSubjectScopeRequired } from '../middleware/auth.middleware'
import { validateBody, validateParams } from '../middleware/validate.middleware'
import {
  SubjectPathParamsSchema,
  SubjectTopicPathParamsSchema,
  SubjectTopicCreateSchema,
  SubjectTopicUpdateSchema,
  SubjectTopicsReorderSchema,
  SubjectCreateSchema,
  SubjectUpdateSchema,
} from '../../../shared/contracts'

const router = Router()

router.get('/', protect as any, getAllSubjects as any)
router.patch(
  '/:id/topics/reorder',
  protect as any,
  adminSubjectScopeRequired({ subjectParam: 'id', requireContent: true }) as any,
  validateParams(SubjectPathParamsSchema),
  validateBody(SubjectTopicsReorderSchema),
  reorderTopics as any
)
router.post(
  '/:id/topics',
  protect as any,
  adminSubjectScopeRequired({ subjectParam: 'id', requireContent: true }) as any,
  validateParams(SubjectPathParamsSchema),
  validateBody(SubjectTopicCreateSchema),
  createTopic as any
)
router.put(
  '/:id/topics/:topicId',
  protect as any,
  adminSubjectScopeRequired({ subjectParam: 'id', requireContent: true }) as any,
  validateParams(SubjectTopicPathParamsSchema),
  validateBody(SubjectTopicUpdateSchema),
  updateTopic as any
)
router.delete(
  '/:id/topics/:topicId',
  protect as any,
  adminSubjectScopeRequired({ subjectParam: 'id', requireContent: true }) as any,
  validateParams(SubjectTopicPathParamsSchema),
  deleteTopic as any
)
router.get('/:id', protect as any, validateParams(SubjectPathParamsSchema), getSubjectById as any)
router.post('/', protect as any, superAdminOnly as any, validateBody(SubjectCreateSchema), createSubject as any)
router.put('/:id', protect as any, adminSubjectScopeRequired({ subjectParam: 'id', requireContent: true }) as any, validateParams(SubjectPathParamsSchema), validateBody(SubjectUpdateSchema), updateSubject as any)
router.delete('/:id', protect as any, superAdminOnly as any, validateParams(SubjectPathParamsSchema), deleteSubject as any)

export default router
