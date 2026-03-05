const { Router } = require('express')
const {
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
} = require('../controllers/admin.controller')
const {
  updateUserCapabilities,
  listAdminSubjectScopes,
  assignAdminSubjectScope,
  revokeAdminSubjectScope,
  listTeacherSubjectScopes,
  assignTeacherSubjectScope,
  revokeTeacherSubjectScope,
} = require('../controllers/scope.controller')
const { approveExam, rejectExam } = require('../controllers/exam.controller')
const { approveMaterialPack, rejectMaterialPack } = require('../controllers/material.controller')
const { protect, adminOnly, superAdminOnly } = require('../middleware/auth.middleware')
const { validateBody, validateParams, validateQuery } = require('../middleware/validate.middleware')
const {
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
} = require('../../../shared/contracts')

const router = Router()

router.get('/info', protect, adminOnly, getSystemInfo)
router.get('/users', protect, superAdminOnly, getAdminUsers)
router.patch('/users/:userId/role', protect, superAdminOnly, validateParams(AdminUserPathParamsSchema), validateBody(AdminRoleUpdateSchema), updateUserRole)
router.delete('/users/:userId', protect, superAdminOnly, validateParams(AdminUserPathParamsSchema), deleteAdminUser)
router.post('/admins/grant', protect, superAdminOnly, validateBody(AdminGrantSchema), grantAdmin)
router.post('/admins/revoke', protect, superAdminOnly, validateBody(AdminRevokeSchema), revokeAdmin)
router.get('/analytics/summary', protect, adminOnly, validateQuery(AdminAnalyticsSummaryQuerySchema), getAnalyticsSummary)
router.get('/analytics/timeseries', protect, adminOnly, validateQuery(AdminAnalyticsTimeseriesQuerySchema), getAnalyticsTimeseries)
router.get('/analytics/breakdowns', protect, adminOnly, validateQuery(AdminAnalyticsBreakdownQuerySchema), getAnalyticsBreakdowns)
router.get('/billing/pricing', protect, adminOnly, getPricingCatalog)
router.put('/billing/plans/:planKey', protect, superAdminOnly, validateParams(BillingPlanPathParamsSchema), validateBody(BillingPlanUpdateSchema), updatePricingPlan)
router.put('/billing/courses/:subjectId', protect, superAdminOnly, validateParams(BillingCoursePathParamsSchema), validateBody(BillingCoursePriceUpdateSchema), upsertCoursePricing)
router.get('/billing/finance-summary', protect, superAdminOnly, validateQuery(BillingFinanceSummaryQuerySchema), getFinanceSummary)
router.patch('/users/:userId/capabilities', protect, superAdminOnly, validateParams(UserIdPathParamsSchema), validateBody(UserCapabilitiesUpdateSchema), updateUserCapabilities)
router.get('/subject-scopes/admins', protect, superAdminOnly, validateQuery(SubjectScopeQuerySchema), listAdminSubjectScopes)
router.post('/subject-scopes/admins', protect, superAdminOnly, validateBody(AdminSubjectScopeSchema), assignAdminSubjectScope)
router.delete('/subject-scopes/admins/:scopeId', protect, superAdminOnly, validateParams(ScopeIdParamsSchema), revokeAdminSubjectScope)
router.get('/subject-scopes/teachers', protect, superAdminOnly, validateQuery(SubjectScopeQuerySchema), listTeacherSubjectScopes)
router.post('/subject-scopes/teachers', protect, superAdminOnly, validateBody(TeacherSubjectScopeSchema), assignTeacherSubjectScope)
router.delete('/subject-scopes/teachers/:scopeId', protect, superAdminOnly, validateParams(ScopeIdParamsSchema), revokeTeacherSubjectScope)
router.post('/exams/:examId/approve', protect, adminOnly, validateParams(ExamPathParamsSchema), approveExam)
router.post('/exams/:examId/reject', protect, adminOnly, validateParams(ExamPathParamsSchema), validateBody(ReviewRejectSchema), rejectExam)
router.post('/material-packs/:packId/approve', protect, adminOnly, validateParams(MaterialPackPathParamsSchema), approveMaterialPack)
router.post('/material-packs/:packId/reject', protect, adminOnly, validateParams(MaterialPackPathParamsSchema), validateBody(ReviewRejectSchema), rejectMaterialPack)
router.post('/demo/bootstrap', protect, adminOnly, validateBody(DemoBootstrapSchema), bootstrapDemoDataset)

module.exports = router
