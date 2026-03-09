import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert } from '../components/ui'
import { Button } from '../components/ui/Button'
import { GlassCard } from '../components/ui/GlassCard'
import { Skeleton } from '../components/ui/Skeleton'
import { PageHero } from '../components/ui/PageHero'
import { CatalogCard } from '../components/features/CatalogCard'
import { useAuth } from '../hooks/useAuth'
import { useLang } from '../hooks'
import adminService from '../services/admin.service'
import examService from '../services/exam.service'
import { formatUzs } from '../utils'
import { resolveUiErrorMessage } from '../utils/errorPresentation'
import { getSubjectVisual } from '../utils/subjectVisuals'
import { Clock3, CircleCheckBig, FileQuestion } from 'lucide-react'
import styles from './ExamPages.module.css'

interface ExamItem {
  id: string
  subjectId: string
  title: string
  description?: string
  priceUzs: number
  durationSec: number
  passPercent: number
  requiredQuestionCount?: number
  purchased?: boolean
  attemptsRemaining?: number
}

export function ExamCatalogPage() {
  const navigate = useNavigate()
  const { user, isGuest } = useAuth()
  const { t, lang } = useLang()
  const [loading, setLoading] = useState(true)
  const [bootstrapping, setBootstrapping] = useState(false)
  const [startingExamId, setStartingExamId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [items, setItems] = useState<ExamItem[]>([])

  const canBootstrapDemo = user?.role === 'admin' || user?.role === 'superadmin'

  const loadCatalog = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const exams = await examService.getCatalog()
      setItems(exams as ExamItem[])
    } catch (err) {
      setError(resolveUiErrorMessage(err, t, 'errorExamCatalogLoadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadCatalog()
  }, [loadCatalog])

  const handleBootstrap = async () => {
    if (bootstrapping) return
    try {
      setBootstrapping(true)
      setError('')
      await adminService.bootstrapDemoDataset()
      await loadCatalog()
    } catch (err) {
      setError(resolveUiErrorMessage(err, t, 'errorDemoBootstrapFailed'))
    } finally {
      setBootstrapping(false)
    }
  }

  const hasItems = useMemo(() => items.length > 0, [items.length])
  const avgDuration = useMemo(() => {
    if (!items.length) return 0
    return Math.round(items.reduce((acc, item) => acc + Math.floor(item.durationSec / 60), 0) / items.length)
  }, [items])

  const handlePurchase = useCallback((examId: string) => {
    navigate(`/exams/${examId}`)
  }, [navigate])

  const handleStartExam = useCallback(async (examId: string) => {
    if (startingExamId) return
    try {
      setStartingExamId(examId)
      setError('')
      const started = await examService.startAttempt(examId)
      navigate(`/exam-attempts/${started.attempt.id}`)
    } catch (err) {
      setError(resolveUiErrorMessage(err, t, 'errorExamStartFailed'))
    } finally {
      setStartingExamId(null)
    }
  }, [navigate, startingExamId, t])

  return (
    <div className="page-content fade-in">
      <PageHero
        eyebrow={t('exams')}
        title={t('examCatalogTitle')}
        subtitle={t('examCatalogSubtitle')}
        icon={<FileQuestion aria-hidden="true" />}
        metrics={[
          { label: t('examCatalogMetricPublished'), value: items.length, icon: <FileQuestion aria-hidden="true" /> },
          { label: t('examCatalogMetricDuration'), value: `${avgDuration || 0} ${t('minutesShort')}`, icon: <Clock3 aria-hidden="true" /> },
          { label: t('examCatalogMetricPolicy'), value: '80%', icon: <CircleCheckBig aria-hidden="true" /> },
        ]}
      />

      {isGuest && (
        <Alert variant="warning" className={styles.emptyCard}>{t('guestWarning')} — {t('loginToSave')}</Alert>
      )}

      {error ? <Alert variant="error">{error}</Alert> : null}

      {!loading && !hasItems ? (
        <div className={styles.emptyState}>
          <GlassCard padding={18} className={styles.emptyCard}>
            <h3 className={styles.emptyTitle}>{t('examCatalogEmptyTitle')}</h3>
            <p className={styles.emptyHint}>{t('examCatalogEmptyHint')}</p>
          </GlassCard>
          {canBootstrapDemo ? (
            <Button onClick={handleBootstrap} disabled={bootstrapping}>
              {bootstrapping ? t('demoBootstrapPreparing') : t('demoBootstrapAction')}
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className={styles.grid}>
        {loading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <GlassCard key={`exam-skeleton-${idx}`} padding={16} className={styles.skeletonCard}>
              <Skeleton width="100%" height={140} borderRadius={8} style={{ marginBottom: 16 }} />
              <div className={styles.skeletonBody}>
                <Skeleton width="40%" height={12} style={{ marginBottom: 8 }} />
                <Skeleton width="80%" height={24} style={{ marginBottom: 12 }} />
                <Skeleton width="100%" height={16} />
                <Skeleton width="60%" height={16} style={{ marginTop: 8 }} />
                <div className={styles.skeletonMetaRow}>
                  <Skeleton width={60} height={20} borderRadius={10} />
                  <Skeleton width={60} height={20} borderRadius={10} />
                  <Skeleton width={60} height={20} borderRadius={10} />
                </div>
              </div>
              <div className={styles.skeletonFooter}>
                <Skeleton width={120} height={40} borderRadius={8} />
                <div className={styles.skeletonPriceWrap}>
                  <Skeleton width={40} height={12} style={{ marginBottom: 4 }} />
                  <Skeleton width={80} height={20} />
                </div>
              </div>
            </GlassCard>
          ))
        ) : null}

        {items.map((item) => {
          const visual = getSubjectVisual(item.subjectId)
          const Icon = visual.Icon
          const isOwned = item.purchased === true

          return (
            <CatalogCard
              key={item.id}
              variant={isOwned ? 'owned' : 'default'}
              className={styles.examCatalogCard}
              mediaBackground={visual.media}
              mediaLabel={isOwned ? t('examCatalogPurchased') : t('exams')}
              mediaIcon={<Icon size={42} />}
              mediaImageUrl={visual.imageUrl}
              mediaImageAlt={visual.imageAlt}
              subtitle={t('examCatalogBadgeAttestation')}
              title={item.title}
              description={item.description || t('commonNoDescription')}
              rating={{
                value: Number((Math.max(4, Math.min(5, item.passPercent / 20 + 0.8))).toFixed(1)),
                votes: `(${item.requiredQuestionCount ?? 50})`,
              }}
              metaItems={[
                { icon: <Clock3 size={13} />, text: `${Math.floor(item.durationSec / 60)} ${t('minutesShort')}` },
                { icon: <CircleCheckBig size={13} />, text: `${item.passPercent}% ${t('examCatalogPassTag')}` },
                { icon: <FileQuestion size={13} />, text: `${item.requiredQuestionCount ?? 50} ${t('questionsShort')}` },
              ]}
              actions={isOwned ? [
                <Button
                  key="start"
                  onClick={() => void handleStartExam(item.id)}
                  disabled={startingExamId === item.id}
                >
                  {startingExamId === item.id ? t('paymentGatewayStarting') : t('examCatalogActionStart')}
                </Button>,
              ] : [
                <Button
                  key="checkout"
                  onClick={() => handlePurchase(item.id)}
                >
                  {t('examCatalogActionCheckout')}
                </Button>,
              ]}
              price={isOwned ? undefined : {
                label: t('priceLabel'),
                value: formatUzs(item.priceUzs, lang),
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

export default ExamCatalogPage
