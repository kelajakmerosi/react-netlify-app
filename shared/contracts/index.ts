import { z } from 'zod'

export const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string().optional(),
    details: z.unknown().optional(),
  }),
})

export const SuccessEnvelopeSchema = <T extends z.ZodTypeAny>(payloadSchema: T) => z.object({
  data: payloadSchema,
  meta: z.record(z.unknown()).optional(),
})

export const PublicUserSchema = z.object({
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

export const AuthPayloadSchema = z.object({
  token: z.string(),
  user: PublicUserSchema,
  requiresPasswordSetup: z.boolean().optional(),
})

export const RegisterRequestSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).max(200).optional(),
}).strict()

export const LoginRequestSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(1).max(200).optional(),
}).strict()

export const GoogleAuthRequestSchema = z.object({
  idToken: z.string().min(1),
}).strict()

export const GoogleAuthCodeRequestSchema = z.object({
  code: z.string().min(1),
  redirectUri: z.string().min(1),
}).strict()

export const UZ_PHONE_REGEX = /^\+998\d{9}$/
export const OTP_CODE_REGEX = /^\d{6}$/
export const PASSWORD_HAS_LETTER_REGEX = /[A-Za-z]/
export const PASSWORD_HAS_NUMBER_REGEX = /\d/

export const PasswordSchema = z
  .string()
  .min(8)
  .max(128)
  .refine((value) => PASSWORD_HAS_LETTER_REGEX.test(value), {
    message: 'Password must contain at least one letter',
  })
  .refine((value) => PASSWORD_HAS_NUMBER_REGEX.test(value), {
    message: 'Password must contain at least one number',
  })

export const NameSchema = z.string().trim().min(1).max(80)
export const PhoneSchema = z.string().regex(UZ_PHONE_REGEX, 'Phone must match +998XXXXXXXXX')
export const OtpCodeSchema = z.string().regex(OTP_CODE_REGEX, 'Code must be 6 digits')

export const PhoneRequestCodeSchema = z.object({
  phone: PhoneSchema,
}).strict()

export const PhoneVerifyCodeSchema = z.object({
  phone: PhoneSchema,
  code: OtpCodeSchema,
  mode: z.enum(['login', 'signup']).optional(),
  name: z.string().min(1).max(120).optional(),
}).strict()

export const SignupRequestCodeSchema = z.object({
  phone: PhoneSchema,
}).strict()

export const SignupConfirmSchema = z.object({
  firstName: NameSchema,
  lastName: NameSchema,
  phone: PhoneSchema,
  password: PasswordSchema,
  code: OtpCodeSchema,
}).strict()

export const LoginWithPasswordSchema = z.object({
  phone: PhoneSchema,
  password: z.string().min(1).max(128),
}).strict()

export const LegacyLoginOtpRequestCodeSchema = z.object({
  phone: PhoneSchema,
}).strict()

export const LegacyLoginOtpConfirmSchema = z.object({
  phone: PhoneSchema,
  code: OtpCodeSchema,
}).strict()

export const PasswordResetRequestCodeSchema = z.object({
  phone: PhoneSchema,
}).strict()

export const PasswordResetConfirmCodeSchema = z.object({
  phone: PhoneSchema,
  code: OtpCodeSchema,
}).strict()

export const PasswordResetCompleteSchema = z.object({
  phone: PhoneSchema,
  resetToken: z.string().min(1),
  newPassword: PasswordSchema,
}).strict()

export const PasswordSetupCompleteSchema = z.object({
  newPassword: PasswordSchema,
}).strict()

export const OtpRequestCodeResponseSchema = z.object({
  sent: z.boolean(),
  phone: PhoneSchema,
  ttlSec: z.number().int().positive(),
  resendCooldownSec: z.number().int().positive(),
})

export const PasswordResetConfirmCodeResponseSchema = z.object({
  verified: z.boolean(),
  resetToken: z.string().min(1),
  resetTokenTtlSec: z.number().int().positive(),
})

export const ProfileUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  avatar: z.string().url().or(z.literal('')).optional(),
}).strict()

