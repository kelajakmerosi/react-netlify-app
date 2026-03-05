const { Router } = require('express');
const {
  getProfile,
  updateProfile,
  getProgress,
  patchTopicProgress,
  getMaterialLibrary,
} = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');
const { validateBody, validateParams } = require('../middleware/validate.middleware');
const {
  ProfileUpdateSchema,
  TopicProgressPatchSchema,
  ProgressTopicParamsSchema,
} = require('../../../shared/contracts');

const router = Router();

router.get('/profile',         protect, getProfile);
router.put('/profile',         protect, validateBody(ProfileUpdateSchema), updateProfile);
router.get('/progress',        protect, getProgress);
router.get('/me/material-library', protect, getMaterialLibrary);
router.patch(
  '/progress/:subjectId/:topicId',
  protect,
  validateParams(ProgressTopicParamsSchema),
  validateBody(TopicProgressPatchSchema),
  patchTopicProgress
);

module.exports = router;
