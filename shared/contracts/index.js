let z
try {
  ;({ z } = require('zod'))
} catch (error) {
  try {
    ;({ z } = require('../../server/node_modules/zod'))
  } catch (fallbackError) {
    throw error
  }
}

const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string().optional(),
    details: z.unknown().optional(),
  }),
})

const SuccessEnvelopeSchema = (payloadSchema) => z.object({
  data: payloadSchema,
  meta: z.record(z.unknown()).optional(),
})

const PublicUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  avatar: z.string().optional().nullable(),
  role: z.enum(['student', 'admin', 'superadmin']).optional(),
  capabilities: z.object({
    canTeach: z.boolean().optional(),
    canBuy: z.boolean().optional(),
    canLearn: z.boolean().optional(),
  }).optional(),
  createdAt: z.union([z.string(), z.number()]).optional(),
})

const AuthPayloadSchema = z.object({
  token: z.string(),
  user: PublicUserSchema,
  requiresPasswordSetup: z.boolean().optional(),
})

const RegisterRequestSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).max(200).optional(),
}).strict()

const LoginRequestSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(1).max(200).optional(),
}).strict()

const GoogleAuthRequestSchema = z.object({
  idToken: z.string().min(1),
}).strict()

const UZ_PHONE_REGEX = /^\+998\d{9}$/
const OTP_CODE_REGEX = /^\d{6}$/
const PASSWORD_HAS_LETTER_REGEX = /[A-Za-z]/
const PASSWORD_HAS_NUMBER_REGEX = /\d/

const PasswordSchema = z
  .string()
  .min(8)
  .max(128)
  .refine((value) => PASSWORD_HAS_LETTER_REGEX.test(value), {
    message: 'Password must contain at least one letter',
  })
  .refine((value) => PASSWORD_HAS_NUMBER_REGEX.test(value), {
    message: 'Password must contain at least one number',
  })

const NameSchema = z.string().trim().min(1).max(80)
const PhoneSchema = z.string().regex(UZ_PHONE_REGEX, 'Phone must match +998XXXXXXXXX')
const OtpCodeSchema = z.string().regex(OTP_CODE_REGEX, 'Code must be 6 digits')

const PhoneRequestCodeSchema = z.object({
  phone: PhoneSchema,
}).strict()

const PhoneVerifyCodeSchema = z.object({
  phone: PhoneSchema,
  code: OtpCodeSchema,
  mode: z.enum(['login', 'signup']).optional(),
  name: z.string().min(1).max(120).optional(),
}).strict()

const SignupRequestCodeSchema = z.object({
  phone: PhoneSchema,
}).strict()

const SignupConfirmSchema = z.object({
  firstName: NameSchema,
  lastName: NameSchema,
  phone: PhoneSchema,
  password: PasswordSchema,
  code: OtpCodeSchema,
}).strict()

const LoginWithPasswordSchema = z.object({
  phone: PhoneSchema,
  password: z.string().min(1).max(128),
}).strict()

const LegacyLoginOtpRequestCodeSchema = z.object({
  phone: PhoneSchema,
}).strict()

const LegacyLoginOtpConfirmSchema = z.object({
  phone: PhoneSchema,
  code: OtpCodeSchema,
}).strict()

const PasswordResetRequestCodeSchema = z.object({
  phone: PhoneSchema,
}).strict()

const PasswordResetConfirmCodeSchema = z.object({
  phone: PhoneSchema,
  code: OtpCodeSchema,
}).strict()

const PasswordResetCompleteSchema = z.object({
  phone: PhoneSchema,
  resetToken: z.string().min(1),
  newPassword: PasswordSchema,
}).strict()

const PasswordSetupCompleteSchema = z.object({
  newPassword: PasswordSchema,
}).strict()

const OtpRequestCodeResponseSchema = z.object({
  sent: z.boolean(),
  phone: PhoneSchema,
  ttlSec: z.number().int().positive(),
  resendCooldownSec: z.number().int().positive(),
})

const PasswordResetConfirmCodeResponseSchema = z.object({
  verified: z.boolean(),
  resetToken: z.string().min(1),
  resetTokenTtlSec: z.number().int().positive(),
})

const ProfileUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  avatar: z.string().url().or(z.literal('')).optional(),
}).strict()

