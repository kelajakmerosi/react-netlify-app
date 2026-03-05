import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert } from '../components/ui'
import { Button } from '../components/ui/Button'
import { GlassCard } from '../components/ui/GlassCard'
import { Select } from '../components/ui/Select'
import examService from '../services/exam.service'
import { ApiError } from '../services/api'
import { useLang } from '../hooks'
import { formatUzs } from '../utils'
import { resolveUiErrorMessage } from '../utils/errorPresentation'
import styles from './ExamPages.module.css'

interface ExamItem {
  id: string
  title: string
  description?: string
  priceUzs: number
  durationSec: number
  passPercent: number
  requiredQuestionCount?: number
}

export function ExamCheckoutPage() {
  const navigate = useNavigate()
  const { examId } = useParams<{ examId: string }>()
  const { t, lang } = useLang()
  const [exam, setExam] = useState<ExamItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [provider, setProvider] = useState<'manual' | 'payme' | 'click'>('manual')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

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

  const handleContinueCheckout = async () => {
    if (!examId) return
    setProcessing(true)
    setError('')
    setNotice('')
    try {
      const checkout = await examService.checkout(examId, { provider, attempts: 1 })

      if (provider === 'manual' && checkout.payment.status === 'paid') {
        const started = await examService.startAttempt(examId)
        navigate(`/exam-attempts/${started.attempt.id}`)
        return
      }

      navigate(`/payments/${checkout.payment.id}?kind=exam&resourceId=${encodeURIComponent(examId)}`)
    } catch (err) {
      setError(resolveUiErrorMessage(err, t, 'errorCheckoutFailed'))
    } finally {
      setProcessing(false)
    }
  }

  const handleTryStart = async () => {
    if (!examId) return
    setProcessing(true)
    setError('')
    setNotice('')
    try {
      const started = await examService.startAttempt(examId)
      navigate(`/exam-attempts/${started.attempt.id}`)
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EXAM_ENTITLEMENT_MISSING') {
        setNotice(t('examCheckoutNoEntitlement'))
        return
      }
      setError(resolveUiErrorMessage(err, t, 'errorExamStartFailed'))
    } finally {
      setProcessing(false)
    }
  }

  if (!examId) return <div className="page-content"><Alert variant="error">{t('examCheckoutInvalidExamId')}</Alert></div>

  return (
    <div className="page-content fade-in">
      <div className={styles.header}>
        <h2 className={styles.title}>{t('examCheckoutTitle')}</h2>
        <p className={styles.subtitle}>{t('examCheckoutSubtitle')}</p>
      </div>

      {loading ? <Alert variant="info">{t('examCheckoutLoading')}</Alert> : null}
      {error ? <Alert variant="error">{error}</Alert> : null}
      {notice ? <Alert variant="info">{notice}</Alert> : null}
      {!loading && !exam ? <Alert variant="warning">{t('examCheckoutNotFound')}</Alert> : null}

      {exam ? (
        <GlassCard padding={18} className={styles.panel}>
          <div className={styles.cardHead}>
            <div className={styles.titleRow}>
              <h3 className={styles.cardTitle}>{exam.title}</h3>
              <p className={styles.cardDescription}>{exam.description || t('commonNoDescription')}</p>
            </div>
            <span className={styles.cardBadge}>{t('examCheckoutSecureBadge')}</span>
          </div>
          <div className={styles.meta}>
            <span className={styles.metaItem}>{Math.floor(exam.durationSec / 60)} {t('minutesShort')}</span>
            <span className={styles.metaItem}>{exam.passPercent}% {t('examCatalogPassTag')}</span>
            <span className={styles.metaItem}>{exam.requiredQuestionCount ?? 50} {t('questionsShort')}</span>
          </div>
          <div className={styles.providerBox}>
            <Select
              label={t('checkoutProviderLabel')}
              value={provider}
              onChange={(event) => setProvider(event.target.value as 'manual' | 'payme' | 'click')}
              helperText={provider === 'manual'
                ? t('checkoutProviderHintManual')
                : t('checkoutProviderHintGateway')}
            >
              <option value="manual">{t('checkoutProviderManual')}</option>
              <option value="payme">Payme</option>
              <option value="click">Click</option>
            </Select>
          </div>
          <div className={styles.actions}>
            <Button onClick={() => void handleContinueCheckout()} disabled={processing}>
              {processing ? t('checkoutProcessing') : provider === 'manual' ? t('examCheckoutPayAndStart') : t('checkoutContinueToPayment')}
            </Button>
            <Button variant="ghost" onClick={() => void handleTryStart()} disabled={processing}>
              {t('examCheckoutStartIfUnlocked')}
            </Button>
            <div className={styles.priceBox}>
              <span className={styles.priceLabel}>{t('priceLabel')}</span>
              <strong className={styles.priceValue}>{formatUzs(exam.priceUzs, lang)}</strong>
            </div>
          </div>
        </GlassCard>
      ) : null}
    </div>
  )
}

export default ExamCheckoutPage
