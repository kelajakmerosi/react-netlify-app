import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Eye, EyeOff, LayoutDashboard, ShieldCheck } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useLang } from '../hooks'
import { useToast } from '../app/providers/ToastProvider'
import { cn } from '../utils'
import { ApiError } from '../services/api'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { GlassCard } from '../components/ui/GlassCard'
import { Modal } from '../components/ui'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import styles from './AuthPage.module.css'

function GoogleSVG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  )
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string
const PHONE_REGEX = /^\+998\d{9}$/
const OTP_LENGTH = 6
const OTP_RESEND_COOLDOWN_SEC = 60
const PASSWORD_HAS_LETTER = /[A-Za-z]/
const PASSWORD_HAS_NUMBER = /\d/

type GoogleCredentialResponse = {
  credential?: string
}

type GooglePromptNotification = {
  isNotDisplayed?: () => boolean
  isSkippedMoment?: () => boolean
  getNotDisplayedReason?: () => string
  getSkippedReason?: () => string
}

type AuthMode = 'login' | 'signup'
type OtpPurpose = 'signup' | 'legacyLogin' | 'passwordReset'
type PasswordModalKind = 'legacySetup' | 'passwordReset'
const isStrongPassword = (password: string) =>
  password.length >= 8 &&
  password.length <= 128 &&
  PASSWORD_HAS_LETTER.test(password) &&
  PASSWORD_HAS_NUMBER.test(password)

const maskPhone = (phone: string) => {
  if (!phone || phone.length < 4) return phone
  return `${phone.slice(0, 4)} *** ** ${phone.slice(-2)}`
}

const interpolate = (template: string, values: Record<string, string>) =>
  Object.entries(values).reduce(
    (acc, [key, value]) => acc.replace(new RegExp(`\\{${key}\\}`, 'g'), value),
    template,
  )