export const TopicProgressPatchSchema = z.object({
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

export const ProgressTopicParamsSchema = z.object({
  subjectId: z.string().min(1),
  topicId: z.string().min(1),
}).strict()

export const SubjectPathParamsSchema = z.object({
  id: z.string().min(1),
}).strict()

export const AdminUserPathParamsSchema = z.object({
  userId: z.string().uuid(),
}).strict()

export const AdminRoleEnumSchema = z.enum(['student', 'admin', 'superadmin'])
export const AdminSourceEnumSchema = z.enum(['none', 'allowlist', 'db_role', 'both'])

export const AdminIdentitySchema = z.object({
  userId: z.string().uuid().optional(),
  email: z.string().email().optional(),
  phone: PhoneSchema.optional(),
}).strict().refine(
  (value) => Boolean(value.userId || value.email || value.phone),
  { message: 'Provide userId, email, or phone' },
)

export const AdminRoleUpdateSchema = z.object({
  role: AdminRoleEnumSchema,
}).strict()

export const AdminGrantSchema = AdminIdentitySchema
export const AdminRevokeSchema = AdminIdentitySchema

export const OptionalContentUrlSchema = z.preprocess((value) => {
  if (value == null) return undefined
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}, z.string().min(1).optional())

export const SubjectQuestionSchema = z.object({
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

export const SubjectTopicSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1),
  videoId: z.string().trim().min(1),
  videoUrl: OptionalContentUrlSchema,
  questions: z.array(SubjectQuestionSchema).default([]),
}).strict()

export const SubjectTopicCreateSchema = SubjectTopicSchema

export const SubjectTopicUpdateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  videoId: z.string().trim().min(1).optional(),
  videoUrl: OptionalContentUrlSchema,
  questions: z.array(SubjectQuestionSchema).optional(),
}).strict().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one field must be provided' },
)

export const SubjectTopicPathParamsSchema = z.object({
  id: z.string().min(1),
  topicId: z.string().min(1),
}).strict()

export const SubjectTopicsReorderSchema = z.object({
  topicIds: z.array(z.string().min(1)).min(1),
}).strict()

export const SubjectCreateBaseSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  order: z.number().int().optional(),
  topics: z.array(SubjectTopicSchema).optional(),
}).strict()

export const SubjectCreateSchema = SubjectCreateBaseSchema.superRefine((value, ctx) => {
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

export const SubjectUpdateSchema = SubjectCreateBaseSchema.partial().superRefine((value, ctx) => {
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

export const DateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)

export const AnalyticsGranularitySchema = z.enum(['day', 'week', 'month'])
export const AnalyticsMetricSchema = z.enum([
  'user_growth',
  'active_users',
  'completion_trend',
  'quiz_score_trend',
])
export const AnalyticsBreakdownTypeSchema = z.enum(['subject', 'auth_source', 'quiz_distribution'])

export const AdminAnalyticsSummaryQuerySchema = z.object({
  from: DateOnlySchema.optional(),
  to: DateOnlySchema.optional(),
  subjectId: z.string().min(1).optional(),
}).strict()

export const AdminAnalyticsTimeseriesQuerySchema = z.object({
  from: DateOnlySchema.optional(),
  to: DateOnlySchema.optional(),
  subjectId: z.string().min(1).optional(),
  metric: AnalyticsMetricSchema.default('active_users'),
  granularity: AnalyticsGranularitySchema.default('day'),
}).strict()

export const AdminAnalyticsBreakdownQuerySchema = z.object({
  from: DateOnlySchema.optional(),
  to: DateOnlySchema.optional(),
  subjectId: z.string().min(1).optional(),
  type: AnalyticsBreakdownTypeSchema.default('subject'),
}).strict()

export const PlanKeySchema = z.enum(['free', 'pro', 'premium'])

export const BillingPlanUpdateSchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240).default(''),
  priceMonthlyUzs: z.number().nonnegative(),
  isActive: z.boolean().default(true),
  features: z.array(z.string().trim().min(1)).default([]),
}).strict()

export const BillingPlanPathParamsSchema = z.object({
  planKey: PlanKeySchema,
}).strict()

export const BillingCoursePriceUpdateSchema = z.object({
  subjectId: z.string().trim().min(1),
  subjectTitle: z.string().trim().default(''),
  priceUzs: z.number().nonnegative(),
  isActive: z.boolean().default(true),
}).strict()

export const BillingCoursePathParamsSchema = z.object({
  subjectId: z.string().trim().min(1),
}).strict()

