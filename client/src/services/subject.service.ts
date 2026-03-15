import { z } from 'zod'
import api from './api'
import { tokenStore } from './auth.service'

const resolveToken = () => tokenStore.get() ?? undefined

import { SubjectTopicSchema, SubjectSectionSchema } from '@shared/contracts'

const SubjectRecordSchema = z.object({
  id: z.string().min(1),
  catalogKey: z.string().min(1).nullable().optional(),
  catalog_key: z.string().min(1).nullable().optional(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  order: z.number().int().optional(),
  topics: z.array(SubjectTopicSchema).default([]),
  sections: z.array(SubjectSectionSchema).default([]),
  isHidden: z.boolean().optional(),
  is_hidden: z.boolean().optional(),
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
