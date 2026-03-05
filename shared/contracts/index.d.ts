import { z } from 'zod'

export const ErrorEnvelopeSchema: z.ZodObject<{
  error: z.ZodObject<{
    code: z.ZodString
    message: z.ZodString
    requestId: z.ZodOptional<z.ZodString>
    details: z.ZodOptional<z.ZodUnknown>
  }>
}>

export const SuccessEnvelopeSchema: <T extends z.ZodTypeAny>(payloadSchema: T) => z.ZodObject<{
  data: T
  meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>
}>

export const PublicUserSchema: z.ZodTypeAny
export const AuthPayloadSchema: z.ZodTypeAny
export const RegisterRequestSchema: z.ZodTypeAny
export const LoginRequestSchema: z.ZodTypeAny
export const GoogleAuthRequestSchema: z.ZodTypeAny
export const PasswordSchema: z.ZodTypeAny
export const NameSchema: z.ZodTypeAny
export const PhoneSchema: z.ZodTypeAny
export const OtpCodeSchema: z.ZodTypeAny
export const PhoneRequestCodeSchema: z.ZodTypeAny
export const PhoneVerifyCodeSchema: z.ZodTypeAny
export const SignupRequestCodeSchema: z.ZodTypeAny
export const SignupConfirmSchema: z.ZodTypeAny
export const LoginWithPasswordSchema: z.ZodTypeAny
export const LegacyLoginOtpRequestCodeSchema: z.ZodTypeAny
export const LegacyLoginOtpConfirmSchema: z.ZodTypeAny
export const PasswordResetRequestCodeSchema: z.ZodTypeAny
export const PasswordResetConfirmCodeSchema: z.ZodTypeAny
export const PasswordResetCompleteSchema: z.ZodTypeAny
export const PasswordSetupCompleteSchema: z.ZodTypeAny
export const OtpRequestCodeResponseSchema: z.ZodTypeAny
export const PasswordResetConfirmCodeResponseSchema: z.ZodTypeAny
export const ProfileUpdateSchema: z.ZodTypeAny
export const TopicProgressPatchSchema: z.ZodTypeAny
export const ProgressTopicParamsSchema: z.ZodTypeAny
export const SubjectPathParamsSchema: z.ZodTypeAny
export const AdminUserPathParamsSchema: z.ZodTypeAny
export const SubjectCreateSchema: z.ZodTypeAny
export const SubjectUpdateSchema: z.ZodTypeAny
export const DemoBootstrapSchema: z.ZodTypeAny
export const UserCapabilitiesSchema: z.ZodTypeAny
export const UserCapabilitiesUpdateSchema: z.ZodTypeAny
export const SubjectScopeQuerySchema: z.ZodTypeAny
export const AdminSubjectScopeSchema: z.ZodTypeAny
export const TeacherSubjectScopeSchema: z.ZodTypeAny
export const ExamCreateSchema: z.ZodTypeAny
export const ExamUpdateSchema: z.ZodTypeAny
export const ExamPathParamsSchema: z.ZodTypeAny
export const ExamCatalogQuerySchema: z.ZodTypeAny
export const ExamCheckoutIntentSchema: z.ZodTypeAny
export const ExamAttemptPathParamsSchema: z.ZodTypeAny
export const ExamAttemptAnswerSchema: z.ZodTypeAny
export const ExamQuestionPathParamsSchema: z.ZodTypeAny
export const ExamQuestionKeyUpdateSchema: z.ZodTypeAny
export const MaterialPackCreateSchema: z.ZodTypeAny
export const MaterialPackUpdateSchema: z.ZodTypeAny
export const MaterialPackPathParamsSchema: z.ZodTypeAny
export const MaterialCatalogQuerySchema: z.ZodTypeAny
export const MaterialCheckoutIntentSchema: z.ZodTypeAny
export const ReviewRejectSchema: z.ZodTypeAny
export const ExamImportCreateSchema: z.ZodTypeAny
export const ImportJobPathParamsSchema: z.ZodTypeAny
export const WebhookAckSchema: z.ZodTypeAny
export const PaymentPathParamsSchema: z.ZodTypeAny
export const PaymentSessionStartSchema: z.ZodTypeAny
