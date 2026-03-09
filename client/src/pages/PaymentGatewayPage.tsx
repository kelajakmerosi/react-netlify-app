import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Alert, Input, Textarea } from '../components/ui'
import { Button } from '../components/ui/Button'
import { GlassCard } from '../components/ui/GlassCard'
import { useLang } from '../hooks'
import { useToast } from '../app/providers/ToastProvider'
import { ApiError } from '../services/api'
import examService from '../services/exam.service'
import paymentService from '../services/payment.service'
import { formatUzs } from '../utils'
import { resolveUiErrorMessage } from '../utils/errorPresentation'
import pageStyles from './ExamPages.module.css'
import styles from './PaymentGatewayPage.module.css'

type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
type PaymentProvider = 'manual' | 'payme' | 'click'

export function PaymentGatewayPage() {
  const navigate = useNavigate()
  const { paymentId } = useParams<{ paymentId: string }>()
  const [query] = useSearchParams()
  const { t, lang } = useLang()
  const toast = useToast()

  const resourceId = query.get('resourceId') || ''

  const [session, setSession] = useState<{
    payment: {
      id: string
      provider: PaymentProvider
      status: PaymentStatus
      amountUzs: number
      externalId: string
      paymentType: string
    }
    providerEnabled?: boolean
    requiredFields: Array<{ id: string; label: string; required: boolean }>
    redirectUrl?: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  const [payerName, setPayerName] = useState('')
  const [payerPhone, setPayerPhone] = useState('')
  const [payerEmail, setPayerEmail] = useState('')
  const [note, setNote] = useState('')

  const providerLabel = useMemo(() => {
    const provider = session?.payment.provider
    if (provider === 'payme') return 'Payme'
    if (provider === 'click') return 'Click'
    return t('checkoutProviderManualShort')
  }, [session?.payment.provider, t])

  const providerFieldLabel = (fieldId: string, defaultLabel: string) => {
    if (fieldId === 'payerName') return t('paymentGatewayFieldFullName')
    if (fieldId === 'payerPhone') return t('paymentGatewayFieldPhone')
    if (fieldId === 'payerEmail') return t('paymentGatewayFieldEmail')
    return defaultLabel
  }

  const loadSession = async () => {
    if (!paymentId) return
    try {
      setLoading(true)
      const payload = await paymentService.getSession(paymentId)
      setSession({
        payment: payload.payment,
        providerEnabled: payload.session.providerEnabled ?? true,
        requiredFields: payload.session.requiredFields ?? [],
        redirectUrl: payload.session.redirectUrl,
      })
    } catch (err) {
      toast.error(resolveUiErrorMessage(err, t, 'errorPaymentSessionLoadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSession()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId])

  useEffect(() => {
    if (!session || session.payment.status !== 'pending') return undefined

    const interval = window.setInterval(() => {
      void loadSession()
    }, 8000)

    return () => window.clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.payment.status, paymentId])

  const statusClass = useMemo(() => {
    if (!session) return styles.statusPending
    if (session.payment.status === 'paid') return styles.statusPaid
    if (session.payment.status === 'failed' || session.payment.status === 'refunded') return styles.statusFailed
    return styles.statusPending
  }, [session])

  const continueAfterPaid = async () => {
    if (!session || session.payment.status !== 'paid') return

    if (!resourceId) {
      navigate('/exams')
      return
    }

    try {
      setProcessing(true)
      const started = await examService.startAttempt(resourceId)
      navigate(`/exam-attempts/${started.attempt.id}`)
    } catch (err) {
      toast.error(resolveUiErrorMessage(err, t, 'errorExamStartFailed'))
    } finally {
      setProcessing(false)
    }
  }

  const startProviderPayment = async () => {
    if (!paymentId || !session) return

    setProcessing(true)
    try {
      const payload = await paymentService.startSession(paymentId, {
        payerName: payerName.trim(),
        payerPhone: payerPhone.trim(),
        payerEmail: payerEmail.trim() || undefined,
        note: note.trim() || undefined,
        returnUrl: window.location.href,
        cancelUrl: window.location.href,
      })

      const nextUrl = payload.session.redirectUrl
      if (nextUrl) {
        window.open(nextUrl, '_blank', 'noopener,noreferrer')
        toast.info(t('paymentGatewayProviderOpened'))
      } else {
        toast.info(t('paymentGatewayProviderRedirectMissing'))
      }

      await loadSession()
    } catch (err) {
      if (err instanceof ApiError && err.code === 'FEATURE_DISABLED') {
        toast.error(resolveUiErrorMessage(err, t, 'errorFeatureDisabled'))
        return
      }
      toast.error(resolveUiErrorMessage(err, t, 'errorPaymentSessionStartFailed'))
    } finally {
      setProcessing(false)
    }
  }

  const handleConfirmDemo = async () => {
    if (!paymentId) return
    setProcessing(true)
    try {
      await paymentService.confirmDemo(paymentId)
      toast.info(t('paymentGatewayDemoConfirmed'))
      await loadSession()
    } catch (err) {
      toast.error(resolveUiErrorMessage(err, t, 'errorPaymentConfirmFailed'))
    } finally {
      setProcessing(false)
    }
  }

  if (!paymentId) return <div className="page-content"><Alert variant="error">{t('paymentGatewayInvalidPaymentId')}</Alert></div>

  return (
    <div className="page-content fade-in">
      <div className={pageStyles.header}>
        <h2 className={pageStyles.title}>{t('paymentGatewayTitle')}</h2>
        <p className={pageStyles.subtitle}>{t('paymentGatewaySubtitle')}</p>
      </div>

      {loading ? <Alert variant="info">{t('paymentGatewayLoading')}</Alert> : null}
      {!loading && !session ? <Alert variant="warning">{t('paymentGatewayNotFound')}</Alert> : null}

      {session ? (
        <div className={styles.layout}>
          <div className={styles.mainCol}>
            <GlassCard padding={20} className={styles.card}>
              <span className={`${styles.statusPill} ${statusClass}`}>
                {t(`paymentStatus${session.payment.status[0].toUpperCase()}${session.payment.status.slice(1)}`)}
              </span>
              <h3 className={styles.sectionTitle}>{t('paymentGatewayPayerDetails')}</h3>
              <p className={styles.muted}>
                {t('paymentGatewayProviderLine').replace('{provider}', providerLabel)}
              </p>

              <div className={styles.formGrid}>
                <Input
                  label={t('paymentGatewayFieldFullName')}
                  value={payerName}
                  onChange={(event) => setPayerName(event.target.value)}
                  placeholder={t('paymentGatewayPlaceholderFullName')}
                />
                <Input
                  label={t('paymentGatewayFieldPhone')}
                  value={payerPhone}
                  onChange={(event) => setPayerPhone(event.target.value)}
                  placeholder="+998 XX XXX XX XX"
                />
                <Input
                  label={t('paymentGatewayFieldEmail')}
                  value={payerEmail}
                  onChange={(event) => setPayerEmail(event.target.value)}
                  placeholder="you@example.com"
                />
                <Textarea
                  label={t('paymentGatewayFieldNote')}
                  fieldClassName={styles.fullWidth}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={t('paymentGatewayPlaceholderNote')}
                  rows={3}
                />
              </div>

              <div className={styles.actions}>
                <Button
                  onClick={() => void startProviderPayment()}
                  disabled={
                    processing
                    || session.payment.status === 'paid'
                    || !payerName.trim()
                    || !payerPhone.trim()
                    || !session.providerEnabled
                  }
                >
                  {processing ? t('paymentGatewayStarting') : t('paymentGatewayContinueProvider').replace('{provider}', providerLabel)}
                </Button>
                <Button variant="ghost" onClick={() => void loadSession()} disabled={processing}>
                  {t('paymentGatewayRefreshStatus')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => void handleConfirmDemo()}
                  disabled={processing || session.payment.status === 'paid'}
                >
                  {t('paymentGatewayConfirmDemo')}
                </Button>
              </div>
            </GlassCard>

            {session.payment.status === 'paid' ? (
              <GlassCard padding={20} className={styles.card}>
                <h3 className={styles.sectionTitle}>{t('paymentGatewayVerifiedTitle')}</h3>
                <p className={styles.muted}>{t('paymentGatewayVerifiedHint')}</p>
                <div className={styles.actions}>
                  <Button onClick={() => void continueAfterPaid()} disabled={processing}>
                    {t('paymentGatewayStartExamAttempt')}
                  </Button>
                </div>
              </GlassCard>
            ) : null}
          </div>

          <div className={styles.sideCol}>
            <GlassCard padding={18} className={styles.card}>
              <h3 className={styles.sectionTitle}>{t('paymentGatewayOrderSummary')}</h3>
              <div className={styles.kv}>
                <div className={styles.kvRow}><span>{t('paymentGatewayPaymentId')}</span><strong>{session.payment.id.slice(0, 8)}...</strong></div>
                <div className={styles.kvRow}><span>{t('paymentGatewayExternalId')}</span><strong>{session.payment.externalId}</strong></div>
                <div className={styles.kvRow}><span>{t('checkoutProviderLabel')}</span><strong>{providerLabel}</strong></div>
                <div className={styles.kvRow}><span>{t('priceLabel')}</span><strong>{formatUzs(session.payment.amountUzs, lang)}</strong></div>
              </div>
            </GlassCard>

            <GlassCard padding={18} className={styles.card}>
              <h3 className={styles.sectionTitle}>{t('paymentGatewayStepsTitle')}</h3>
              <ol className={styles.stepList}>
                <li>{t('paymentGatewayStep1')}</li>
                <li>{t('paymentGatewayStep2').replace('{provider}', providerLabel)}</li>
                <li>{t('paymentGatewayStep3')}</li>
                <li>{t('paymentGatewayStep4')}</li>
              </ol>
            </GlassCard>

            <GlassCard padding={18} className={styles.card}>
              <h3 className={styles.sectionTitle}>{t('paymentGatewayRequiredFields')}</h3>
              {session.requiredFields.length ? (
                <ul className={styles.stepList}>
                  {session.requiredFields.map((field) => (
                    <li key={field.id}>
                      {providerFieldLabel(field.id, field.label)}{field.required ? ` (${t('required')})` : ` (${t('optional')})`}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.muted}>{t('paymentGatewayNoExtraFields')}</p>
              )}
            </GlassCard>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default PaymentGatewayPage
