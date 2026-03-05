import { ApiError } from '../services/api'

type TranslateFn = (key: string) => string

const ERROR_CODE_KEY_MAP: Record<string, string> = {
  INVALID_RESPONSE_SHAPE: 'errorInvalidResponsePayload',
  VALIDATION_ERROR: 'errorValidationGeneric',
  INTERNAL_SERVER_ERROR: 'errorServerGeneric',
  USER_NO_LONGER_EXISTS: 'errorUserNotFound',
  ADMIN_ACCESS_REQUIRED: 'errorAdminAccessRequired',
  SUPERADMIN_ACCESS_REQUIRED: 'errorSuperadminAccessRequired',
  CAPABILITY_REQUIRED: 'errorCapabilityRequired',
  FEATURE_DISABLED: 'errorFeatureDisabled',
  EXAM_ENTITLEMENT_MISSING: 'errorExamEntitlementMissing',
  EXAM_NOT_FOUND: 'errorExamNotFound',
  EXAM_NOT_PUBLISHED: 'errorExamNotPublished',
  EXAM_INVALID_STATE: 'errorExamInvalidState',
  EXAM_ATTEMPT_NOT_FOUND: 'errorExamAttemptNotFound',
  EXAM_ATTEMPT_EXPIRED: 'errorExamAttemptExpired',
  EXAM_ATTEMPT_FINALIZED: 'errorExamAttemptFinalized',
  MATERIAL_PACK_NOT_FOUND: 'errorMaterialPackNotFound',
  PAYMENT_NOT_FOUND: 'errorPaymentNotFound',
  PAYMENT_SIGNATURE_INVALID: 'errorPaymentSignatureInvalid',
  INGESTION_IMPORT_FAILED: 'errorIngestionImportFailed',
  DEMO_BOOTSTRAP_FAILED: 'errorDemoBootstrapFailed',
  SUBJECT_SCOPE_REQUIRED: 'errorSubjectScopeRequired',
  TEACHER_SCOPE_REQUIRED: 'errorTeacherScopeRequired',
  NOT_AUTHORISED_NO_TOKEN: 'errorAuthRequired',
  NOT_AUTHORISED_INVALID_TOKEN: 'errorAuthInvalid',
}

const MESSAGE_KEY_MAP: Record<string, string> = {
  'Invalid response payload': 'errorInvalidResponsePayload',
  'Invalid JSON response': 'errorInvalidJson',
  'User not found': 'errorUserNotFound',
  'Payment not found': 'errorPaymentNotFound',
  'Payme/Click checkout is disabled': 'errorFeatureDisabled',
  'Provider redirect URL is not configured.': 'errorPaymentProviderRedirectMissing',
  'Unknown error': 'errorUnknown',
}

const hasTranslation = (t: TranslateFn, key: string): boolean => t(key) !== key

export const resolveUiErrorMessage = (
  error: unknown,
  t: TranslateFn,
  fallbackKey = 'errorUnexpected',
): string => {
  if (error instanceof ApiError) {
    const mappedCodeKey = error.code ? ERROR_CODE_KEY_MAP[error.code] : undefined
    if (mappedCodeKey && hasTranslation(t, mappedCodeKey)) {
      return error.requestId
        ? `${t(mappedCodeKey)} (${t('errorRequestId')}: ${error.requestId})`
        : t(mappedCodeKey)
    }

    const mappedMsgKey = MESSAGE_KEY_MAP[error.message]
    if (mappedMsgKey && hasTranslation(t, mappedMsgKey)) {
      return error.requestId
        ? `${t(mappedMsgKey)} (${t('errorRequestId')}: ${error.requestId})`
        : t(mappedMsgKey)
    }

    if (error.requestId) {
      const base = hasTranslation(t, fallbackKey) ? t(fallbackKey) : t('errorUnexpected')
      return `${base} (${t('errorRequestId')}: ${error.requestId})`
    }
  }

  if (error instanceof Error) {
    const mappedMsgKey = MESSAGE_KEY_MAP[error.message]
    if (mappedMsgKey && hasTranslation(t, mappedMsgKey)) {
      return t(mappedMsgKey)
    }
  }

  if (hasTranslation(t, fallbackKey)) return t(fallbackKey)
  return t('errorUnexpected')
}

export default resolveUiErrorMessage
