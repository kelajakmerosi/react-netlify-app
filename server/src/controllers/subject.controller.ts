import { Request, Response, NextFunction } from 'express'
import Subject, { SubjectTopic, SubjectQuestion } from '../models/Subject.model'
import ERROR_CODES from '../constants/errorCodes'
import { sendError, sendSuccess } from '../utils/http'
import { isAdminUser } from '../utils/adminAccess'

interface AuthRequest extends Request {
  user?: any
}

const sendSubjectNotFound = (req: AuthRequest, res: Response) => sendError(res, {
  status: 404,
  code: ERROR_CODES.ROUTE_NOT_FOUND,
  message: 'Subject not found',
  requestId: typeof req.id === 'string' ? req.id : undefined,
})

const sendTopicNotFound = (req: AuthRequest, res: Response) => sendError(res, {
  status: 404,
  code: ERROR_CODES.TOPIC_NOT_FOUND,
  message: 'Topic not found',
  requestId: typeof req.id === 'string' ? req.id : undefined,
})

const hasUniqueTopicIds = (topics: SubjectTopic[] = []): boolean => {
  const ids = topics.map((topic) => topic.id)
  return new Set(ids).size === ids.length
}

const normalizeQuestions = (questions: SubjectQuestion[] = [], previousQuestions: SubjectQuestion[] = []): SubjectQuestion[] => {
  const used = new Set<string | number>()
  let maxId = previousQuestions.reduce<number>((max, question) => {
    return Number.isInteger(question.id) && (question.id as number) > max ? (question.id as number) : max
  }, 0)

  return questions.map((question, idx) => {
    let nextId: number | string | null = Number.isInteger(question.id) ? (question.id as number) : null
    if (!nextId) {
      const previousId = previousQuestions[idx]?.id
      if (Number.isInteger(previousId)) nextId = previousId as number
    }

    if (!Number.isInteger(nextId) || used.has(nextId as string | number)) {
      maxId += 1
      nextId = maxId
    } else {
      maxId = Math.max(maxId, nextId as number)
    }

    used.add(nextId as number)

    return {
      ...question,
      id: nextId as number | string,
    } as SubjectQuestion
  })
}

const normalizeTopics = (topics: SubjectTopic[] = [], previousTopics: SubjectTopic[] = []): SubjectTopic[] => (
  topics.map((topic) => {
    const previousTopic = previousTopics.find((candidate) => candidate.id === topic.id)
    return {
      ...topic,
      questions: normalizeQuestions(topic.questions || [], previousTopic?.questions || []),
    }
  })
)

const normalizeSubjectPayload = (payload: Record<string, unknown>) => {
  const nextPayload: Record<string, unknown> = { ...payload }
  if (Object.prototype.hasOwnProperty.call(nextPayload, 'catalogKey')) {
    nextPayload.catalog_key = nextPayload.catalogKey
    delete nextPayload.catalogKey
  }
  if (Object.prototype.hasOwnProperty.call(nextPayload, 'imageUrl')) {
    nextPayload.image_url = nextPayload.imageUrl
    delete nextPayload.imageUrl
  }
  return nextPayload
}

// ─── GET /api/subjects ────────────────────────────────────────────────────────

export const getAllSubjects = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userIsAdmin = req.user && isAdminUser(req.user)
    const subjects = userIsAdmin
      ? await Subject.findAllAdmin()
      : await Subject.findAll()
    return sendSuccess(res, subjects)
  } catch (err) { next(err) }
}

// ─── GET /api/subjects/:id ────────────────────────────────────────────────────

export const getSubjectById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const subject = await Subject.findById(req.params.id as string)
    if (!subject) {
      return sendSubjectNotFound(req, res)
    }
    return sendSuccess(res, subject)
  } catch (err) { next(err) }
}

// ─── POST /api/subjects ───────────────────────────────────────────────────────

