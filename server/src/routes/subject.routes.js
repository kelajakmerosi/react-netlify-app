const { Router } = require('express');
const {
  getAllSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  createTopic,
  updateTopic,
  deleteTopic,
  reorderTopics,
} = require('../controllers/subject.controller');
const { protect, superAdminOnly, adminSubjectScopeRequired } = require('../middleware/auth.middleware');
const { validateBody, validateParams } = require('../middleware/validate.middleware');
const {
  SubjectPathParamsSchema,
  SubjectTopicPathParamsSchema,
  SubjectTopicCreateSchema,
  SubjectTopicUpdateSchema,
  SubjectTopicsReorderSchema,
  SubjectCreateSchema,
  SubjectUpdateSchema,
} = require('../../../shared/contracts');

const router = Router();

router.get('/',      protect, getAllSubjects);
router.patch(
  '/:id/topics/reorder',
  protect,
  adminSubjectScopeRequired({ subjectParam: 'id', requireContent: true }),
  validateParams(SubjectPathParamsSchema),
  validateBody(SubjectTopicsReorderSchema),
  reorderTopics
);
router.post(
  '/:id/topics',
  protect,
  adminSubjectScopeRequired({ subjectParam: 'id', requireContent: true }),
  validateParams(SubjectPathParamsSchema),
  validateBody(SubjectTopicCreateSchema),
  createTopic
);
router.put(
  '/:id/topics/:topicId',
  protect,
  adminSubjectScopeRequired({ subjectParam: 'id', requireContent: true }),
  validateParams(SubjectTopicPathParamsSchema),
  validateBody(SubjectTopicUpdateSchema),
  updateTopic
);
router.delete(
  '/:id/topics/:topicId',
  protect,
  adminSubjectScopeRequired({ subjectParam: 'id', requireContent: true }),
  validateParams(SubjectTopicPathParamsSchema),
  deleteTopic
);
router.get('/:id',   protect, validateParams(SubjectPathParamsSchema), getSubjectById);
router.post('/',     protect, superAdminOnly, validateBody(SubjectCreateSchema), createSubject);
router.put('/:id',   protect, adminSubjectScopeRequired({ subjectParam: 'id', requireContent: true }), validateParams(SubjectPathParamsSchema), validateBody(SubjectUpdateSchema), updateSubject);
router.delete('/:id',protect, superAdminOnly, validateParams(SubjectPathParamsSchema), deleteSubject);

module.exports = router;