const TopicProgressPatchSchema = z.object({
  status: z.enum(['locked', 'inprogress', 'onhold', 'completed']).optional(),
  videoWatched: z.boolean().optional(),
  quizScore: z.number().int().nonnegative().nullable().optional(),
  quizAnswers: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).or(z.record(z.any())).optional(),
  quizSubmitted: z.boolean().optional(),
  masteryScore: z.number().int().nonnegative().nullable().optional(),
  quizAttempts: z.number().int().nonnegative().optional(),
  quizTotalQuestions: z.number().int().nonnegative().optional(),
  timeOnTaskSec: z.number().int().nonnegative().optional(),
  resumeQuestionIndex: z.number().int().nonnegative().optional(),
  lastActivityAt: z.number().int().optional(),
  completedAt: z.number().int().nullable().optional(),
}).strict()

const ProgressTopicParamsSchema = z.object({
  subjectId: z.string().min(1),
  topicId: z.string().min(1),
}).strict()

const SubjectPathParamsSchema = z.object({
  id: z.string().min(1),
}).strict()

const AdminUserPathParamsSchema = z.object({
  userId: z.string().uuid(),
}).strict()

const AdminRoleEnumSchema = z.enum(['student', 'admin', 'superadmin'])
const AdminSourceEnumSchema = z.enum(['none', 'allowlist', 'db_role', 'both'])

const AdminIdentitySchema = z.object({
  userId: z.string().uuid().optional(),
  email: z.string().email().optional(),
  phone: PhoneSchema.optional(),
}).strict().refine(
  (value) => Boolean(value.userId || value.email || value.phone),
  { message: 'Provide userId, email, or phone' },
)

const AdminRoleUpdateSchema = z.object({
  role: AdminRoleEnumSchema,
}).strict()

const AdminGrantSchema = AdminIdentitySchema
const AdminRevokeSchema = AdminIdentitySchema

const OptionalContentUrlSchema = z.preprocess((value) => {
  if (value == null) return undefined
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}, z.string().min(1).optional())

const SubjectQuestionSchema = z.object({
  id: z.number().int().positive().optional(),
  text: z.string().trim().min(1),
  imageUrl: OptionalContentUrlSchema,
  options: z.array(z.string().trim().min(1)).min(2),
  answer: z.number().int().nonnegative(),
  concept: z.string().trim().min(1).optional(),
}).superRefine((value, ctx) => {
  if (value.answer >= value.options.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Answer index must be within options range',
      path: ['answer'],
    })
  }
})

const SubjectTopicSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1),
  videoId: z.string().trim().min(1),
  videoUrl: OptionalContentUrlSchema,
  questions: z.array(SubjectQuestionSchema).default([]),
}).strict()

const SubjectTopicCreateSchema = SubjectTopicSchema

const SubjectTopicUpdateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  videoId: z.string().trim().min(1).optional(),
  videoUrl: OptionalContentUrlSchema,
  questions: z.array(SubjectQuestionSchema).optional(),
}).strict().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one field must be provided' },
)

const SubjectTopicPathParamsSchema = z.object({
  id: z.string().min(1),
  topicId: z.string().min(1),
}).strict()

const SubjectTopicsReorderSchema = z.object({
  topicIds: z.array(z.string().min(1)).min(1),
}).strict()

const SubjectCreateBaseSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  order: z.number().int().optional(),
  topics: z.array(SubjectTopicSchema).optional(),
}).strict()

const SubjectCreateSchema = SubjectCreateBaseSchema.superRefine((value, ctx) => {
  if (!value.topics) return
  const topicIds = value.topics.map((topic) => topic.id)
  if (new Set(topicIds).size !== topicIds.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Topic IDs must be unique within a subject',
      path: ['topics'],
    })
  }
})

const SubjectUpdateSchema = SubjectCreateBaseSchema.partial().superRefine((value, ctx) => {
  if (Object.keys(value).length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'At least one field must be provided',
    })
    return
  }

  if (!value.topics) return
  const topicIds = value.topics.map((topic) => topic.id)
  if (new Set(topicIds).size !== topicIds.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Topic IDs must be unique within a subject',
      path: ['topics'],
    })
  }
})

const DateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)

