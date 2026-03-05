const Subject = require('../models/Subject.model');
const ERROR_CODES = require('../constants/errorCodes');
const { sendError, sendSuccess } = require('../utils/http');

const sendSubjectNotFound = (req, res) => sendError(res, {
  status: 404,
  code: ERROR_CODES.ROUTE_NOT_FOUND,
  message: 'Subject not found',
  requestId: req.id,
})

const sendTopicNotFound = (req, res) => sendError(res, {
  status: 404,
  code: ERROR_CODES.TOPIC_NOT_FOUND,
  message: 'Topic not found',
  requestId: req.id,
})

const hasUniqueTopicIds = (topics = []) => {
  const ids = topics.map((topic) => topic.id)
  return new Set(ids).size === ids.length
}

const normalizeQuestions = (questions = [], previousQuestions = []) => {
  const used = new Set()
  let maxId = previousQuestions.reduce((max, question) => (
    Number.isInteger(question.id) && question.id > max ? question.id : max
  ), 0)

  return questions.map((question, idx) => {
    let nextId = Number.isInteger(question.id) ? question.id : null
    if (!nextId) {
      const previousId = previousQuestions[idx]?.id
      if (Number.isInteger(previousId)) nextId = previousId
    }

    if (!Number.isInteger(nextId) || used.has(nextId)) {
      maxId += 1
      nextId = maxId
    } else {
      maxId = Math.max(maxId, nextId)
    }

    used.add(nextId)

    return {
      ...question,
      id: nextId,
    }
  })
}

const normalizeTopics = (topics = [], previousTopics = []) => (
  topics.map((topic) => {
    const previousTopic = previousTopics.find((candidate) => candidate.id === topic.id)
    return {
      ...topic,
      questions: normalizeQuestions(topic.questions || [], previousTopic?.questions || []),
    }
  })
)

// ─── GET /api/subjects ────────────────────────────────────────────────────────

exports.getAllSubjects = async (req, res, next) => {
  try {
    const subjects = await Subject.findAll();
    return sendSuccess(res, subjects);
  } catch (err) { next(err); }
};

// ─── GET /api/subjects/:id ────────────────────────────────────────────────────

exports.getSubjectById = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return sendSubjectNotFound(req, res);
    }
    return sendSuccess(res, subject);
  } catch (err) { next(err); }
};

// ─── POST /api/subjects ───────────────────────────────────────────────────────

exports.createSubject = async (req, res, next) => {
  try {
    const payload = {
      ...req.body,
      topics: normalizeTopics(req.body.topics || []),
    }

    if (!hasUniqueTopicIds(payload.topics)) {
      return sendError(res, {
        status: 400,
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Topic IDs must be unique within a subject',
        requestId: req.id,
      })
    }

    const subject = await Subject.create(payload);
    return sendSuccess(res, subject, undefined, 201);
  } catch (err) { next(err); }
};

// ─── PUT /api/subjects/:id ────────────────────────────────────────────────────

exports.updateSubject = async (req, res, next) => {
  try {
    const existing = await Subject.findById(req.params.id)
    if (!existing) {
      return sendSubjectNotFound(req, res)
    }

    const payload = { ...req.body }
    if (payload.topics) {
      if (!hasUniqueTopicIds(payload.topics)) {
        return sendError(res, {
          status: 400,
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Topic IDs must be unique within a subject',
          requestId: req.id,
        })
      }
      payload.topics = normalizeTopics(payload.topics, existing.topics || [])
    }

    const subject = await Subject.update(req.params.id, payload);
    if (!subject) {
      return sendSubjectNotFound(req, res)
    }
    return sendSuccess(res, subject);
  } catch (err) { next(err); }
};

// ─── DELETE /api/subjects/:id ─────────────────────────────────────────────────

exports.deleteSubject = async (req, res, next) => {
  try {
    const deleted = await Subject.remove(req.params.id);
    if (!deleted) {
      return sendSubjectNotFound(req, res);
    }
    return sendSuccess(res, { deleted: true }, undefined, 200);
  } catch (err) { next(err); }
};

exports.createTopic = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id)
    if (!subject) return sendSubjectNotFound(req, res)

    const topics = subject.topics || []
    if (topics.some((topic) => topic.id === req.body.id)) {
      return sendError(res, {
        status: 409,
        code: ERROR_CODES.DUPLICATE_KEY,
        message: 'Topic ID already exists in this subject',
        requestId: req.id,
      })
    }

    const nextTopic = {
      ...req.body,
      questions: normalizeQuestions(req.body.questions || []),
    }
    const updated = await Subject.addTopic(req.params.id, nextTopic)
    return sendSuccess(res, updated, undefined, 201)
  } catch (err) {
    next(err)
  }
}

exports.updateTopic = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id)
    if (!subject) return sendSubjectNotFound(req, res)

    const existingTopic = (subject.topics || []).find((topic) => topic.id === req.params.topicId)
    if (!existingTopic) return sendTopicNotFound(req, res)

    const patch = { ...req.body }
    if (patch.questions) {
      patch.questions = normalizeQuestions(patch.questions, existingTopic.questions || [])
    }

    const updated = await Subject.updateTopic(req.params.id, req.params.topicId, patch)
    if (!updated?.topicFound) return sendTopicNotFound(req, res)
    return sendSuccess(res, updated.subject)
  } catch (err) {
    next(err)
  }
}

exports.deleteTopic = async (req, res, next) => {
  try {
    const deleted = await Subject.removeTopic(req.params.id, req.params.topicId)
    if (!deleted) return sendSubjectNotFound(req, res)
    if (!deleted.topicFound) return sendTopicNotFound(req, res)
    return sendSuccess(res, deleted.subject)
  } catch (err) {
    next(err)
  }
}

exports.reorderTopics = async (req, res, next) => {
  try {
    const { topicIds } = req.body
    const reordered = await Subject.reorderTopics(req.params.id, topicIds)
    if (!reordered) return sendSubjectNotFound(req, res)
    if (!reordered.valid) {
      return sendError(res, {
        status: 400,
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'topicIds must include all topic IDs for the subject',
        requestId: req.id,
      })
    }
    return sendSuccess(res, reordered.subject)
  } catch (err) {
    next(err)
  }
}
