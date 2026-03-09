import { z } from 'zod'
import api from './api'
import { tokenStore } from './auth.service'

const resolveToken = () => tokenStore.get() ?? undefined

const ExamCatalogItemSchema = z.object({
  id: z.string(),
  subjectId: z.string(),
  ownerUserId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  durationSec: z.number(),
  passPercent: z.number(),
  requiredQuestionCount: z.number().optional(),
  status: z.string(),
  priceUzs: z.number(),
  isActive: z.boolean(),
  approvedBy: z.string().nullable().optional(),
  publishedAt: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  purchased: z.boolean().optional(),
  attemptsRemaining: z.number().optional(),
})

const TeacherExamSummarySchema = z.object({
  id: z.string(),
  subjectId: z.string(),
  subjectTitle: z.string().nullable().optional(),
  ownerUserId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  durationSec: z.number(),
  passPercent: z.number(),
  requiredQuestionCount: z.number().optional(),
  status: z.string(),
  priceUzs: z.number(),
  isActive: z.boolean(),
  approvedBy: z.string().nullable().optional(),
  publishedAt: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  questionCount: z.number().optional(),
  verifiedQuestions: z.number().optional(),
})
export type TeacherExamSummary = z.infer<typeof TeacherExamSummarySchema>

const ExamCheckoutSchema = z.object({
  payment: z.object({
    id: z.string(),
    provider: z.string(),
    externalId: z.string(),
    status: z.string(),
    amountUzs: z.number(),
  }),
  checkout: z.object({
    provider: z.string(),
    externalId: z.string(),
  }),
})

const ExamAttemptStartSchema = z.object({
  attempt: z.object({
    id: z.string(),
    examId: z.string(),
    status: z.string(),
    startedAt: z.string(),
    expiresAt: z.string(),
    examTitle: z.string().optional(),
    passPercent: z.number().optional(),
    requiredQuestionCount: z.number().optional(),
    questionCount: z.number().optional(),
    reused: z.boolean().optional(),
  }),
  questions: z.array(z.object({
    questionId: z.string(),
    questionOrder: z.number(),
    promptText: z.string(),
    options: z.array(z.string()),
    keyVerified: z.boolean().optional(),
    selectedIndex: z.number().nullable().optional(),
    imageUrl: z.string().nullable().optional(),
    blockOrder: z.number().nullable().optional(),
    blockTitle: z.string().nullable().optional(),
  })),
})

const ExamValidationSchema = z.object({
  valid: z.boolean(),
  requiredQuestionCount: z.number(),
  questionCount: z.number(),
  verifiedQuestions: z.number(),
  issues: z.array(z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  })),
})
export type ExamValidation = z.infer<typeof ExamValidationSchema>

const TeacherExamQuestionSchema = z.object({
  id: z.string(),
  questionOrder: z.number(),
  promptText: z.string(),
  promptRich: z.record(z.unknown()).optional(),
  imageUrl: z.string().nullable().optional(),
  options: z.array(z.string()),
  correctIndex: z.number(),
  keyVerified: z.boolean(),
  explanation: z.string().nullable().optional(),
  difficulty: z.string().nullable().optional(),
  sourceRef: z.string().nullable().optional(),
  blockOrder: z.number().nullable().optional(),
  blockTitle: z.string().nullable().optional(),
})
export type TeacherExamQuestion = z.infer<typeof TeacherExamQuestionSchema>

const ImportJobSchema = z.object({
  id: z.string(),
  uploaderId: z.string(),
  subjectId: z.string(),
  sourceType: z.enum(['docx', 'pdf']),
  status: z.string(),
  sourceStorageKey: z.string(),
  parseOutput: z.record(z.unknown()).optional(),
  error: z.record(z.unknown()).optional(),
})

const ExamResultSchema = z.object({
  id: z.string(),
  examId: z.string(),
  status: z.string(),
  scorePercent: z.number(),
  passed: z.boolean(),
  review: z.array(z.object({
    questionId: z.string(),
    questionOrder: z.number().optional(),
    promptText: z.string(),
    options: z.array(z.string()),
    selectedIndex: z.number().nullable(),
    correctIndex: z.number(),
    isCorrect: z.boolean(),
    explanation: z.string().nullable().optional(),
  })),
})

const ExamAttemptSessionSchema = z.object({
  id: z.string(),
  examId: z.string(),
  status: z.string(),
  startedAt: z.string(),
  expiresAt: z.string(),
  submittedAt: z.string().nullable().optional(),
  session: z.object({
    examTitle: z.string().nullable().optional(),
    passPercent: z.number(),
    requiredQuestionCount: z.number(),
  }),
  questions: z.array(z.object({
    questionId: z.string(),
    questionOrder: z.number(),
    promptText: z.string(),
    promptRich: z.record(z.unknown()).optional(),
    imageUrl: z.string().nullable().optional(),
    options: z.array(z.string()),
    selectedIndex: z.number().nullable(),
    difficulty: z.string().nullable().optional(),
    blockOrder: z.number().nullable().optional(),
    blockTitle: z.string().nullable().optional(),
  })),
})

