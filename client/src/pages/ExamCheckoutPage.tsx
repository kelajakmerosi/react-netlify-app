import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Input } from '../components/ui'
import { Button } from '../components/ui/Button'
import { GlassCard } from '../components/ui/GlassCard'
import examService from '../services/exam.service'
import paymentService from '../services/payment.service'
import { ApiError } from '../services/api'
import { useLang } from '../hooks'
import clickLogo from '../assets/click.jpg'
import paymeLogo from '../assets/payme.png'
import { formatUzs } from '../utils'
import { resolveUiErrorMessage } from '../utils/errorPresentation'
import { cn } from '../utils'
import pageStyles from './ExamPages.module.css'
import styles from './PaymentGatewayPage.module.css'

interface ExamItem {
  id: string
  title: string
  description?: string
  priceUzs: number
  durationSec: number
  passPercent: number
  requiredQuestionCount?: number
}

type Provider = 'payme' | 'click'
type Step = 0 | 1 | 2 | 3

const STEPS = ['paymentGatewayStepperOrder', 'paymentGatewayStepperMethod', 'paymentGatewayStepperConfirm', 'paymentGatewayStepperDone'] as const

interface ExamCheckoutPageProps {
  examId: string
}

export function ExamCheckoutPage({ examId }: ExamCheckoutPageProps) {
  const navigate = useNavigate()
  const { t, lang } = useLang()

  const [exam, setExam] = useState<ExamItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<Step>(0)
  const [provider, setProvider] = useState<Provider | null>(null)

  const [payerName, setPayerName] = useState('')
  const [payerPhone, setPayerPhone] = useState('')
  const [payerEmail, setPayerEmail] = useState('')

  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!examId) return
      try {
        setLoading(true)
        setError('')
        const exams = await examService.getCatalog()
        if (!mounted) return
        const found = (exams as ExamItem[]).find((entry) => entry.id === examId) ?? null
        setExam(found)
      } catch (err) {
        if (!mounted) return
        setError(resolveUiErrorMessage(err, t, 'errorExamLoadFailed'))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    return () => { mounted = false }
  }, [examId, t])

  const handleConfirmPayment = async () => {
    if (!examId || !provider) return
    setProcessing(true)
    setError('')
    try {
      const checkout = await examService.checkout(examId, { provider, attempts: 1 })

      if (checkout.payment.status === 'paid') {
        setStep(3)
        setProcessing(false)
        return
      }

      const started = await paymentService.startSession(checkout.payment.id, {
        payerName: payerName.trim(),
        payerPhone: payerPhone.trim(),
        payerEmail: payerEmail.trim() || undefined,
        returnUrl: window.location.href,
        cancelUrl: window.location.href,
      })

      const redirectUrl = started.session.redirectUrl
      if (redirectUrl) {
        window.open(redirectUrl, '_blank', 'noopener,noreferrer')
      }

      navigate(`/payments/${checkout.payment.id}?kind=exam&resourceId=${encodeURIComponent(examId)}`)
    } catch (err) {
      if (err instanceof ApiError && err.code === 'FEATURE_DISABLED') {
        setError(resolveUiErrorMessage(err, t, 'errorFeatureDisabled'))
      } else {
        setError(resolveUiErrorMessage(err, t, 'errorCheckoutFailed'))
      }
    } finally {
      setProcessing(false)
    }
  }

  const handleDemoCheckout = async () => {
    if (!examId) return
    setProcessing(true)
    setError('')
    try {
      const checkout = await examService.checkout(examId, { provider: 'manual', attempts: 1 })
      if (checkout.payment.status === 'paid') {
        setStep(3)
      }
    } catch (err) {
      setError(resolveUiErrorMessage(err, t, 'errorCheckoutFailed'))
    } finally {
      setProcessing(false)
    }
  }

  const handleStartExam = async () => {
    if (!examId) return
    setProcessing(true)
    setError('')
    try {
      const started = await examService.startAttempt(examId)
      navigate(`/exam-attempts/${started.attempt.id}`)
    } catch (err) {
      setError(resolveUiErrorMessage(err, t, 'errorExamStartFailed'))
    } finally {
      setProcessing(false)
    }
  }

  const canProceedToConfirm = provider !== null
  const canConfirm = payerName.trim().length > 0 && payerPhone.trim().length > 0 && provider !== null

  return (
    <div className="page-content fade-in">
      <div className={pageStyles.header}>
        <h2 className={pageStyles.title}>{t('examCheckoutTitle')}</h2>
        <p className={pageStyles.subtitle}>{t('examCheckoutSubtitle')}</p>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {loading ? <Alert variant="info">{t('examCheckoutLoading')}</Alert> : null}
      {!loading && !exam ? <Alert variant="warning">{t('examCheckoutNotFound')}</Alert> : null}

      {exam ? (
        <div className={styles.page}>
          {/* ── Stepper ── */}
          <div className={styles.stepper}>
            {STEPS.map((key, i) => (
              <StepperItem key={key} index={i} label={t(key)} current={step} />
            ))}
          </div>

          {/* ── Step 0: Order Summary ── */}
          {step === 0 ? (
            <GlassCard padding={0}>
              <div className={styles.cardSection}>
                <h3 className={styles.sectionTitle}>{t('paymentGatewayOrderSummary')}</h3>
                <div className={styles.orderSummary}>
                  <div className={styles.orderRow}>
                    <span className={styles.orderLabel}>{exam.title}</span>
                    <span className={styles.orderValue}>{exam.requiredQuestionCount ?? 50} {t('questionsShort')}</span>
                  </div>
                  <div className={styles.orderRow}>
                    <span className={styles.orderLabel}>{t('examCatalogMetricDuration')}</span>
                    <span className={styles.orderValue}>{Math.floor(exam.durationSec / 60)} {t('minutesShort')}</span>
                  </div>
                  <div className={styles.orderRow}>
                    <span className={styles.orderLabel}>{t('examCatalogPassTag')}</span>
                    <span className={styles.orderValue}>{exam.passPercent}%</span>
                  </div>
                  <div className={styles.orderRow}>
                    <span className={styles.orderLabel}>{t('paymentGatewayAmount')}</span>
                    <span className={cn(styles.orderValue, styles.orderTotal)}>{formatUzs(exam.priceUzs, lang)}</span>
                  </div>
                </div>
              </div>
              <div className={styles.actions}>
                <Button className={styles.confirmBtn} onClick={() => setStep(1)}>
                  {t('continue')}
                </Button>
              </div>
            </GlassCard>
          ) : null}

          {/* ── Step 1: Payment Method ── */}
          {step === 1 ? (
            <GlassCard padding={0}>
              <div className={styles.cardSection}>
                <h3 className={styles.sectionTitle}>{t('paymentGatewaySelectMethod')}</h3>
                <div className={styles.methodList}>
                  <button
                    type="button"
                    className={cn(styles.methodCard, provider === 'click' && styles.selected)}
                    onClick={() => setProvider('click')}
                  >
                    <span className={cn(styles.methodLogo, styles.methodLogoClick)}>
                      <img src={clickLogo} alt="Click" className={styles.methodLogoImage} />
                    </span>
                    <div className={styles.methodInfo}>
                      <span className={styles.methodName}>Click</span>
                      <span className={styles.methodDesc}>{t('paymentGatewayClickDesc')}</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={cn(styles.methodCard, provider === 'payme' && styles.selected)}
                    onClick={() => setProvider('payme')}
                  >
                    <span className={cn(styles.methodLogo, styles.methodLogoPayme)}>
                      <img src={paymeLogo} alt="Payme" className={styles.methodLogoImage} />
                    </span>
                    <div className={styles.methodInfo}>
                      <span className={styles.methodName}>Payme</span>
                      <span className={styles.methodDesc}>{t('paymentGatewayPaymeDesc')}</span>
                    </div>
                  </button>
                </div>
              </div>
              <div className={styles.actions}>
                <Button variant="ghost" onClick={() => setStep(0)}>{t('back')}</Button>
                <Button className={styles.confirmBtn} onClick={() => setStep(2)} disabled={!canProceedToConfirm}>
                  {t('continue')}
                </Button>
              </div>
            </GlassCard>
          ) : null}

          {/* ── Step 2: Confirm & Pay ── */}
          {step === 2 ? (
            <GlassCard padding={0}>
              <div className={styles.cardSection}>
                <h3 className={styles.sectionTitle}>{t('paymentGatewayPayerDetails')}</h3>
                <div className={styles.formGrid}>
                  <Input
                    label={t('paymentGatewayFieldFullName')}
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    placeholder={t('paymentGatewayPlaceholderFullName')}
                  />
                  <Input
                    label={t('paymentGatewayFieldPhone')}
                    value={payerPhone}
                    onChange={(e) => setPayerPhone(e.target.value)}
                    placeholder="+998 XX XXX XX XX"
                  />
                  <Input
                    label={t('paymentGatewayFieldEmail')}
                    value={payerEmail}
                    onChange={(e) => setPayerEmail(e.target.value)}
                    placeholder="you@example.com"
                    fieldClassName={styles.fullWidth}
                  />
                </div>
              </div>
              <div className={styles.cardSection}>
                <div className={styles.orderSummary}>
                  <div className={styles.orderRow}>
                    <span className={styles.orderLabel}>{exam.title}</span>
                    <span className={styles.orderValue}>{formatUzs(exam.priceUzs, lang)}</span>
                  </div>
                  <div className={styles.orderRow}>
                    <span className={styles.orderLabel}>{t('checkoutProviderLabel')}</span>
                    <span className={styles.orderValue}>{provider === 'click' ? 'Click' : 'Payme'}</span>
                  </div>
                </div>
              </div>
              <div className={styles.actions}>
                <Button variant="ghost" onClick={() => setStep(1)}>{t('back')}</Button>
                <Button
                  className={styles.confirmBtn}
                  onClick={() => void handleConfirmPayment()}
                  disabled={!canConfirm || processing}
                >
                  {processing ? t('paymentGatewayStarting') : t('paymentGatewayConfirmPayment')}
                </Button>
              </div>
            </GlassCard>
          ) : null}

          {/* ── Step 3: Done ── */}
          {step === 3 ? (
            <div className={styles.successCard}>
              <span className={styles.successIcon}>✓</span>
              <h3 className={styles.successTitle}>{t('paymentGatewayVerifiedTitle')}</h3>
              <p className={styles.successHint}>{t('paymentGatewayVerifiedHint')}</p>
              <div className={styles.successActions}>
                <Button onClick={() => void handleStartExam()} disabled={processing}>
                  {t('paymentGatewayStartExamAttempt')}
                </Button>
                <Button variant="ghost" onClick={() => navigate('/exams')}>
                  {t('paymentGatewayBackToExams')}
                </Button>
              </div>
            </div>
          ) : null}

          {/* Demo shortcut for development */}
          {step < 3 ? (
            <div style={{ textAlign: 'center' }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleDemoCheckout()}
                disabled={processing}
              >
                {t('paymentGatewayConfirmDemo')}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/* ── Stepper sub-component ── */
function StepperItem({ index, label, current }: { index: number; label: string; current: number }) {
  const isDone = index < current
  const isActive = index === current
  return (
    <>
      {index > 0 ? <div className={cn(styles.stepLine, isDone && styles.stepLineDone)} /> : null}
      <div className={cn(styles.stepItem, isActive && styles.active, isDone && styles.done)}>
        <span className={styles.stepCircle}>{isDone ? '✓' : index + 1}</span>
        <span className={styles.stepLabel}>{label}</span>
      </div>
    </>
  )
}

export default ExamCheckoutPage
