import {  Router  } from 'express';
import { 
  getProfile,
  updateProfile,
  getProgress,
  patchTopicProgress,
  getMaterialLibrary,
 } from '../controllers/user.controller';
import {  protect  } from '../middleware/auth.middleware';
import {  validateBody, validateParams  } from '../middleware/validate.middleware';
import { 
  ProfileUpdateSchema,
  TopicProgressPatchSchema,
  ProgressTopicParamsSchema,
 } from '../../../shared/contracts';

const router = Router();

router.get('/profile', protect as any, getProfile as any);
router.put('/profile', protect as any, validateBody(ProfileUpdateSchema as any), updateProfile);
router.get('/progress', protect as any, getProgress as any);
router.get('/me/material-library', protect as any, getMaterialLibrary as any);
router.patch(
  '/progress/:subjectId/:topicId',
  protect,
  validateParams(ProgressTopicParamsSchema),
  validateBody(TopicProgressPatchSchema),
  patchTopicProgress
);

export default router;