export function AuthPage() {
  const { t } = useLang()
  const toast = useToast()
  const {
    signupRequestCode,
    signupConfirm,
    loginWithPassword,
    legacyLoginOtpRequestCode,
    legacyLoginOtpConfirm,
    passwordResetRequestCode,
    passwordResetConfirmCode,
    passwordResetComplete,
    passwordSetupComplete,
    loginWithGoogle,
    loginWithGoogleCode,
    continueAsGuest,
  } = useAuth()

  const [mode, setMode] = useState<AuthMode>(() => {
    if (typeof window === 'undefined') return 'login'
    return new URLSearchParams(window.location.search).get('mode') === 'signup' ? 'signup' : 'login'
  })
  const [loading, setLoading] = useState(false)
  const [gLoading, setGLoading] = useState(false)
  const [googleReady, setGoogleReady] = useState(false)

  const [loginPhone, setLoginPhone] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [signupPhone, setSignupPhone] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('')
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false)

  const [otpOpen, setOtpOpen] = useState(false)
  const [otpPurpose, setOtpPurpose] = useState<OtpPurpose>('signup')
  const [otpPhone, setOtpPhone] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendAvailableAt, setResendAvailableAt] = useState(0)
  const [countdownNow, setCountdownNow] = useState(() => Date.now())

  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [passwordModalKind, setPasswordModalKind] = useState<PasswordModalKind>('legacySetup')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false)
  const [passwordModalLoading, setPasswordModalLoading] = useState(false)

  const otpRefs = useRef<Array<HTMLInputElement | null>>([])
  const googleInitializedRef = useRef(false)

  const resolveErrorMessage = (err: unknown) => {
    if (err instanceof ApiError) {
      switch (err.code) {
        case 'PHONE_ALREADY_REGISTERED':
          return t('phoneAlreadyRegistered')
        case 'PHONE_NOT_REGISTERED':
          return t('phoneNotRegistered')
        case 'INVALID_CREDENTIALS':
          return t('invalidCredentials')
        case 'PASSWORD_SETUP_REQUIRED':
          return t('passwordSetupRequired')
        case 'PHONE_CODE_INVALID':
          return t('otpInvalidError')
        case 'PHONE_CODE_EXPIRED':
          return t('otpExpiredError')
        case 'PHONE_CODE_ATTEMPTS_EXCEEDED':
          return t('otpAttemptsExceededError')
        case 'PHONE_CODE_REQUEST_LIMIT':
          return t('otpRequestLimitError')
        case 'PHONE_CODE_COOLDOWN':
          return t('otpCooldownError')
        case 'PASSWORD_RESET_TOKEN_INVALID':
          return t('passwordResetTokenInvalid')
        case 'SMS_PROVIDER_UNAVAILABLE':
        case 'SMS_SEND_FAILED':
          return t('smsProviderIssue')
        case 'SMS_TEMPLATE_NOT_APPROVED':
          return t('smsTemplateNotApproved')
        case 'API_UNREACHABLE':
          return t('networkError')
        default:
          if (err.status >= 500) return t('authTemporaryIssue')
      }

      const mapped = t(err.message)
      if (mapped !== err.message) return mapped
      return t('authUnknownError')
    }

    const text = err instanceof Error ? err.message.trim() : ''
    if (!text) return t('authUnknownError')
    if (t(text) !== text) return t(text)
    if (text.toLowerCase().includes('network')) return t('networkError')
    return t('authUnknownError')
  }

  const onModeKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, currentMode: AuthMode) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      setMode(currentMode === 'login' ? 'signup' : 'login')
      /* cleared */
      /* cleared */
      return
    }
    if ((event.key === 'Enter' || event.key === ' ') && currentMode !== mode) {
      event.preventDefault()
      setMode(currentMode)
      /* cleared */
      /* cleared */
    }
  }

  const startResendCooldown = (seconds = OTP_RESEND_COOLDOWN_SEC) => {
    const now = Date.now()
    setCountdownNow(now)
    setResendAvailableAt(now + seconds * 1000)
  }

  const resendCountdown = useMemo(() => {
    if (!resendAvailableAt) return 0
    return Math.max(0, Math.ceil((resendAvailableAt - countdownNow) / 1000))
  }, [countdownNow, resendAvailableAt])

  useEffect(() => {
    if (!resendAvailableAt) return undefined
    const timer = window.setInterval(() => {
      const now = Date.now()
      setCountdownNow(now)
      if (now >= resendAvailableAt) {
        setResendAvailableAt(0)
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [resendAvailableAt])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (!code) return

    window.history.replaceState({}, '', window.location.pathname)
    setGLoading(true)
    loginWithGoogleCode(code, 'postmessage')
      .catch((err) => {
        toast.error(resolveErrorMessage(err))
      })
      .finally(() => setGLoading(false))
  }, [])

  const handleGoogleCredential = useCallback(async (response: GoogleCredentialResponse) => {
    const idToken = response?.credential
    if (!idToken) {
      toast.error(t('googleLoginFailed'))
      setGLoading(false)
      return
    }

    try {
      await loginWithGoogle(idToken)
    } catch (err) {
      toast.error(resolveErrorMessage(err))
    } finally {
      setGLoading(false)
    }
  }, [loginWithGoogle, t])

  const initializeGoogleIdentity = useCallback(() => {
    const googleIdentity = (window as typeof window & {
      google?: {
        accounts?: {
          id?: {
            initialize: (options: {
              client_id: string
              callback: (response: GoogleCredentialResponse) => void
            }) => void
            prompt: (listener?: (notification: GooglePromptNotification) => void) => void
            cancel: () => void
          }
        }
      }
    }).google?.accounts?.id

    if (!GOOGLE_CLIENT_ID || !googleIdentity) return false
    if (!googleInitializedRef.current) {
      googleIdentity.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
      })
      googleInitializedRef.current = true
    }
    setGoogleReady(true)
    return true
  }, [handleGoogleCredential])

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return undefined

    if (initializeGoogleIdentity()) return undefined

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-google-identity="true"]')
    const onLoad = () => {
      initializeGoogleIdentity()
    }
    const onError = () => {
      setGoogleReady(false)
    }

    if (existingScript) {
      existingScript.addEventListener('load', onLoad)
      existingScript.addEventListener('error', onError)
      return () => {
        existingScript.removeEventListener('load', onLoad)
        existingScript.removeEventListener('error', onError)
      }
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.dataset.googleIdentity = 'true'
    script.addEventListener('load', onLoad)
    script.addEventListener('error', onError)
    document.head.appendChild(script)

    return () => {
      script.removeEventListener('load', onLoad)
      script.removeEventListener('error', onError)
    }
  }, [initializeGoogleIdentity])

  const openOtpModal = (purpose: OtpPurpose, phone: string, message?: string) => {
    setOtpPurpose(purpose)
    setOtpPhone(phone)
    setOtpCode('')
    /* cleared */
    toast.info(message || t('codeSentHint'))
    setOtpOpen(true)
    startResendCooldown()
    requestAnimationFrame(() => otpRefs.current[0]?.focus())
  }

  const closeOtpModal = () => {
    setOtpOpen(false)
    setOtpCode('')
    /* cleared */
    /* cleared */
    setOtpLoading(false)
    setResendLoading(false)
  }

  const openPasswordModal = (kind: PasswordModalKind) => {
    setPasswordModalKind(kind)
    /* cleared */
    setNewPassword('')
    setConfirmNewPassword('')
    setPasswordModalOpen(true)
    requestAnimationFrame(() => document.getElementById('auth-new-password')?.focus())
  }

  const closePasswordModal = () => {
    setPasswordModalOpen(false)
    /* cleared */
    setPasswordModalLoading(false)
  }


  const handlePasswordLogin = async () => {
    if (!PHONE_REGEX.test(loginPhone)) {
      toast.error(t('phoneFormatError'))
      return
    }
    if (!loginPassword.trim()) {
      toast.error(t('passwordRequired'))
      return
    }

    setLoading(true)
    try {
      await loginWithPassword({ phone: loginPhone, password: loginPassword })
    } catch (err) {
      toast.error(resolveErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleSignupRequest = async () => {
    if (!firstName.trim()) {
      toast.error(t('firstNameRequired'))
      return
    }
    if (!lastName.trim()) {
      toast.error(t('lastNameRequired'))
      return
    }
    if (!PHONE_REGEX.test(signupPhone)) {
      toast.error(t('phoneFormatError'))
      return
    }
    if (!isStrongPassword(signupPassword)) {
      toast.error(t('passwordPolicyError'))
      return
    }
    if (signupPassword !== signupConfirmPassword) {
      toast.error(t('passwordMismatch'))
      return
    }

    setLoading(true)
    try {
      await signupRequestCode(signupPhone)
      openOtpModal('signup', signupPhone)
    } catch (err) {
      toast.error(resolveErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleLegacyOtpRequest = async () => {
    if (!PHONE_REGEX.test(loginPhone)) {
      toast.error(t('phoneFormatError'))
      return
    }

    setLoading(true)
    try {
      await legacyLoginOtpRequestCode(loginPhone)
      openOtpModal('legacyLogin', loginPhone)
    } catch (err) {
      toast.error(resolveErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordResetRequest = async () => {
    if (!PHONE_REGEX.test(loginPhone)) {
      toast.error(t('phoneFormatError'))
      return
    }

    setLoading(true)
    try {
      await passwordResetRequestCode(loginPhone)
      openOtpModal('passwordReset', loginPhone)
    } catch (err) {
      toast.error(resolveErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleOtpSubmit = async () => {
    /* cleared */
    if (!/^\d{6}$/.test(otpCode)) {
      toast.error(t('otpFormatError'))
      return
    }

    setOtpLoading(true)
    try {
      if (otpPurpose === 'signup') {
        await signupConfirm({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: signupPhone,
          password: signupPassword,
          code: otpCode,
        })
        closeOtpModal()
        return
      }

      if (otpPurpose === 'legacyLogin') {
        const result = await legacyLoginOtpConfirm({
          phone: otpPhone,
          code: otpCode,
        })

        closeOtpModal()
        if (result.requiresPasswordSetup) {
          openPasswordModal('legacySetup')
        }
        return
      }

      const result = await passwordResetConfirmCode({
        phone: otpPhone,
        code: otpCode,
      })

      setResetToken(result.resetToken)
      closeOtpModal()
      openPasswordModal('passwordReset')
    } catch (err) {
      toast.error(resolveErrorMessage(err))
    } finally {
      setOtpLoading(false)
    }
  }

  const handleOtpResend = async () => {
    if (resendCountdown > 0) return
    setResendLoading(true)
    /* cleared */
    try {
      if (otpPurpose === 'signup') {
        await signupRequestCode(otpPhone)
      } else if (otpPurpose === 'legacyLogin') {
        await legacyLoginOtpRequestCode(otpPhone)
      } else {
        await passwordResetRequestCode(otpPhone)
      }
      startResendCooldown()
      toast.info(t('codeResentHint'))
    } catch (err) {
      toast.error(resolveErrorMessage(err))
    } finally {
      setResendLoading(false)
    }
  }

  const handlePasswordModalSubmit = async () => {
    /* cleared */
    if (!isStrongPassword(newPassword)) {
      toast.error(t('passwordPolicyError'))
      return
    }
    if (newPassword !== confirmNewPassword) {
      toast.error(t('passwordMismatch'))
      return
    }

    setPasswordModalLoading(true)
    try {
      if (passwordModalKind === 'legacySetup') {
        await passwordSetupComplete(newPassword)
        closePasswordModal()
        return
      }

      await passwordResetComplete({
        phone: otpPhone,
        resetToken,
        newPassword,
      })
      await loginWithPassword({ phone: otpPhone, password: newPassword })
      closePasswordModal()
    } catch (err) {
      toast.error(resolveErrorMessage(err))
    } finally {
      setPasswordModalLoading(false)
    }
  }

  const codeDigits = Array.from({ length: OTP_LENGTH }, (_, index) => otpCode[index] || '')
  const writeCodeAt = (index: number, nextValue: string) => {
    const digits = [...codeDigits]
    digits[index] = nextValue
    setOtpCode(digits.join(''))
  }

  const handleOtpChange = (index: number, rawValue: string) => {
    const cleaned = rawValue.replace(/\D/g, '')
    if (!cleaned) {
      writeCodeAt(index, '')
      return
    }

    if (cleaned.length === 1) {
      writeCodeAt(index, cleaned)
      if (index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus()
      return
    }

    const digits = [...codeDigits]
    for (let i = 0; i < cleaned.length && index + i < OTP_LENGTH; i += 1) {
      digits[index + i] = cleaned[i]
    }
    setOtpCode(digits.join(''))
    const nextIndex = Math.min(index + cleaned.length, OTP_LENGTH - 1)
    otpRefs.current[nextIndex]?.focus()
  }

  const handleOtpKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      void handleOtpSubmit()
      return
    }

    if (event.key === 'Backspace') {
      if (codeDigits[index]) {
        writeCodeAt(index, '')
      } else if (index > 0) {
        writeCodeAt(index - 1, '')
        otpRefs.current[index - 1]?.focus()
      }
      event.preventDefault()
      return
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      otpRefs.current[index - 1]?.focus()
      return
    }

    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      event.preventDefault()
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    const cleaned = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!cleaned) return
    const digits = Array.from({ length: OTP_LENGTH }, (_, index) => cleaned[index] || '')
    setOtpCode(digits.join(''))
    otpRefs.current[Math.min(cleaned.length, OTP_LENGTH) - 1]?.focus()
  }

  const startGooglePopupCodeFlow = () => {
    const gAccounts = (window as typeof window & {
      google?: {
        accounts?: {
          oauth2?: {
            initCodeClient: (config: {
              client_id: string
              scope: string
              ux_mode: 'popup'
              callback: (response: { code?: string; error?: string }) => void
            }) => { requestCode: () => void }
          }
        }
      }
    }).google?.accounts?.oauth2

    if (!gAccounts) {
      toast.error(t('googleLoginUnavailable'))
      setGLoading(false)
      return
    }

    const codeClient = gAccounts.initCodeClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'openid email profile',
      ux_mode: 'popup',
      callback: (response) => {
        if (response.error || !response.code) {
          setGLoading(false)
          return
        }
        loginWithGoogleCode(response.code, 'postmessage')
          .catch((err) => toast.error(resolveErrorMessage(err)))
          .finally(() => setGLoading(false))
      },
    })
    codeClient.requestCode()
  }

  const handleGoogleLogin = () => {
    if (!GOOGLE_CLIENT_ID) {
      toast.error(t('googleLoginUnavailable'))
      return
    }

    const googleIdentity = (window as typeof window & {
      google?: {
        accounts?: {
          id?: {
            prompt: (listener?: (notification: GooglePromptNotification) => void) => void
            cancel: () => void
          }
        }
      }
    }).google?.accounts?.id

    if (!googleIdentity || !googleReady) {
      setGLoading(true)
      startGooglePopupCodeFlow()
      return
    }

    setGLoading(true)
    googleIdentity.cancel()
    googleIdentity.prompt((notification) => {
      const notDisplayed = notification?.isNotDisplayed?.() ?? false
      const skipped = notification?.isSkippedMoment?.() ?? false

      if (notDisplayed || skipped) {
        startGooglePopupCodeFlow()
      }
    })
  }

  const otpTitle = otpPurpose === 'signup'
    ? t('otpModalTitleSignup')
    : otpPurpose === 'legacyLogin'
      ? t('otpModalTitleLegacyLogin')
      : t('otpModalTitlePasswordReset')
  const authPaneTitle = mode === 'signup' ? t('authTitleSignup') : t('authTitleLogin')

  return (
    <div className={styles.page}>
      <div style={{ position: 'absolute', top: '24px', right: '28px', zIndex: 50 }}>
        <ThemeToggle />
      </div>

      <div className={styles.glow1} />
      <div className={styles.glow2} />

      <GlassCard className={styles.shell}>
        <section className={styles.showcase} aria-label="Authentication overview">
          <div className={styles.mediaCard}>
            <div className={styles.mediaVisual} aria-hidden="true">
              <div className={styles.mediaWindow}>
                <div className={styles.mediaWindowBar}>
                  <span className={styles.mediaWindowDot} />
                  <span className={styles.mediaWindowDot} />
                  <span className={styles.mediaWindowDot} />
                </div>
                <div className={styles.mediaWindowBody}>
                  <div className={styles.mediaPrimaryCard}>
                    <span className={styles.mediaPrimaryIcon}>
                      <ShieldCheck size={18} />
                    </span>
                    <div className={styles.mediaPrimaryCopy}>
                      <span className={styles.mediaPrimaryLabel}>Telefon raqami</span>
                      <strong className={styles.mediaPrimaryValue}>+998 90 123 45 67</strong>
                    </div>
                  </div>

                  <div className={styles.mediaSecondaryRow}>
                    <div className={styles.mediaOtpCard}>
                      <span className={styles.mediaOtpLabel}>SMS kod</span>
                      <div className={styles.mediaOtpDigits}>
                        {Array.from({ length: 6 }).map((_, index) => (
                          <span key={`otp-digit-${index}`} className={styles.mediaOtpDigit} />
                        ))}
                      </div>
                    </div>

                    <div className={styles.mediaStatusCard}>
                      <span className={styles.mediaStatusIcon}>
                        <ShieldCheck size={16} />
                      </span>
                      <span className={styles.mediaStatusText}>Tasdiqlandi</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.mediaOverlay}>
              <span className={styles.mediaBadge}>{t('authHeroEyebrow')}</span>
              <span className={styles.mediaMeta}>{t('authShowcaseMeta')}</span>
            </div>
          </div>

          <div className={styles.showcaseTopRow}>
            <div className={styles.showcaseIntro}>
              <span className={styles.brandMark}>Kelajak Merosi</span>
              <h1 className={styles.showcaseTitle}>{t('authHeroTitle')}</h1>
              <p className={styles.showcaseBody}>{t('authHeroBody')}</p>
            </div>
          </div>

          <div className={styles.highlightGrid}>
            {[
              { title: t('authHighlightLessons'), body: t('authHighlightLessonsBody'), icon: ShieldCheck },
              { title: t('authHighlightExams'), body: t('authHighlightExamsBody'), icon: LayoutDashboard },
            ].map((item) => (
              <article
                key={item.title}
                className={styles.highlightCard}
              >
                <span className={styles.highlightIcon} aria-hidden="true">
                  <item.icon size={18} />
                </span>
                <div>
                  <h3 className={styles.highlightTitle}>{item.title}</h3>
                  <p className={styles.highlightBody}>{item.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.authPane}>
          <div className={styles.authPaneInner}>
            <div className={styles.header}>
              <div className={styles.headerTop}>
                <span className={styles.paneEyebrow}>Kelajak Merosi</span>
                <span className={styles.authBadge}>{t('authHeroEyebrow')}</span>
              </div>
              <h2 className={styles.authTitle}>{authPaneTitle}</h2>
              <p className={styles.tagline}>{mode === 'signup' ? t('authStepPhoneSignup') : t('authStepPhoneLogin')}</p>
            </div>

            <div className={styles.form}>
              <div className={styles.modeSegment} role="tablist" aria-label={t('authModeLabel')}>
                <span
                  aria-hidden="true"
                  className={cn(styles.modeIndicator, mode === 'signup' && styles.modeIndicatorSignup)}
                />
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'login'}
                  tabIndex={mode === 'login' ? 0 : -1}
                  className={cn(styles.modeTab, mode === 'login' && styles.modeTabActive)}
                  onClick={() => {
                    setMode('login')
                  }}
                  onKeyDown={(event) => onModeKeyDown(event, 'login')}
                >
                  {t('login')}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'signup'}
                  tabIndex={mode === 'signup' ? 0 : -1}
                  className={cn(styles.modeTab, mode === 'signup' && styles.modeTabActive)}
                  onClick={() => {
                    setMode('signup')
                  }}
                  onKeyDown={(event) => onModeKeyDown(event, 'signup')}
                >
                  {t('register')}
                </button>
              </div>

              {mode === 'login' ? (
                <>
                  <Input
                    label={t('phonePlaceholder')}
                    hideLabel
                    placeholder={t('phonePlaceholder')}
                    value={loginPhone}
                    onChange={(event) => {
                      setLoginPhone(event.target.value.trim())
                    }}
                  />
                  <div className={styles.passwordField}>
                    <Input
                      label={t('password')}
                      hideLabel
                      type={showLoginPassword ? 'text' : 'password'}
                      placeholder={t('password')}
                      value={loginPassword}
                      onChange={(event) => {
                        setLoginPassword(event.target.value)
                      }}
                      className={styles.passwordInput}
                    />
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowLoginPassword((prev) => !prev)}
                      aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                    >
                      {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <Button fullWidth size="lg" onClick={() => void handlePasswordLogin()} disabled={loading}>
                    {loading ? t('authLoading') : t('login')}
                  </Button>
                  <div className={styles.inlineLinks}>
                    <button
                      type="button"
                      className={styles.inlineLinkButton}
                      onClick={() => void handleLegacyOtpRequest()}
                    >
                      {t('loginViaCode')}
                    </button>
                    <button
                      type="button"
                      className={styles.inlineLinkButton}
                      onClick={() => void handlePasswordResetRequest()}
                    >
                      {t('forgotPassword')}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.nameRow}>
                    <Input
                      label={t('firstName')}
                      hideLabel
                      placeholder={t('firstName')}
                      value={firstName}
                      onChange={(event) => {
                        setFirstName(event.target.value)
                      }}
                    />
                    <Input
                      label={t('lastName')}
                      hideLabel
                      placeholder={t('lastName')}
                      value={lastName}
                      onChange={(event) => {
                        setLastName(event.target.value)
                      }}
                    />
                  </div>
                  <Input
                    label={t('phonePlaceholder')}
                    hideLabel
                    placeholder={t('phonePlaceholder')}
                    value={signupPhone}
                    onChange={(event) => {
                      setSignupPhone(event.target.value.trim())
                    }}
                  />
                  <div className={styles.passwordField}>
                    <Input
                      label={t('password')}
                      hideLabel
                      type={showSignupPassword ? 'text' : 'password'}
                      placeholder={t('password')}
                      value={signupPassword}
                      onChange={(event) => {
                        setSignupPassword(event.target.value)
                      }}
                      className={styles.passwordInput}
                    />
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowSignupPassword((prev) => !prev)}
                      aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                    >
                      {showSignupPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <div className={styles.passwordField}>
                    <Input
                      label={t('confirmPassword')}
                      hideLabel
                      type={showSignupConfirmPassword ? 'text' : 'password'}
                      placeholder={t('confirmPassword')}
                      value={signupConfirmPassword}
                      onChange={(event) => {
                        setSignupConfirmPassword(event.target.value)
                      }}
                      className={styles.passwordInput}
                    />
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowSignupConfirmPassword((prev) => !prev)}
                      aria-label={showSignupConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showSignupConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <Button fullWidth size="lg" onClick={() => void handleSignupRequest()} disabled={loading}>
                    {loading ? t('authLoading') : t('continue')}
                  </Button>
                </>
              )}


              <div className={styles.orRow}>
                <span className={styles.orLine} />
                <span className={styles.orText}>{t('orContinueWith')}</span>
                <span className={styles.orLine} />
              </div>

              <div className={styles.googleWrap}>
                <Button
                  variant="ghost"
                  fullWidth
                  className={styles.googleFallbackBtn}
                  onClick={handleGoogleLogin}
                  disabled={gLoading}
                >
                  {gLoading ? t('googleLoading') : <><GoogleSVG /> {t('loginWithGoogle')}</>}
                </Button>
              </div>

              <Button variant="ghost" fullWidth className={styles.guestBtn} onClick={continueAsGuest}>
                {t('guestMode')}
              </Button>
            </div>
          </div>
        </section>
      </GlassCard>

      {otpOpen && (
        <Modal
          open={otpOpen}
          title={otpTitle}
          description={interpolate(t('otpModalSubtitle'), { phone: maskPhone(otpPhone) })}
          labelledBy="otp-modal-title"
          onClose={closeOtpModal}
          footer={(
            <div className={styles.modalActions}>
              <div className={styles.modalSecondaryRow}>
                <Button
                  variant="ghost"
                  className={styles.modalSecondaryBtn}
                  onClick={closeOtpModal}
                >
                  {t('changePhone')}
                </Button>
                <Button
                  variant="ghost"
                  className={styles.modalSecondaryBtn}
                  onClick={() => void handleOtpResend()}
                  disabled={resendLoading || resendCountdown > 0}
                >
                  {resendLoading ? t('authLoading') : t('resendCode')}
                </Button>
              </div>
              <Button
                fullWidth
                className={styles.modalPrimaryBtn}
                onClick={() => void handleOtpSubmit()}
                disabled={otpLoading}
              >
                {otpLoading ? t('authLoading') : t('verifyOtp')}
              </Button>
            </div>
          )}
        >
          <div className={styles.otpGrid}>
            {codeDigits.map((digit, index) => (
              <Input
                key={index}
                ref={(element) => { otpRefs.current[index] = element }}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                maxLength={OTP_LENGTH}
                aria-label={`${t('otpDigitAria')} ${index + 1}`}
                className={cn(
                  styles.otpBox,
                  digit && styles.otpBoxFilled,
                )}
                value={digit}
                onFocus={(event) => event.currentTarget.select()}
                onChange={(event) => {
                  handleOtpChange(index, event.target.value)
                }}
                onKeyDown={(event) => handleOtpKeyDown(index, event)}
                onPaste={handleOtpPaste}
              />
            ))}
          </div>


          <div className={styles.modalMeta}>
            {resendCountdown > 0
              ? <span>{interpolate(t('otpResendIn'), { seconds: String(resendCountdown) })}</span>
              : <span>{t('otpResendReady')}</span>}
          </div>
        </Modal>
      )}

      {passwordModalOpen && (
        <Modal
          open={passwordModalOpen}
          title={passwordModalKind === 'legacySetup' ? t('setPasswordTitle') : t('resetPasswordTitle')}
          description={t('passwordPolicyHint')}
          labelledBy="password-modal-title"
          dismissible={passwordModalKind !== 'legacySetup'}
          onClose={closePasswordModal}
          footer={(
            <div className={styles.modalActions}>
              {passwordModalKind === 'passwordReset' && (
                <Button variant="ghost" className={styles.modalSecondaryBtn} onClick={closePasswordModal}>
                  {t('cancel')}
                </Button>
              )}
              <Button
                fullWidth
                className={styles.modalPrimaryBtn}
                onClick={() => void handlePasswordModalSubmit()}
                disabled={passwordModalLoading}
              >
                {passwordModalLoading ? t('authLoading') : t('savePassword')}
              </Button>
            </div>
          )}
        >
          <div className={styles.passwordField}>
            <Input
              id="auth-new-password"
              label={t('newPassword')}
              hideLabel
              type={showNewPassword ? 'text' : 'password'}
              placeholder={t('newPassword')}
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value)
              }}
              className={styles.passwordInput}
            />
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() => setShowNewPassword((prev) => !prev)}
              aria-label={showNewPassword ? 'Hide password' : 'Show password'}
            >
              {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div className={styles.passwordField}>
            <Input
              label={t('confirmPassword')}
              hideLabel
              type={showConfirmNewPassword ? 'text' : 'password'}
              placeholder={t('confirmPassword')}
              value={confirmNewPassword}
              onChange={(event) => {
                setConfirmNewPassword(event.target.value)
              }}
              className={styles.passwordInput}
            />
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() => setShowConfirmNewPassword((prev) => !prev)}
              aria-label={showConfirmNewPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

        </Modal>
      )}
    </div>
  )
}