export const BillingFinanceSummaryQuerySchema = z.object({
  from: DateOnlySchema.optional(),
  to: DateOnlySchema.optional(),
}).strict()

export const DemoBootstrapSchema = z.object({
  subjectId: z.string().min(1).optional(),
  force: z.boolean().default(false),
}).strict()

export const UserCapabilitiesSchema = z.object({
  canTeach: z.boolean().default(false),
  canBuy: z.boolean().default(true),
  canLearn: z.boolean().default(true),
}).strict()

export const UserCapabilitiesUpdateSchema = z.object({
  canTeach: z.boolean().optional(),
  canBuy: z.boolean().optional(),
  canLearn: z.boolean().optional(),
}).strict().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one capability field must be provided' },
)

export const ScopeIdParamsSchema = z.object({
  scopeId: z.string().uuid(),
}).strict()

export const UserIdPathParamsSchema = z.object({
  userId: z.string().uuid(),
}).strict()

export const SubjectScopeQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  subjectId: z.string().min(1).optional(),
  status: z.enum(['active', 'blocked', 'pending']).optional(),
}).strict()

export const AdminSubjectScopeSchema = z.object({
  adminUserId: z.string().uuid(),
  subjectId: z.string().min(1),
  canManageContent: z.boolean().default(true),
  canManagePricing: z.boolean().default(false),
}).strict()

export const TeacherSubjectScopeSchema = z.object({
  teacherUserId: z.string().uuid(),
  subjectId: z.string().min(1),
  status: z.enum(['active', 'blocked', 'pending']).default('active'),
}).strict()

export const FIXED_EXAM_DURATION_SEC = 120 * 60
export const FIXED_EXAM_PASS_PERCENT = 80
export const DEFAULT_REQUIRED_QUESTION_COUNT = 50
export const AllowedQuestionCountSchema = z.union([z.literal(35), z.literal(50)])

export const ExamStatusSchema = z.enum(['draft', 'pending_review', 'published', 'archived'])
export const ExamDifficultySchema = z.enum(['easy', 'medium', 'hard']).optional()
export const QuestionFormatTypeSchema = z.enum(['MCQ4', 'MCQ8', 'WRITTEN'])

export const ExamQuestionCreateSchema = z.object({
  id: z.string().uuid().optional(),
  blockOrder: z.number().int().positive().optional(),
  questionOrder: z.number().int().positive().optional(),
  promptText: z.string().trim().min(1),
  promptRich: z.record(z.any()).optional(),
  imageUrl: OptionalContentUrlSchema,
  options: z.array(z.string().trim().min(1)).min(2).optional(),
  correctIndex: z.number().int().nonnegative().optional(),
  keyVerified: z.boolean().default(true),
  explanation: z.string().trim().optional(),
  difficulty: ExamDifficultySchema,
  sourceRef: z.string().trim().optional(),
  formatType: QuestionFormatTypeSchema.default('MCQ4'),
  writtenAnswer: z.string().trim().optional(),
}).superRefine((value, ctx) => {
  const fmt = value.formatType ?? 'MCQ4'
  if (fmt === 'MCQ4' || fmt === 'MCQ8') {
    if (!value.options || value.options.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${fmt} questions require at least 2 options`,
        path: ['options'],
      })
    }
    if (value.correctIndex === undefined || value.correctIndex === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${fmt} questions require a correctIndex`,
        path: ['correctIndex'],
      })
    } else if (value.options && value.correctIndex >= value.options.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'correctIndex must be within options range',
        path: ['correctIndex'],
      })
    }
  }
})

export const ExamBlockCreateSchema = z.object({
  blockOrder: z.number().int().positive(),
  title: z.string().trim().min(1),
}).strict()

