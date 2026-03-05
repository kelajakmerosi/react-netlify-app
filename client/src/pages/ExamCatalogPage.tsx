import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert } from '../components/ui'
import { Button } from '../components/ui/Button'
import { GlassCard } from '../components/ui/GlassCard'
import { useAuth } from '../hooks/useAuth'
import { useLang } from '../hooks'
import adminService from '../services/admin.service'
import examService from '../services/exam.service'
import { formatUzs } from '../utils'
import { resolveUiErrorMessage } from '../utils/errorPresentation'
import { Clock3, CircleCheckBig, CreditCard, FileQuestion, Sparkles } from 'lucide-react'
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

export function ExamCatalogPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t, lang } = useLang()
  const [loading, setLoading] = useState(true)
  const [bootstrapping, setBootstrapping] = useState(false)
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

  return (
    <div className="page-content fade-in">
      <div className={styles.header}>
        <h2 className={styles.title}>{t('examCatalogTitle')}</h2>
        <p className={styles.subtitle}>{t('examCatalogSubtitle')}</p>
        <div className={styles.headerActions}>
          <Button variant="ghost" onClick={() => navigate('/materials')}>{t('examCatalogBrowseMaterials')}</Button>
          <Button variant="ghost" onClick={() => navigate('/materials/library')}>{t('examCatalogOpenLibrary')}</Button>
        </div>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className={styles.summaryGrid}>
        {loading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <GlassCard key={`exam-summary-skeleton-${idx}`} padding={14} className={styles.summarySkeleton}>
              <div className={styles.summarySkeletonLineLg} />
              <div className={styles.summarySkeletonLine} />
              <div className={styles.summarySkeletonLineSm} />
            </GlassCard>
          ))
        ) : (
          <>
            <GlassCard padding={14} className={styles.summaryCard}>
              <p className={styles.summaryLabel}>{t('examCatalogMetricPublished')}</p>
              <p className={styles.summaryValue}>{items.length}</p>
              <p className={styles.summaryHint}>{t('examCatalogMetricPublishedHint')}</p>
            </GlassCard>
            <GlassCard padding={14} className={styles.summaryCard}>
              <p className={styles.summaryLabel}>{t('examCatalogMetricDuration')}</p>
              <p className={styles.summaryValue}>{avgDuration || 0} {t('minutesShort')}</p>
              <p className={styles.summaryHint}>{t('examCatalogMetricDurationHint')}</p>
            </GlassCard>
            <GlassCard padding={14} className={styles.summaryCard}>
              <p className={styles.summaryLabel}>{t('examCatalogMetricPolicy')}</p>
              <p className={styles.summaryValue}>80%</p>
              <p className={styles.summaryHint}>{t('examCatalogMetricPolicyHint')}</p>
            </GlassCard>
          </>
        )}
      </div>

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

      <div className={`${styles.grid} ${!loading && items.length === 1 ? styles.gridSingle : ''}`}>
        {loading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <GlassCard key={`exam-skeleton-${idx}`} padding={16} className={styles.skeletonCard}>
              <div className={styles.skeletonMedia} />
              <div className={styles.skeletonLineLg} />
              <div className={styles.skeletonLine} />
              <div className={styles.skeletonLineSm} />
            </GlassCard>
          ))
        ) : null}

        {items.map((item) => (
          <GlassCard key={item.id} padding={16} className={styles.examCard}>
            <div className={styles.cardMedia}>
              <p className={styles.cardMediaText}>{t('examCatalogMetricPolicyHint')}</p>
              <span className={styles.cardMediaIcon}><CreditCard size={16} /></span>
            </div>
            <div className={styles.cardHead}>
              <div className={styles.titleRow}>
                <h3 className={styles.cardTitle}>{item.title}</h3>
                <p className={styles.cardDescription}>{item.description || t('commonNoDescription')}</p>
              </div>
              <span className={styles.cardBadge}><Sparkles size={14} /> {t('examCatalogBadgeAttestation')}</span>
            </div>
            <div className={styles.meta}>
              <span className={styles.metaItem}><Clock3 size={13} /> {Math.floor(item.durationSec / 60)} {t('minutesShort')}</span>
              <span className={styles.metaItem}><CircleCheckBig size={13} /> {item.passPercent}% {t('examCatalogPassTag')}</span>
              <span className={styles.metaItem}><FileQuestion size={13} /> {item.requiredQuestionCount ?? 50} {t('questionsShort')}</span>
            </div>
            <div className={styles.actions}>
              <Button onClick={() => navigate(`/exams/${item.id}`)}>{t('examCatalogActionCheckout')}</Button>
              <Button variant="ghost" onClick={() => navigate(`/exams/${item.id}`)}>{t('examCatalogActionDetails')}</Button>
              <div className={styles.priceBox}>
                <span className={styles.priceLabel}>{t('priceLabel')}</span>
                <strong className={styles.priceValue}>{formatUzs(item.priceUzs, lang)}</strong>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}

export default ExamCatalogPage