export const createSubject = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const payload = {
      ...normalizeSubjectPayload(req.body),
      topics: normalizeTopics((req.body.topics as SubjectTopic[] | undefined) || []),
    } as typeof req.body & { topics: SubjectTopic[] }

    if (!hasUniqueTopicIds(payload.topics)) {
      return sendError(res, {
        status: 400,
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Topic IDs must be unique within a subject',
        requestId: typeof req.id === 'string' ? req.id : undefined,
      })
    }

    const subject = await Subject.create(payload)
    return sendSuccess(res, subject, undefined, 201)
  } catch (err) { next(err) }
}

// ─── PUT /api/subjects/:id ────────────────────────────────────────────────────

export const updateSubject = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await Subject.findById(req.params.id as string)
    if (!existing) {
      return sendSubjectNotFound(req, res)
    }

    const payload = normalizeSubjectPayload(req.body) as typeof req.body & { topics?: SubjectTopic[] }
    if (payload.topics) {
      if (!hasUniqueTopicIds(payload.topics)) {
        return sendError(res, {
          status: 400,
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Topic IDs must be unique within a subject',
          requestId: typeof req.id === 'string' ? req.id : undefined,
        })
      }
      payload.topics = normalizeTopics(payload.topics, existing.topics || [])
    }

    const subject = await Subject.update(req.params.id as string, payload)
    if (!subject) {
      return sendSubjectNotFound(req, res)
    }
    return sendSuccess(res, subject)
  } catch (err) { next(err) }
}

// ─── DELETE /api/subjects/:id ─────────────────────────────────────────────────

export const deleteSubject = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const deleted = await Subject.remove(req.params.id as string)
    if (!deleted) {
      return sendSubjectNotFound(req, res)
    }
    return sendSuccess(res, { deleted: true }, undefined, 200)
  } catch (err) { next(err) }
}

export const createTopic = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const subject = await Subject.findById(req.params.id as string)
    if (!subject) return sendSubjectNotFound(req, res)

    const topics = subject.topics || []
    if (topics.some((topic) => topic.id === req.body.id)) {
      return sendError(res, {
        status: 409,
        code: ERROR_CODES.DUPLICATE_KEY,
        message: 'Topic ID already exists in this subject',
        requestId: typeof req.id === 'string' ? req.id : undefined,
      })
    }

    const nextTopic = {
      ...req.body,
      questions: normalizeQuestions(req.body.questions || []),
    }
    const updated = await Subject.addTopic(req.params.id as string, nextTopic as SubjectTopic)
    return sendSuccess(res, updated, undefined, 201)
  } catch (err) {
    next(err)
  }
}

export const updateTopic = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const subject = await Subject.findById(req.params.id as string)
    if (!subject) return sendSubjectNotFound(req, res)

    const existingTopic = (subject.topics || []).find((topic) => topic.id === req.params.topicId)
    if (!existingTopic) return sendTopicNotFound(req, res)

    const patch = { ...req.body }
    if (patch.questions) {
      patch.questions = normalizeQuestions(patch.questions, existingTopic.questions || [])
    }

    const updated = await Subject.updateTopic(req.params.id as string, req.params.topicId as string, patch)
    if (!updated?.topicFound) return sendTopicNotFound(req, res)
    return sendSuccess(res, updated.subject)
  } catch (err) {
    next(err)
  }
}

export const deleteTopic = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const deleted = await Subject.removeTopic(req.params.id as string, req.params.topicId as string)
    if (!deleted) return sendSubjectNotFound(req, res)
    if (!deleted.topicFound) return sendTopicNotFound(req, res)
    return sendSuccess(res, deleted.subject)
  } catch (err) {
    next(err)
  }
}

export const reorderTopics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { topicIds } = req.body
    const reordered = await Subject.reorderTopics(req.params.id as string, topicIds)
    if (!reordered) return sendSubjectNotFound(req, res)
    if (!reordered.valid) {
      return sendError(res, {
        status: 400,
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'topicIds must include all topic IDs for the subject',
        requestId: typeof req.id === 'string' ? req.id : undefined,
      })
    }
    return sendSuccess(res, reordered.subject)
  } catch (err) {
    next(err)
  }
}
