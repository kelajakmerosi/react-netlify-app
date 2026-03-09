import { z } from 'zod'
import type { LessonHistoryEntry, TopicProgressData, TopicProgressMap } from '../types'
import api from './api'
import { tokenStore } from './auth.service'

export interface ProgressMetrics {
  streakDays: number
  timeOnTaskSec: number
  lastActivityAt: number | null
}

export interface ProgressSnapshot {
  topicProgress: TopicProgressMap
  lessonHistory: LessonHistoryEntry[]
  metrics: ProgressMetrics
}

interface PatchResponse extends ProgressSnapshot {
  updated: TopicProgressData
}

const resolveToken = (token?: string) => token ?? tokenStore.get() ?? undefined

const TopicStatusSchema = z.enum(['completed', 'inprogress', 'onhold', 'locked'])

const QuizAttemptEntrySchema = z.object({
  id: z.string(),
  score: z.number(),
  totalQuestions: z.number(),
  masteryScore: z.number(),
  attemptedAt: z.number(),
})

const TopicProgressDataSchema = z.object({
  status: TopicStatusSchema.optional(),
  videoWatched: z.boolean().optional(),
  quizScore: z.number().nullable().optional(),
  quizTotalQuestions: z.number().nullable().optional(),
  quizAnswers: z.record(z.string(), z.number()).nullable().optional().transform(val => val ? Object.fromEntries(Object.entries(val).map(([k, v]) => [Number(k), v])) : undefined),
  quizSubmitted: z.boolean().optional(),
  masteryScore: z.number().nullable().optional(),
  quizAttempts: z.number().optional(),
  quizAttemptHistory: z.array(QuizAttemptEntrySchema).optional(),
  timeOnTaskSec: z.number().optional(),
  lastActivityAt: z.number().nullable().optional(),
  completedAt: z.number().nullable().optional(),
  resumeQuestionIndex: z.number().optional(),
})

const ProgressMetricsSchema = z.object({
  streakDays: z.number(),
  timeOnTaskSec: z.number(),
  lastActivityAt: z.number().nullable(),
})

const ProgressSnapshotSchema = z.object({
  topicProgress: z.record(TopicProgressDataSchema) as unknown as z.ZodType<TopicProgressMap>,
  lessonHistory: z.array(z.object({
    subjectId: z.string(),
    topicId: z.string(),
    quizScore: z.number().nullable().optional(),
    timestamp: z.number(),
  })),
  metrics: ProgressMetricsSchema,
})

const PatchResponseSchema = ProgressSnapshotSchema.extend({
  updated: TopicProgressDataSchema as unknown as z.ZodType<TopicProgressData>,
})

export const progressService = {
  getProgress: async (token?: string): Promise<ProgressSnapshot> => {
    return api.get<ProgressSnapshot>('/users/progress', resolveToken(token), ProgressSnapshotSchema)
  },

  patchTopicProgress: async (
    subjectId: string,
    topicId: string,
    data: Partial<TopicProgressData>,
    token?: string,
  ): Promise<PatchResponse> => {
    const safeSubject = encodeURIComponent(subjectId)
    const safeTopic = encodeURIComponent(topicId)

    return api.patch<PatchResponse>(
      `/users/progress/${safeSubject}/${safeTopic}`,
      data,
      resolveToken(token),
      PatchResponseSchema,
    )
  },
}

export default progressService
