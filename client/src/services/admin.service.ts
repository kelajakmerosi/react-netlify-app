import { z } from 'zod'
import api from './api'
import { tokenStore } from './auth.service'
import { SubjectSectionSchema } from '@shared/contracts'

export type AdminSource = 'none' | 'allowlist' | 'db_role' | 'both'

export interface SubjectSectionRecord {
  id: string
  type: 'attestation' | 'general' | 'milliy'
  title: string
  topicIds?: string[]
  comingSoon?: boolean
}

export interface AdminUserSummary {
  id: string
  name: string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  role?: 'student' | 'admin' | 'superadmin'
  capabilities?: {
    canTeach?: boolean
    canBuy?: boolean
    canLearn?: boolean
  }
  dbRole?: 'student' | 'admin' | 'superadmin'
  adminSource?: AdminSource
  phoneVerified?: boolean
  isSuspended?: boolean
  createdAt?: string | number
}

export interface UserTransaction {
  id: string
  userId: string
  paymentType: string
  planKey?: string | null
  subjectId?: string | null
  amountUzs: number
  provider: string
  status: string
  externalId: string
  paidAt?: string | null
  createdAt: string
}

export interface UserExamAttempt {
  id: string
  examId: string
  examTitle?: string | null
  status: string
  startedAt: string
  submittedAt?: string | null
  scorePercent?: number
  passed?: boolean
}

export interface UserCompletedSubject {
  id: string
  title: string
  lastCompletedAt: string
}

export interface UserAuditProfile {
  profile: AdminUserSummary
  transactions: UserTransaction[]
  exams: UserExamAttempt[]
  completedSubjects: UserCompletedSubject[]
}

export interface SystemInfo {
  uptime?: string
  version?: string
  env?: string
  googleConfigured?: boolean
  eskizConfigured?: boolean
  adminAccess?: {
    emailCount?: number
    phoneCount?: number
    superAdminEmailCount?: number
    superAdminPhoneCount?: number
  }
}

export interface SubjectQuestion {
  id?: number
  text: string
  imageUrl?: string | null
  options: string[]
  answer: number
  concept?: string
}

export interface SubjectTopic {
  id: string
  title: string
  videoId: string
  videoUrl?: string | null
  questions?: SubjectQuestion[]
}

export interface SubjectRecord {
  id: string
  catalogKey?: string | null
  catalog_key?: string | null
  title: string
  description?: string | null
  icon?: string | null
  color?: string | null
  imageUrl?: string | null
  image_url?: string | null
  order?: number
  topics?: SubjectTopic[]
  sections?: SubjectSectionRecord[]
  isHidden?: boolean
  is_hidden?: boolean
  created_at?: string
  updated_at?: string
}

export interface AnalyticsSummary {
  totalUsers: number
  dau: number
  wau: number
  mau: number
  trackedTopics: number
  completedTopics: number
  completionRate: number
  avgQuizScore: number
  authSources: Array<{ source: string; value: number }>
  range: { from: string; to: string }
}

export interface AnalyticsTimeseries {
  metric: string
  granularity: 'day' | 'week' | 'month'
  points: Array<{ bucket: string; value: number }>
  range: { from: string; to: string }
}

export interface AnalyticsBreakdownItem {
  label: string
  value?: number
  completed?: number
  total?: number
  completionRate?: number
}

export interface AnalyticsBreakdown {
  type: 'subject' | 'auth_source' | 'quiz_distribution'
  items: AnalyticsBreakdownItem[]
  range: { from: string; to: string }
}

export interface PricingPlan {
  key: 'free' | 'pro' | 'premium'
  title: string
  description?: string
  priceMonthlyUzs: number
  isActive: boolean
  features: string[]
  updatedAt?: string
}

export interface CoursePrice {
  id: string
  subjectId: string
  subjectTitle?: string | null
  priceUzs: number
  isActive: boolean
  updatedAt?: string
}

export interface PricingCatalog {
  plans: PricingPlan[]
  coursePrices: CoursePrice[]
}

export interface FinanceSummary {
  totalRevenueUzs: number
  refundedUzs: number
  paidCount: number
  failedCount: number
  subscriptionPaidCount: number
  coursePaidCount: number
  byProvider: Array<{ provider: string; count: number; revenueUzs: number }>
  byType: Array<{ type: string; paidCount: number; revenueUzs: number }>
  dailyRevenue: Array<{ bucket: string; revenueUzs: number }>
  range: { from: string; to: string }
}

