import { z } from 'zod'
import api from './api'
import { tokenStore } from './auth.service'

const resolveToken = () => tokenStore.get() ?? undefined

export const SubjectQuestionSchema = z.object({
  id: z.number().int().optional(),
  text: z.string().min(1),
  imageUrl: z.string().optional(),
  options: z.array(z.string()).default([]),
  answer: z.number().int().nonnegative().default(0),
  concept: z.string().optional(),
})

export const SubjectTopicSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  videoId: z.string().optional().default(''),
  videoUrl: z.string().optional(),
  questions: z.array(SubjectQuestionSchema).default([]),
})

export const SubjectRecordSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  order: z.number().int().optional(),
  topics: z.array(SubjectTopicSchema).default([]),
})

export type SubjectRecord = z.infer<typeof SubjectRecordSchema>
export type SubjectTopicRecord = z.infer<typeof SubjectTopicSchema>

export const subjectService = {
  getAll: async () => (
    api.get('/subjects', resolveToken(), z.array(SubjectRecordSchema)) as Promise<SubjectRecord[]>
  ),
  getById: async (subjectId: string) => (
    api.get(`/subjects/${encodeURIComponent(subjectId)}`, resolveToken(), SubjectRecordSchema) as Promise<SubjectRecord>
  ),
}

export default subjectService