const AnalyticsGranularitySchema = z.enum(['day', 'week', 'month'])
const AnalyticsMetricSchema = z.enum([
  'user_growth',
  'active_users',
  'completion_trend',
  'quiz_score_trend',
])
const AnalyticsBreakdownTypeSchema = z.enum(['subject', 'auth_source', 'quiz_distribution'])

const AdminAnalyticsSummaryQuerySchema = z.object({
  from: DateOnlySchema.optional(),
  to: DateOnlySchema.optional(),
  subjectId: z.string().min(1).optional(),
}).strict()

const AdminAnalyticsTimeseriesQuerySchema = z.object({
  from: DateOnlySchema.optional(),
  to: DateOnlySchema.optional(),
  subjectId: z.string().min(1).optional(),
  metric: AnalyticsMetricSchema.default('active_users'),
  granularity: AnalyticsGranularitySchema.default('day'),
}).strict()

const AdminAnalyticsBreakdownQuerySchema = z.object({
  from: DateOnlySchema.optional(),
  to: DateOnlySchema.optional(),
  subjectId: z.string().min(1).optional(),
  type: AnalyticsBreakdownTypeSchema.default('subject'),
}).strict()

const PlanKeySchema = z.enum(['free', 'pro', 'premium'])

const BillingPlanUpdateSchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240).default(''),
  priceMonthlyUzs: z.number().nonnegative(),
  isActive: z.boolean().default(true),
  features: z.array(z.string().trim().min(1)).default([]),
}).strict()

const BillingPlanPathParamsSchema = z.object({
  planKey: PlanKeySchema,
}).strict()

const BillingCoursePriceUpdateSchema = z.object({
  subjectId: z.string().trim().min(1),
  subjectTitle: z.string().trim().default(''),
  priceUzs: z.number().nonnegative(),
  isActive: z.boolean().default(true),
}).strict()

const BillingCoursePathParamsSchema = z.object({
  subjectId: z.string().trim().min(1),
}).strict()

const BillingFinanceSummaryQuerySchema = z.object({
  from: DateOnlySchema.optional(),
  to: DateOnlySchema.optional(),
}).strict()

const DemoBootstrapSchema = z.object({
  subjectId: z.string().min(1).optional(),
  force: z.boolean().default(false),
}).strict()

const UserCapabilitiesSchema = z.object({
  canTeach: z.boolean().default(false),
  canBuy: z.boolean().default(true),
  canLearn: z.boolean().default(true),
}).strict()

const UserCapabilitiesUpdateSchema = z.object({
  canTeach: z.boolean().optional(),
  canBuy: z.boolean().optional(),
  canLearn: z.boolean().optional(),
}).strict().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one capability field must be provided' },
)

const ScopeIdParamsSchema = z.object({
  scopeId: z.string().uuid(),
}).strict()

const UserIdPathParamsSchema = z.object({
  userId: z.string().uuid(),
}).strict()

const SubjectScopeQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  subjectId: z.string().min(1).optional(),
  status: z.enum(['active', 'blocked', 'pending']).optional(),
}).strict()

const AdminSubjectScopeSchema = z.object({
  adminUserId: z.string().uuid(),
  subjectId: z.string().min(1),
  canManageContent: z.boolean().default(true),
  canManagePricing: z.boolean().default(false),
}).strict()

const TeacherSubjectScopeSchema = z.object({
  teacherUserId: z.string().uuid(),
  subjectId: z.string().min(1),
  status: z.enum(['active', 'blocked', 'pending']).default('active'),
}).strict()

const FIXED_EXAM_DURATION_SEC = 120 * 60
const FIXED_EXAM_PASS_PERCENT = 80
const DEFAULT_REQUIRED_QUESTION_COUNT = 50
const AllowedQuestionCountSchema = z.union([z.literal(35), z.literal(50)])

const ExamStatusSchema = z.enum(['draft', 'pending_review', 'published', 'archived'])
const ExamDifficultySchema = z.enum(['easy', 'medium', 'hard']).optional()

const ExamQuestionCreateSchema = z.object({
  id: z.string().uuid().optional(),
  blockOrder: z.number().int().positive().optional(),
  questionOrder: z.number().int().positive().optional(),
  promptText: z.string().trim().min(1),
  promptRich: z.record(z.any()).optional(),
  imageUrl: OptionalContentUrlSchema,
  options: z.array(z.string().trim().min(1)).min(2),
  correctIndex: z.number().int().nonnegative(),
  keyVerified: z.boolean().default(true),
  explanation: z.string().trim().optional(),
  difficulty: ExamDifficultySchema,
  sourceRef: z.string().trim().optional(),
}).superRefine((value, ctx) => {
  if (value.correctIndex >= value.options.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'correctIndex must be within options range',
      path: ['correctIndex'],
    })
  }
})