export interface DemoBootstrapResult {
  seeded: boolean
  subject: {
    id: string
    title: string
  }
  exam: {
    id: string
    title: string
    status: string
    requiredQuestionCount: number
  }
  materialPack: {
    id: string
    title: string
    status: string
  }
}

const SystemInfoSchema = z.object({
  uptime: z.string().optional(),
  version: z.string().optional(),
  env: z.string().optional(),
  googleConfigured: z.boolean().optional(),
  eskizConfigured: z.boolean().optional(),
  adminAccess: z.object({
    emailCount: z.number().optional(),
    phoneCount: z.number().optional(),
    superAdminEmailCount: z.number().optional(),
    superAdminPhoneCount: z.number().optional(),
  }).optional(),
})

const AdminUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  role: z.enum(['student', 'admin', 'superadmin']).default('student'),
  capabilities: z.object({
    canTeach: z.boolean().optional(),
    canBuy: z.boolean().optional(),
    canLearn: z.boolean().optional(),
  }).optional(),
  dbRole: z.enum(['student', 'admin', 'superadmin']).optional(),
  adminSource: z.enum(['none', 'allowlist', 'db_role', 'both']).optional(),
  phoneVerified: z.boolean().optional(),
  isSuspended: z.boolean().optional(),
  createdAt: z.union([z.string(), z.number()]).optional(),
})

const OptionalContentUrlSchema = z.string().nullable().optional()

const SubjectQuestionSchema = z.object({
  id: z.number().int().optional(),
  text: z.string().min(1),
  imageUrl: OptionalContentUrlSchema,
  options: z.array(z.string()).min(2),
  answer: z.number().int().nonnegative(),
  concept: z.string().optional(),
})

const SubjectTopicSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  videoId: z.string().min(1),
  videoUrl: OptionalContentUrlSchema,
  questions: z.array(SubjectQuestionSchema).default([]),
})

const SubjectSchema = z.object({
  id: z.string().min(1),
  catalogKey: z.string().min(1).nullable().optional(),
  catalog_key: z.string().min(1).nullable().optional(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  imageUrl: OptionalContentUrlSchema,
  image_url: OptionalContentUrlSchema,
  order: z.number().int().optional(),
  topics: z.array(SubjectTopicSchema).default([]),
  sections: z.array(SubjectSectionSchema).default([]),
  isHidden: z.boolean().optional(),
  is_hidden: z.boolean().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

const AnalyticsSummarySchema = z.object({
  totalUsers: z.number().int(),
  dau: z.number().int(),
  wau: z.number().int(),
  mau: z.number().int(),
  trackedTopics: z.number().int(),
  completedTopics: z.number().int(),
  completionRate: z.number(),
  avgQuizScore: z.number(),
  authSources: z.array(z.object({
    source: z.string(),
    value: z.number().int(),
  })),
  range: z.object({
    from: z.string(),
    to: z.string(),
  }),
})

const AnalyticsTimeseriesSchema = z.object({
  metric: z.string(),
  granularity: z.enum(['day', 'week', 'month']),
  points: z.array(z.object({
    bucket: z.string(),
    value: z.number(),
  })),
  range: z.object({
    from: z.string(),
    to: z.string(),
  }),
})

const AnalyticsBreakdownSchema = z.object({
  type: z.enum(['subject', 'auth_source', 'quiz_distribution']),
  items: z.array(z.object({
    label: z.string(),
    value: z.number().optional(),
    completed: z.number().optional(),
    total: z.number().optional(),
    completionRate: z.number().optional(),
  })),
  range: z.object({
    from: z.string(),
    to: z.string(),
  }),
})

const PricingPlanSchema = z.object({
  key: z.enum(['free', 'pro', 'premium']),
  title: z.string(),
  description: z.string().optional(),
  priceMonthlyUzs: z.number(),
  isActive: z.boolean(),
  features: z.array(z.string()),
  updatedAt: z.string().optional(),
})

const CoursePriceSchema = z.object({
  id: z.string(),
  subjectId: z.string(),
  subjectTitle: z.string().nullable().optional(),
  priceUzs: z.number(),
  isActive: z.boolean(),
  updatedAt: z.string().optional(),
})

const PricingCatalogSchema = z.object({
  plans: z.array(PricingPlanSchema),
  coursePrices: z.array(CoursePriceSchema),
})

const FinanceSummarySchema = z.object({
  totalRevenueUzs: z.number(),
  refundedUzs: z.number(),
  paidCount: z.number().int(),
  failedCount: z.number().int(),
  subscriptionPaidCount: z.number().int(),
  coursePaidCount: z.number().int(),
  byProvider: z.array(z.object({
    provider: z.string(),
    count: z.number().int(),
    revenueUzs: z.number(),
  })),
  byType: z.array(z.object({
    type: z.string(),
    paidCount: z.number().int(),
    revenueUzs: z.number(),
  })),
  dailyRevenue: z.array(z.object({
    bucket: z.string(),
    revenueUzs: z.number(),
  })),
  range: z.object({
    from: z.string(),
    to: z.string(),
  }),
})

const DemoBootstrapSchema = z.object({
  seeded: z.boolean(),
  subject: z.object({
    id: z.string(),
    title: z.string(),
  }),
  exam: z.object({
    id: z.string(),
    title: z.string(),
    status: z.string(),
    requiredQuestionCount: z.number().int().positive(),
  }),
  materialPack: z.object({
    id: z.string(),
    title: z.string(),
    status: z.string(),
  }),
})

const resolveToken = () => tokenStore.get() ?? undefined

const withQuery = (path: string, query: Record<string, string | undefined>) => {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value) params.set(key, value)
  })
  const suffix = params.toString()
  return suffix ? `${path}?${suffix}` : path
}

