const User = require('../models/User.model');
const Progress = require('../models/Progress.model');
const Analytics = require('../models/Analytics.model');
const MaterialPack = require('../models/MaterialPack.model');
const { getAssetAccess } = require('../services/storage');
const ERROR_CODES = require('../constants/errorCodes');
const { sendError, sendSuccess } = require('../utils/http');

// ─── GET /api/users/profile ───────────────────────────────────────────────────

exports.getProfile = async (req, res) => {
  return sendSuccess(res, User.toPublic(req.user));
};

// ─── PUT /api/users/profile ───────────────────────────────────────────────────

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, avatar } = req.body;
    const user = await User.update(req.user.id, { name, avatar });
    return sendSuccess(res, User.toPublic(user));
  } catch (err) { next(err); }
};

// ─── GET /api/users/progress ──────────────────────────────────────────────────

exports.getProgress = async (req, res, next) => {
  try {
    const payload = await Progress.buildProgressPayload(req.user.id);
    return sendSuccess(res, payload);
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/users/progress/:subjectId/:topicId ──────────────────────────

const ALLOWED_STATUS = new Set(['locked', 'inprogress', 'onhold', 'completed']);

exports.patchTopicProgress = async (req, res, next) => {
  try {
    const { subjectId, topicId } = req.params;
    if (!subjectId || !topicId) {
      return sendError(res, {
        status: 400,
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'subjectId and topicId are required',
        requestId: req.id,
      });
    }

    const patch = {};
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
          requestId: req.id,
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
        requestId: req.id,
      });
    }

    const updated = await Progress.upsert(req.user.id, subjectId, topicId, patch);
    const snapshot = await Progress.buildProgressPayload(req.user.id);

    if (patch.status === 'completed') {
      Analytics.trackEvent({
        eventType: 'topic_completed',
        userId: req.user.id,
        subjectId,
        topicId,
      }).catch(() => {})
    }

    if (patch.quizSubmitted === true) {
      Analytics.trackEvent({
        eventType: 'quiz_submitted',
        userId: req.user.id,
        subjectId,
        topicId,
        payload: {
          quizScore: patch.quizScore ?? null,
          quizTotalQuestions: patch.quizTotalQuestions ?? null,
          masteryScore: patch.masteryScore ?? null,
        },
      }).catch(() => {})
    }

    return sendSuccess(res, {
      updated: Progress.toPublicProgress(updated),
      ...snapshot,
    });
  } catch (err) {
    next(err);
  }
};

exports.getMaterialLibrary = async (req, res, next) => {
  try {
    const library = await MaterialPack.listLibraryByUser(req.user.id)
    const withLinks = library.map((entry) => ({
      ...entry,
      assets: (entry.assets || []).map((asset) => ({
        ...asset,
        access: getAssetAccess(asset.storageKey),
      })),
    }))

    return sendSuccess(res, withLinks)
  } catch (err) {
    return next(err)
  }
}
