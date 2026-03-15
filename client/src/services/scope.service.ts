import { z } from 'zod'
import api from './api'
import { tokenStore } from './auth.service'

const resolveToken = () => tokenStore.get() ?? undefined

const AdminScopeSchema = z.object({
  id: z.string(),
  admin_user_id: z.string(),
  subject_id: z.string(),
  can_manage_content: z.boolean(),
  can_manage_pricing: z.boolean(),
  created_by: z.string().nullable().optional(),
  created_at: z.string().optional(),
})

const TeacherScopeSchema = z.object({
  id: z.string(),
  teacher_user_id: z.string(),
  subject_id: z.string(),
  status: z.enum(['active', 'blocked', 'pending']),
  approved_by: z.string().nullable().optional(),
  created_at: z.string().optional(),
})

const UserCapabilityUpdateResponseSchema = z.object({
  user: z.unknown(),
  capabilitiesUpdated: z.boolean(),
})

export interface AdminSubjectScope {
  id: string
  admin_user_id: string
  subject_id: string
  can_manage_content: boolean
  can_manage_pricing: boolean
  created_by?: string | null
  created_at?: string
}

export interface TeacherSubjectScope {
  id: string
  teacher_user_id: string
  subject_id: string
  status: 'active' | 'blocked' | 'pending'
  approved_by?: string | null
  created_at?: string
}

export const scopeService = {
  updateUserCapabilities: async (userId: string, payload: { canTeach?: boolean; canBuy?: boolean; canLearn?: boolean }) => {
    return api.patch(`/admin/users/${encodeURIComponent(userId)}/capabilities`, payload, resolveToken(), UserCapabilityUpdateResponseSchema)
  },

  listAdminScopes: async (query?: { userId?: string; subjectId?: string }) => {
    const params = new URLSearchParams()
    if (query?.userId) params.set('userId', query.userId)
    if (query?.subjectId) params.set('subjectId', query.subjectId)
    const suffix = params.toString()
    return api.get(`/admin/subject-scopes/admins${suffix ? `?${suffix}` : ''}`, resolveToken(), z.array(AdminScopeSchema))
  },

  assignAdminScope: async (payload: { adminUserId: string; subjectId: string; canManageContent?: boolean; canManagePricing?: boolean }) => {
    return api.post('/admin/subject-scopes/admins', payload, resolveToken(), z.object({ scope: AdminScopeSchema, assigned: z.boolean() }))
  },

  revokeAdminScope: async (scopeId: string) => {
    return api.delete(`/admin/subject-scopes/admins/${encodeURIComponent(scopeId)}`, resolveToken(), z.object({ removed: z.boolean(), scopeId: z.string() }))
  },

  listTeacherScopes: async (query?: { userId?: string; subjectId?: string; status?: 'active' | 'blocked' | 'pending' }) => {
    const params = new URLSearchParams()
    if (query?.userId) params.set('userId', query.userId)
    if (query?.subjectId) params.set('subjectId', query.subjectId)
    if (query?.status) params.set('status', query.status)
    const suffix = params.toString()
    return api.get(`/admin/subject-scopes/teachers${suffix ? `?${suffix}` : ''}`, resolveToken(), z.array(TeacherScopeSchema))
  },

  assignTeacherScope: async (payload: { teacherUserId: string; subjectId: string; status?: 'active' | 'blocked' | 'pending' }) => {
    return api.post('/admin/subject-scopes/teachers', payload, resolveToken(), z.object({ scope: TeacherScopeSchema, assigned: z.boolean() }))
  },

  revokeTeacherScope: async (scopeId: string) => {
    return api.delete(`/admin/subject-scopes/teachers/${encodeURIComponent(scopeId)}`, resolveToken(), z.object({ removed: z.boolean(), scopeId: z.string() }))
  },
}

export default scopeService