export const ExamCreateSchema = z.object({
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

export const ExamUpdateSchema = z.object({
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

export const ExamPathParamsSchema = z.object({
  examId: z.string().uuid(),
}).strict()

export const ExamCatalogQuerySchema = z.object({
  subjectId: z.string().min(1).optional(),
}).strict()

export const PaymentProviderSchema = z.enum(['payme', 'click', 'manual'])

export const ExamCheckoutIntentSchema = z.object({
  provider: PaymentProviderSchema,
  attempts: z.number().int().positive().max(20).default(1),
}).strict()

export const ExamAttemptPathParamsSchema = z.object({
  attemptId: z.string().uuid(),
}).strict()

export const ExamAttemptAnswerSchema = z.object({
  questionId: z.string().uuid(),
  selectedIndex: z.number().int().nonnegative(),
}).strict()

export const ExamQuestionPathParamsSchema = z.object({
  examId: z.string().uuid(),
  questionId: z.string().uuid(),
}).strict()

export const ExamQuestionKeyUpdateSchema = z.object({
  correctIndex: z.number().int().nonnegative(),
  keyVerified: z.boolean().default(true),
}).strict()

export const MaterialPackStatusSchema = z.enum(['draft', 'pending_review', 'published', 'archived'])

export const MaterialPackCreateSchema = z.object({
  subjectId: z.string().min(1),
  title: z.string().trim().min(1),
  description: z.string().max(2000).optional(),
  priceUzs: z.number().nonnegative().default(0),
}).strict()

export const MaterialPackUpdateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().max(2000).optional(),
  priceUzs: z.number().nonnegative().optional(),
  isActive: z.boolean().optional(),
}).strict().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one material pack field must be provided' },
)

export const MaterialPackPathParamsSchema = z.object({
  packId: z.string().uuid(),
}).strict()

export const MaterialCatalogQuerySchema = z.object({
  subjectId: z.string().min(1).optional(),
}).strict()

export const MaterialCheckoutIntentSchema = z.object({
  provider: PaymentProviderSchema,
}).strict()

export const ReviewRejectSchema = z.object({
  archive: z.boolean().default(false),
}).strict()

export const ContentUploadSourceSchema = z.enum(['docx', 'pdf'])

export const ExamImportCreateSchema = z.object({
  subjectId: z.string().min(1),
  title: z.string().trim().min(1),
  description: z.string().max(2000).optional(),
  requiredQuestionCount: AllowedQuestionCountSchema.default(35),
  sourceType: ContentUploadSourceSchema,
  sourcePath: z.string().min(1),
}).strict()

export const ImportJobPathParamsSchema = z.object({
  jobId: z.string().uuid(),
}).strict()

export const WebhookAckSchema = z.object({
  externalId: z.string().min(1),
  status: z.enum(['pending', 'paid', 'failed', 'refunded']),
}).passthrough()

export const PaymentPathParamsSchema = z.object({
  paymentId: z.string().uuid(),
}).strict()

export const PaymentSessionStartSchema = z.object({
  payerName: z.string().trim().min(2).max(120),
  payerPhone: z.string().trim().min(5).max(40),
  payerEmail: z.string().trim().email().optional(),
  returnUrl: z.string().trim().max(1000).optional(),
  cancelUrl: z.string().trim().max(1000).optional(),
  note: z.string().trim().max(500).optional(),
}).strict()

export const TeacherQuotaSchema = z.object({
  videoQuota: z.number().int().nonnegative().default(0),
  testQuota: z.number().int().nonnegative().default(0),
})

export type PublicUser = z.infer<typeof PublicUserSchema>
export type AuthPayload = z.infer<typeof AuthPayloadSchema>
export type SubjectTopic = z.infer<typeof SubjectTopicSchema>
export type SubjectTopicCreate = z.infer<typeof SubjectTopicCreateSchema>
export type SubjectTopicUpdate = z.infer<typeof SubjectTopicUpdateSchema>
export type SubjectCreate = z.infer<typeof SubjectCreateSchema>
export type SubjectUpdate = z.infer<typeof SubjectUpdateSchema>
export type ExamCreate = z.infer<typeof ExamCreateSchema>
export type ExamUpdate = z.infer<typeof ExamUpdateSchema>
export type ExamBlockCreate = z.infer<typeof ExamBlockCreateSchema>
export type ExamQuestionCreate = z.infer<typeof ExamQuestionCreateSchema>
export type MaterialPackCreate = z.infer<typeof MaterialPackCreateSchema>
export type MaterialPackUpdate = z.infer<typeof MaterialPackUpdateSchema>
export type PaymentSessionStart = z.infer<typeof PaymentSessionStartSchema>
export type QuestionFormatType = z.infer<typeof QuestionFormatTypeSchema>
export type TeacherQuota = z.infer<typeof TeacherQuotaSchema>
