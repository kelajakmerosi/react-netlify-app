import { Request, Response, NextFunction } from 'express'
interface AuthRequest extends Request { user?: any; file?: any; }
import User from '../models/User.model';
import Progress from '../models/Progress.model';
import Analytics from '../models/Analytics.model';
import MaterialPack from '../models/MaterialPack.model';
import { getAssetAccess } from '../services/storage';
import ERROR_CODES from '../constants/errorCodes';
import { sendError, sendSuccess } from '../utils/http';

// ─── GET /api/users/profile ───────────────────────────────────────────────────

export const getProfile = async (req: AuthRequest, res: Response) => {
  return sendSuccess(res, User.toPublic(req.user));
};

// ─── PUT /api/users/profile ───────────────────────────────────────────────────

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, avatar } = req.body;
    const user = await User.update(req.user.id, { name, avatar });
    return sendSuccess(res, User.toPublic(user));
  } catch (err) { next(err); }
};

// ─── GET /api/users/progress ──────────────────────────────────────────────────

export const getProgress = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const payload = await Progress.buildProgressPayload(req.user.id as any);
    return sendSuccess(res, payload);
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/users/progress/:subjectId/:topicId ──────────────────────────

const ALLOWED_STATUS = new Set(['locked', 'inprogress', 'onhold', 'completed']);

export const patchTopicProgress = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { subjectId, topicId } = req.params;
    if (!subjectId || !topicId) {
      return sendError(res, {
        status: 400,
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'subjectId and topicId are required',
        requestId: req.id as any as any,
      });
    }

    const patch: any = {};
    const {
      status,
      videoWatched,
      quizScore,
      quizAnswers,
      quizSubmitted,
      masteryScore,
      quizAttempts,
      quizTotalQuestions,
      timeOnTaskSec,
      resumeQuestionIndex,
      lastActivityAt,
      completedAt,
    } = req.body || {};

    if (status !== undefined) {
      if (!ALLOWED_STATUS.has(status)) {
        return sendError(res, {
          status: 400,
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid status value',
          requestId: req.id as any as any,
        });
      }
      patch.status = status;
    }

    if (videoWatched !== undefined) patch.videoWatched = Boolean(videoWatched);
    if (quizScore !== undefined) patch.quizScore = Number.isFinite(Number(quizScore)) ? Number(quizScore) : null;
    if (quizAnswers !== undefined) patch.quizAnswers = quizAnswers;
    if (quizSubmitted !== undefined) patch.quizSubmitted = Boolean(quizSubmitted);
    if (masteryScore !== undefined) patch.masteryScore = Number.isFinite(Number(masteryScore)) ? Number(masteryScore) : null;
    if (quizAttempts !== undefined) patch.quizAttempts = Math.max(0, Number(quizAttempts) || 0);
    if (quizTotalQuestions !== undefined) patch.quizTotalQuestions = Math.max(0, Number(quizTotalQuestions) || 0);
    if (timeOnTaskSec !== undefined) patch.timeOnTaskSec = Math.max(0, Number(timeOnTaskSec) || 0);
    if (resumeQuestionIndex !== undefined) patch.resumeQuestionIndex = Math.max(0, Number(resumeQuestionIndex) || 0);
    if (lastActivityAt !== undefined) patch.lastActivityAt = Number(lastActivityAt) || Date.now();
    if (completedAt !== undefined) patch.completedAt = completedAt;

    if (Object.keys(patch).length === 0) {
      return sendError(res, {
        status: 400,
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'No progress fields were provided',
        requestId: req.id as any as any,
      });
    }

    const updated = await Progress.upsert(req.user.id, subjectId as string, topicId as string, patch);
    const snapshot = await Progress.buildProgressPayload(req.user.id as any);

    if (patch.status === 'completed') {
      Analytics.trackEvent({
        eventType: 'topic_completed',
        userId: req.user.id,
        subjectId: subjectId as string,
        topicId: topicId as string,
      }).catch(() => { })
    }

    if (patch.quizSubmitted === true) {
      Analytics.trackEvent({
        eventType: 'quiz_submitted',
        userId: req.user.id,
        subjectId: subjectId as string,
        topicId: topicId as string,
        payload: {
          quizScore: patch.quizScore ?? null,
          quizTotalQuestions: patch.quizTotalQuestions ?? null,
          masteryScore: patch.masteryScore ?? null,
        },
      }).catch(() => { })
    }

    return sendSuccess(res, {
      updated: Progress.toPublicProgress(updated),
      ...snapshot,
    });
  } catch (err) {
    next(err);
  }
};

export const getMaterialLibrary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const library = await MaterialPack.listLibraryByUser(req.user.id as any)
    const withLinks = library.map((entry) => ({
      ...entry,
      assets: (entry.assets || []).map((asset: any) => ({
        ...asset,
        access: getAssetAccess(asset.storageKey),
      })),
    }))

    return sendSuccess(res, withLinks)
  } catch (err) {
    return next(err)
  }
}
