import { z } from 'zod'
import api from './api'
import { tokenStore } from './auth.service'

const resolveToken = () => tokenStore.get() ?? undefined

import { SubjectTopicSchema } from '@shared/contracts'

const SubjectRecordSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  order: z.number().int().optional(),
  topics: z.array(SubjectTopicSchema).default([]),
})

export type SubjectRecord = z.infer<typeof SubjectRecordSchema>

export const subjectService = {
  getAll: async () => (
    api.get('/subjects', resolveToken(), z.array(SubjectRecordSchema)) as Promise<SubjectRecord[]>
  ),
  getById: async (subjectId: string) => (
    api.get(`/subjects/${encodeURIComponent(subjectId)}`, resolveToken(), SubjectRecordSchema) as Promise<SubjectRecord>
  ),
}

export default subjectService