const ExamBlockCreateSchema = z.object({
  blockOrder: z.number().int().positive(),
  title: z.string().trim().min(1),
}).strict()

const ExamCreateSchema = z.object({
  subjectId: z.string().min(1),
  title: z.string().trim().min(1),
  description: z.string().max(2000).optional(),
  durationSec: z.literal(FIXED_EXAM_DURATION_SEC).default(FIXED_EXAM_DURATION_SEC),
  passPercent: z.literal(FIXED_EXAM_PASS_PERCENT).default(FIXED_EXAM_PASS_PERCENT),
  requiredQuestionCount: AllowedQuestionCountSchema.default(DEFAULT_REQUIRED_QUESTION_COUNT),
  priceUzs: z.number().nonnegative().default(0),
  blocks: z.array(ExamBlockCreateSchema).optional(),
  questions: z.array(ExamQuestionCreateSchema).optional(),
}).strict()

const ExamUpdateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().max(2000).optional(),
  durationSec: z.literal(FIXED_EXAM_DURATION_SEC).optional(),
  passPercent: z.literal(FIXED_EXAM_PASS_PERCENT).optional(),
  requiredQuestionCount: AllowedQuestionCountSchema.optional(),
  priceUzs: z.number().nonnegative().optional(),
  isActive: z.boolean().optional(),
  blocks: z.array(ExamBlockCreateSchema).optional(),
  questions: z.array(ExamQuestionCreateSchema).optional(),
}).strict().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one exam field must be provided' },
)

const ExamPathParamsSchema = z.object({
  examId: z.string().uuid(),
}).strict()

const ExamCatalogQuerySchema = z.object({
  subjectId: z.string().min(1).optional(),
}).strict()

const PaymentProviderSchema = z.enum(['payme', 'click', 'manual'])

const ExamCheckoutIntentSchema = z.object({
  provider: PaymentProviderSchema,
  attempts: z.number().int().positive().max(20).default(1),
}).strict()

const ExamAttemptPathParamsSchema = z.object({
  attemptId: z.string().uuid(),
}).strict()

const ExamAttemptAnswerSchema = z.object({
  questionId: z.string().uuid(),
  selectedIndex: z.number().int().nonnegative(),
}).strict()

const ExamQuestionPathParamsSchema = z.object({
  examId: z.string().uuid(),
  questionId: z.string().uuid(),
}).strict()

const ExamQuestionKeyUpdateSchema = z.object({
  correctIndex: z.number().int().nonnegative(),
  keyVerified: z.boolean().default(true),
}).strict()

const MaterialPackStatusSchema = z.enum(['draft', 'pending_review', 'published', 'archived'])

const MaterialPackCreateSchema = z.object({
  subjectId: z.string().min(1),
  title: z.string().trim().min(1),
  description: z.string().max(2000).optional(),
  priceUzs: z.number().nonnegative().default(0),
}).strict()

const MaterialPackUpdateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().max(2000).optional(),
  priceUzs: z.number().nonnegative().optional(),
  isActive: z.boolean().optional(),
}).strict().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one material pack field must be provided' },
)

const MaterialPackPathParamsSchema = z.object({
  packId: z.string().uuid(),
}).strict()

const MaterialCatalogQuerySchema = z.object({
  subjectId: z.string().min(1).optional(),
}).strict()

const MaterialCheckoutIntentSchema = z.object({
  provider: PaymentProviderSchema,
}).strict()

const ReviewRejectSchema = z.object({
  archive: z.boolean().default(false),
}).strict()

const ContentUploadSourceSchema = z.enum(['docx', 'pdf'])

const ExamImportCreateSchema = z.object({
  subjectId: z.string().min(1),
  title: z.string().trim().min(1),
  description: z.string().max(2000).optional(),
  requiredQuestionCount: AllowedQuestionCountSchema.default(35),
  sourceType: ContentUploadSourceSchema,
  sourcePath: z.string().min(1),
}).strict()

