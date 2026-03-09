import { Router } from 'express'
import {
  getSystemInfo,
  getAdminUsers,
  updateUserRole,
  deleteAdminUser,
  grantAdmin,
  revokeAdmin,
  getAnalyticsSummary,
  getAnalyticsTimeseries,
  getAnalyticsBreakdowns,
  getPricingCatalog,
  updatePricingPlan,
  upsertCoursePricing,
  getFinanceSummary,
  bootstrapDemoDataset,
  getUserAudit,
  updateUserProfile,
  suspendUser,
} from '../controllers/admin.controller'
import {
  updateUserCapabilities,
  listAdminSubjectScopes,
  assignAdminSubjectScope,
  revokeAdminSubjectScope,
  listTeacherSubjectScopes,
  assignTeacherSubjectScope,
  revokeTeacherSubjectScope,
} from '../controllers/scope.controller'
// @ts-ignore
import { approveExam, rejectExam } from '../controllers/exam.controller'
// @ts-ignore
import { approveMaterialPack, rejectMaterialPack } from '../controllers/material.controller'
import { protect, adminOnly, superAdminOnly } from '../middleware/auth.middleware'
import { validateBody, validateParams, validateQuery } from '../middleware/validate.middleware'
import {
  AdminUserPathParamsSchema,
  AdminRoleUpdateSchema,
  AdminGrantSchema,
  AdminRevokeSchema,
  AdminAnalyticsSummaryQuerySchema,
  AdminAnalyticsTimeseriesQuerySchema,
  AdminAnalyticsBreakdownQuerySchema,
  BillingPlanPathParamsSchema,
  BillingPlanUpdateSchema,
  BillingCoursePathParamsSchema,
  BillingCoursePriceUpdateSchema,
  BillingFinanceSummaryQuerySchema,
  DemoBootstrapSchema,
  UserIdPathParamsSchema,
  UserCapabilitiesUpdateSchema,
  SubjectScopeQuerySchema,
  AdminSubjectScopeSchema,
  TeacherSubjectScopeSchema,
  ScopeIdParamsSchema,
  ExamPathParamsSchema,
  MaterialPackPathParamsSchema,
  ReviewRejectSchema,
} from '../../../shared/contracts'

const router = Router()

router.get('/info', protect as any, adminOnly as any, getSystemInfo as any)
router.get('/users', protect as any, superAdminOnly as any, getAdminUsers as any)
router.get('/users/:userId/audit', protect as any, superAdminOnly as any, validateParams(AdminUserPathParamsSchema), getUserAudit as any)
router.patch('/users/:userId/profile', protect as any, superAdminOnly as any, validateParams(AdminUserPathParamsSchema), updateUserProfile as any)
router.patch('/users/:userId/suspend', protect as any, superAdminOnly as any, validateParams(AdminUserPathParamsSchema), suspendUser as any)
router.patch('/users/:userId/role', protect as any, superAdminOnly as any, validateParams(AdminUserPathParamsSchema), validateBody(AdminRoleUpdateSchema), updateUserRole as any)
router.delete('/users/:userId', protect as any, superAdminOnly as any, validateParams(AdminUserPathParamsSchema), deleteAdminUser as any)
router.post('/admins/grant', protect as any, superAdminOnly as any, validateBody(AdminGrantSchema), grantAdmin as any)
router.post('/admins/revoke', protect as any, superAdminOnly as any, validateBody(AdminRevokeSchema), revokeAdmin as any)
router.get('/analytics/summary', protect as any, adminOnly as any, validateQuery(AdminAnalyticsSummaryQuerySchema), getAnalyticsSummary as any)
router.get('/analytics/timeseries', protect as any, adminOnly as any, validateQuery(AdminAnalyticsTimeseriesQuerySchema), getAnalyticsTimeseries as any)
router.get('/analytics/breakdowns', protect as any, adminOnly as any, validateQuery(AdminAnalyticsBreakdownQuerySchema), getAnalyticsBreakdowns as any)
router.get('/billing/pricing', protect as any, adminOnly as any, getPricingCatalog as any)
router.put('/billing/plans/:planKey', protect as any, superAdminOnly as any, validateParams(BillingPlanPathParamsSchema), validateBody(BillingPlanUpdateSchema), updatePricingPlan as any)
router.put('/billing/courses/:subjectId', protect as any, superAdminOnly as any, validateParams(BillingCoursePathParamsSchema), validateBody(BillingCoursePriceUpdateSchema), upsertCoursePricing as any)
router.get('/billing/finance-summary', protect as any, superAdminOnly as any, validateQuery(BillingFinanceSummaryQuerySchema), getFinanceSummary as any)
router.patch('/users/:userId/capabilities', protect as any, superAdminOnly as any, validateParams(UserIdPathParamsSchema), validateBody(UserCapabilitiesUpdateSchema), updateUserCapabilities as any)
router.get('/subject-scopes/admins', protect as any, superAdminOnly as any, validateQuery(SubjectScopeQuerySchema), listAdminSubjectScopes as any)
router.post('/subject-scopes/admins', protect as any, superAdminOnly as any, validateBody(AdminSubjectScopeSchema), assignAdminSubjectScope as any)
router.delete('/subject-scopes/admins/:scopeId', protect as any, superAdminOnly as any, validateParams(ScopeIdParamsSchema), revokeAdminSubjectScope as any)
router.get('/subject-scopes/teachers', protect as any, superAdminOnly as any, validateQuery(SubjectScopeQuerySchema), listTeacherSubjectScopes as any)
router.post('/subject-scopes/teachers', protect as any, superAdminOnly as any, validateBody(TeacherSubjectScopeSchema), assignTeacherSubjectScope as any)
router.delete('/subject-scopes/teachers/:scopeId', protect as any, superAdminOnly as any, validateParams(ScopeIdParamsSchema), revokeTeacherSubjectScope as any)
router.post('/exams/:examId/approve', protect as any, adminOnly as any, validateParams(ExamPathParamsSchema), approveExam as any)
router.post('/exams/:examId/reject', protect as any, adminOnly as any, validateParams(ExamPathParamsSchema), validateBody(ReviewRejectSchema), rejectExam as any)
router.post('/material-packs/:packId/approve', protect as any, adminOnly as any, validateParams(MaterialPackPathParamsSchema), approveMaterialPack as any)
router.post('/material-packs/:packId/reject', protect as any, adminOnly as any, validateParams(MaterialPackPathParamsSchema), validateBody(ReviewRejectSchema), rejectMaterialPack as any)
router.post('/demo/bootstrap', protect as any, adminOnly as any, validateBody(DemoBootstrapSchema), bootstrapDemoDataset as any)

export default router