export const examService = {
  getCatalog: async (subjectId?: string) => {
    const query = subjectId ? `?subjectId=${encodeURIComponent(subjectId)}` : ''
    return api.get(`/exams${query}`, resolveToken(), z.array(ExamCatalogItemSchema))
  },

  checkout: async (examId: string, payload: { provider: 'payme' | 'click' | 'manual'; attempts?: number }) => {
    return api.post(`/exams/${encodeURIComponent(examId)}/checkout`, payload, resolveToken(), ExamCheckoutSchema)
  },

  startAttempt: async (examId: string) => {
    return api.post(`/exams/${encodeURIComponent(examId)}/attempts/start`, {}, resolveToken(), ExamAttemptStartSchema)
  },

  getTeacherValidation: async (examId: string) => {
    return api.get(`/teacher/exams/${encodeURIComponent(examId)}/validation`, resolveToken(), ExamValidationSchema)
  },

  getTeacherExams: async () => {
    return api.get('/teacher/exams', resolveToken(), z.array(TeacherExamSummarySchema))
  },

  createTeacherExam: async (payload: {
    subjectId: string
    title: string
    description?: string
    requiredQuestionCount?: 35 | 50
    priceUzs?: number
    blocks?: Array<{ blockOrder: number; title: string }>
    questions?: Array<{
      id?: string
      blockOrder?: number
      questionOrder?: number
      promptText: string
      promptRich?: Record<string, unknown>
      imageUrl?: string | null
      options: string[]
      correctIndex: number
      keyVerified?: boolean
      explanation?: string
      difficulty?: 'easy' | 'medium' | 'hard'
      sourceRef?: string
    }>
  }) => {
    return api.post('/teacher/exams', payload, resolveToken(), TeacherExamSummarySchema)
  },

  updateTeacherExam: async (examId: string, payload: any) => {
    return api.patch<TeacherExamSummary>(`/teacher/exams/${encodeURIComponent(examId)}`, payload, resolveToken(), TeacherExamSummarySchema)
  },

  deleteTeacherExam: async (examId: string) => {
    return api.delete<{ deleted: boolean }>(`/teacher/exams/${encodeURIComponent(examId)}`, resolveToken())
  }, importSource: async (payload: {
    subjectId: string
    title: string
    description?: string
    requiredQuestionCount?: 35 | 50
    sourceType?: 'docx' | 'pdf'
    sourcePath?: string
    file?: File
  }) => {
    const formData = new FormData()
    formData.append('subjectId', payload.subjectId)
    formData.append('title', payload.title)
    if (payload.description) formData.append('description', payload.description)
    if (payload.requiredQuestionCount) formData.append('requiredQuestionCount', String(payload.requiredQuestionCount))
    if (payload.sourceType) formData.append('sourceType', payload.sourceType)
    if (payload.sourcePath) formData.append('sourcePath', payload.sourcePath)
    if (payload.file) formData.append('file', payload.file)

    return api.post('/teacher/exams/import', formData, resolveToken(), z.object({
      job: ImportJobSchema,
      examId: z.string(),
      validation: ExamValidationSchema.optional(),
    }))
  },

  getImportJob: async (jobId: string) => {
    return api.get(`/teacher/exams/import-jobs/${encodeURIComponent(jobId)}`, resolveToken(), ImportJobSchema)
  },

  getTeacherQuestions: async (examId: string) => {
    return api.get(`/teacher/exams/${encodeURIComponent(examId)}/questions`, resolveToken(), z.array(TeacherExamQuestionSchema))
  },

  updateQuestionKey: async (examId: string, questionId: string, payload: { correctIndex: number; keyVerified: boolean }) => {
    return api.patch(
      `/teacher/exams/${encodeURIComponent(examId)}/questions/${encodeURIComponent(questionId)}/key`,
      payload,
      resolveToken(),
      z.object({ updated: z.boolean(), validation: ExamValidationSchema }),
    )
  },

  submitReview: async (examId: string) => {
    return api.post(`/teacher/exams/${encodeURIComponent(examId)}/submit-review`, {}, resolveToken(), z.object({
      submitted: z.boolean(),
      exam: z.unknown(),
    }))
  },

  saveAnswer: async (attemptId: string, payload: { questionId: string; selectedIndex: number }) => {
    return api.patch(`/exams/attempts/${encodeURIComponent(attemptId)}/answers`, payload, resolveToken(), z.object({ updated: z.boolean() }))
  },

  submitAttempt: async (attemptId: string) => {
    return api.post(`/exams/attempts/${encodeURIComponent(attemptId)}/submit`, {}, resolveToken(), ExamResultSchema)
  },

  getAttemptSession: async (attemptId: string) => {
    return api.get(`/exams/attempts/${encodeURIComponent(attemptId)}/session`, resolveToken(), ExamAttemptSessionSchema)
  },

  getAttemptResult: async (attemptId: string) => {
    return api.get(`/exams/attempts/${encodeURIComponent(attemptId)}/result`, resolveToken(), ExamResultSchema)
  },
}

export default examService