const ImportJobPathParamsSchema = z.object({
  jobId: z.string().uuid(),
}).strict()

const WebhookAckSchema = z.object({
  externalId: z.string().min(1),
  status: z.enum(['pending', 'paid', 'failed', 'refunded']),
}).passthrough()

const PaymentPathParamsSchema = z.object({
  paymentId: z.string().uuid(),
}).strict()

const PaymentSessionStartSchema = z.object({
  payerName: z.string().trim().min(2).max(120),
  payerPhone: z.string().trim().min(5).max(40),
  payerEmail: z.string().trim().email().optional(),
  returnUrl: z.string().trim().max(1000).optional(),
  cancelUrl: z.string().trim().max(1000).optional(),
  note: z.string().trim().max(500).optional(),
}).strict()

module.exports = {
  ErrorEnvelopeSchema,
  SuccessEnvelopeSchema,
  PublicUserSchema,
  AuthPayloadSchema,
  RegisterRequestSchema,
  LoginRequestSchema,
  GoogleAuthRequestSchema,
  PasswordSchema,
  NameSchema,
  PhoneSchema,
  OtpCodeSchema,
  PhoneRequestCodeSchema,
  PhoneVerifyCodeSchema,
  SignupRequestCodeSchema,
  SignupConfirmSchema,
  LoginWithPasswordSchema,
  LegacyLoginOtpRequestCodeSchema,
  LegacyLoginOtpConfirmSchema,
  PasswordResetRequestCodeSchema,
  PasswordResetConfirmCodeSchema,
  PasswordResetCompleteSchema,
  PasswordSetupCompleteSchema,
  OtpRequestCodeResponseSchema,
  PasswordResetConfirmCodeResponseSchema,
  ProfileUpdateSchema,
  TopicProgressPatchSchema,
  ProgressTopicParamsSchema,
  SubjectPathParamsSchema,
  AdminUserPathParamsSchema,
  AdminRoleEnumSchema,
  AdminSourceEnumSchema,
  AdminIdentitySchema,
  AdminRoleUpdateSchema,
  AdminGrantSchema,
  AdminRevokeSchema,
  SubjectQuestionSchema,
  SubjectTopicSchema,
  SubjectTopicCreateSchema,
  SubjectTopicUpdateSchema,
  SubjectTopicPathParamsSchema,
  SubjectTopicsReorderSchema,
  SubjectCreateSchema,
  SubjectUpdateSchema,
  DateOnlySchema,
  AnalyticsGranularitySchema,
  AnalyticsMetricSchema,
  AnalyticsBreakdownTypeSchema,
  AdminAnalyticsSummaryQuerySchema,
  AdminAnalyticsTimeseriesQuerySchema,
  AdminAnalyticsBreakdownQuerySchema,
  PlanKeySchema,
  BillingPlanUpdateSchema,
  BillingPlanPathParamsSchema,
  BillingCoursePriceUpdateSchema,
  BillingCoursePathParamsSchema,
  BillingFinanceSummaryQuerySchema,
  DemoBootstrapSchema,
  UserCapabilitiesSchema,
  UserCapabilitiesUpdateSchema,
  UserIdPathParamsSchema,
  ScopeIdParamsSchema,
  SubjectScopeQuerySchema,
  AdminSubjectScopeSchema,
  TeacherSubjectScopeSchema,
  ExamStatusSchema,
  ExamQuestionCreateSchema,
  ExamBlockCreateSchema,
  ExamCreateSchema,
  ExamUpdateSchema,
  ExamPathParamsSchema,
  ExamCatalogQuerySchema,
  PaymentProviderSchema,
  ExamCheckoutIntentSchema,
  ExamAttemptPathParamsSchema,
  ExamAttemptAnswerSchema,
  ExamQuestionPathParamsSchema,
  ExamQuestionKeyUpdateSchema,
  MaterialPackStatusSchema,
  MaterialPackCreateSchema,
  MaterialPackUpdateSchema,
  MaterialPackPathParamsSchema,
  MaterialCatalogQuerySchema,
  MaterialCheckoutIntentSchema,
  ReviewRejectSchema,
  ExamImportCreateSchema,
  ImportJobPathParamsSchema,
  WebhookAckSchema,
  PaymentPathParamsSchema,
  PaymentSessionStartSchema,
}