const normalizeIdentity = (value: string): { email?: string; phone?: string } => {
  const raw = value.trim()
  if (!raw) return {}
  if (raw.includes('@')) return { email: raw.toLowerCase() }
  return { phone: raw.startsWith('+') ? raw : `+${raw.replace(/\D/g, '')}` }
}

export const adminService = {
  getSystemInfo: async (): Promise<SystemInfo> => {
    return api.get<SystemInfo>('/admin/info', resolveToken(), SystemInfoSchema)
  },

  getUsers: async (): Promise<AdminUserSummary[]> => {
    return api.get<AdminUserSummary[]>('/admin/users', resolveToken(), z.array(AdminUserSchema))
  },

  updateUserRole: async (userId: string, role: 'student' | 'admin' | 'superadmin'): Promise<AdminUserSummary> => {
    const payload = await api.patch<{ user: AdminUserSummary }>(
      `/admin/users/${userId}/role`,
      { role },
      resolveToken(),
      z.object({ user: AdminUserSchema, roleUpdated: z.boolean().optional() }),
    )
    return payload.user
  },

  grantAdmin: async (identity: string): Promise<AdminUserSummary> => {
    const payload = await api.post<{ user: AdminUserSummary }>(
      '/admin/admins/grant',
      normalizeIdentity(identity),
      resolveToken(),
      z.object({ user: AdminUserSchema, granted: z.boolean().optional() }),
    )
    return payload.user
  },

  revokeAdmin: async (identity: string): Promise<AdminUserSummary> => {
    const payload = await api.post<{ user: AdminUserSummary }>(
      '/admin/admins/revoke',
      normalizeIdentity(identity),
      resolveToken(),
      z.object({ user: AdminUserSchema, revoked: z.boolean().optional() }),
    )
    return payload.user
  },

  deleteUser: async (userId: string): Promise<{ selfDeleted: boolean }> => {
    return api.delete<{ deleted: boolean; userId: string; selfDeleted: boolean }>(`/admin/users/${userId}`, resolveToken())
  },

  getSubjects: async (): Promise<SubjectRecord[]> => {
    return api.get<SubjectRecord[]>('/subjects', resolveToken(), z.array(SubjectSchema))
  },

  createSubject: async (subject: Omit<SubjectRecord, 'id'>): Promise<SubjectRecord> => {
    return api.post<SubjectRecord>('/subjects', subject, resolveToken(), SubjectSchema)
  },

  updateSubject: async (subjectId: string, subject: Partial<Omit<SubjectRecord, 'id'>>): Promise<SubjectRecord> => {
    return api.put<SubjectRecord>(`/subjects/${subjectId}`, subject, resolveToken(), SubjectSchema)
  },

  deleteSubject: async (subjectId: string): Promise<void> => {
    await api.delete<{ deleted: boolean }>(`/subjects/${subjectId}`, resolveToken())
  },

  toggleSubjectVisibility: async (subjectId: string, isHidden: boolean): Promise<SubjectRecord> => {
    return api.put<SubjectRecord>(`/subjects/${subjectId}`, { is_hidden: isHidden }, resolveToken(), SubjectSchema)
  },

  createTopic: async (subjectId: string, topic: SubjectTopic): Promise<SubjectRecord> => {
    return api.post<SubjectRecord>(`/subjects/${subjectId}/topics`, topic, resolveToken(), SubjectSchema)
  },

  updateTopic: async (subjectId: string, topicId: string, topic: Partial<SubjectTopic>): Promise<SubjectRecord> => {
    return api.put<SubjectRecord>(`/subjects/${subjectId}/topics/${topicId}`, topic, resolveToken(), SubjectSchema)
  },

  deleteTopic: async (subjectId: string, topicId: string): Promise<SubjectRecord> => {
    return api.delete<SubjectRecord>(`/subjects/${subjectId}/topics/${topicId}`, resolveToken(), SubjectSchema)
  },

  reorderTopics: async (subjectId: string, topicIds: string[]): Promise<SubjectRecord> => {
    return api.patch<SubjectRecord>(`/subjects/${subjectId}/topics/reorder`, { topicIds }, resolveToken(), SubjectSchema)
  },

  getAnalyticsSummary: async (query: { from?: string; to?: string; subjectId?: string } = {}): Promise<AnalyticsSummary> => {
    return api.get<AnalyticsSummary>(
      withQuery('/admin/analytics/summary', query),
      resolveToken(),
      AnalyticsSummarySchema,
    )
  },

  getAnalyticsTimeseries: async (query: {
    from?: string
    to?: string
    subjectId?: string
    metric: 'user_growth' | 'active_users' | 'completion_trend' | 'quiz_score_trend'
    granularity?: 'day' | 'week' | 'month'
  }): Promise<AnalyticsTimeseries> => {
    return api.get<AnalyticsTimeseries>(
      withQuery('/admin/analytics/timeseries', query),
      resolveToken(),
      AnalyticsTimeseriesSchema,
    )
  },

  getAnalyticsBreakdown: async (query: {
    from?: string
    to?: string
    subjectId?: string
    type: 'subject' | 'auth_source' | 'quiz_distribution'
  }): Promise<AnalyticsBreakdown> => {
    return api.get<AnalyticsBreakdown>(
      withQuery('/admin/analytics/breakdowns', query),
      resolveToken(),
      AnalyticsBreakdownSchema,
    )
  },

  getPricingCatalog: async (): Promise<PricingCatalog> => {
    return api.get<PricingCatalog>('/admin/billing/pricing', resolveToken(), PricingCatalogSchema)
  },

  updatePricingPlan: async (
    planKey: 'free' | 'pro' | 'premium',
    payload: Omit<PricingPlan, 'key' | 'updatedAt'>,
  ): Promise<PricingPlan> => {
    const data = await api.put<{ plan: PricingPlan }>(
      `/admin/billing/plans/${planKey}`,
      payload,
      resolveToken(),
      z.object({ plan: PricingPlanSchema, updated: z.boolean().optional() }),
    )
    return data.plan
  },

  updateCoursePrice: async (
    subjectId: string,
    payload: { subjectId: string; subjectTitle?: string; priceUzs: number; isActive: boolean },
  ): Promise<CoursePrice> => {
    const data = await api.put<{ coursePrice: CoursePrice }>(
      `/admin/billing/courses/${subjectId}`,
      payload,
      resolveToken(),
      z.object({ coursePrice: CoursePriceSchema, updated: z.boolean().optional() }),
    )
    return data.coursePrice
  },

  getFinanceSummary: async (query: { from?: string; to?: string } = {}): Promise<FinanceSummary> => {
    return api.get<FinanceSummary>(
      withQuery('/admin/billing/finance-summary', query),
      resolveToken(),
      FinanceSummarySchema,
    )
  },

  bootstrapDemoDataset: async (
    payload: { subjectId?: string; force?: boolean } = {},
  ): Promise<DemoBootstrapResult> => {
    return api.post<DemoBootstrapResult>('/admin/demo/bootstrap', payload, resolveToken(), DemoBootstrapSchema)
  },

  getUserAudit: async (userId: string): Promise<UserAuditProfile> => {
    return api.get<UserAuditProfile>(`/admin/users/${userId}/audit`, resolveToken())
  },

  updateUserProfile: async (
    userId: string,
    payload: { firstName?: string; lastName?: string; email?: string; phone?: string }
  ): Promise<AdminUserSummary> => {
    const data = await api.patch<{ profile: AdminUserSummary }>(`/admin/users/${userId}/profile`, payload, resolveToken())
    return data.profile
  },

  toggleUserSuspension: async (userId: string, isSuspended: boolean): Promise<AdminUserSummary> => {
    const data = await api.patch<{ profile: AdminUserSummary }>(`/admin/users/${userId}/suspend`, { isSuspended }, resolveToken())
    return data.profile
  },
}

export default adminService
