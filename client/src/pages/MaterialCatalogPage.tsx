import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert } from '../components/ui'
import { Button } from '../components/ui/Button'
import { GlassCard } from '../components/ui/GlassCard'
import { useAuth } from '../hooks/useAuth'
import { useLang } from '../hooks'
import adminService from '../services/admin.service'
import materialService from '../services/material.service'
import { formatUzs } from '../utils'
import { resolveUiErrorMessage } from '../utils/errorPresentation'
import { Download, HardDriveDownload, Package2, ShoppingCart, ShieldCheck } from 'lucide-react'
import styles from './ExamPages.module.css'

interface MaterialItem {
  id: string
  title: string
  description?: string
  priceUzs: number
}

export function MaterialCatalogPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t, lang } = useLang()
  const [loading, setLoading] = useState(true)
  const [bootstrapping, setBootstrapping] = useState(false)
  const [error, setError] = useState('')
  const [items, setItems] = useState<MaterialItem[]>([])

  const canBootstrapDemo = user?.role === 'admin' || user?.role === 'superadmin'

  const loadCatalog = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const packs = await materialService.getCatalog()
      setItems(packs as MaterialItem[])
    } catch (err) {
      setError(resolveUiErrorMessage(err, t, 'errorMaterialCatalogLoadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadCatalog()
  }, [loadCatalog])

  const hasItems = useMemo(() => items.length > 0, [items.length])

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

  return (
    <div className="page-content fade-in">
      <div className={styles.header}>
        <h2 className={styles.title}>{t('materialCatalogTitle')}</h2>
        <p className={styles.subtitle}>{t('materialCatalogSubtitle')}</p>
        <div className={styles.headerActions}>
          <Button variant="ghost" onClick={() => navigate('/materials/library')}>{t('materialCatalogOpenLibrary')}</Button>
        </div>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className={styles.summaryGrid}>
        {loading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <GlassCard key={`material-summary-skeleton-${idx}`} padding={14} className={styles.summarySkeleton}>
              <div className={styles.summarySkeletonLineLg} />
              <div className={styles.summarySkeletonLine} />
              <div className={styles.summarySkeletonLineSm} />
            </GlassCard>
          ))
        ) : (
          <>
            <GlassCard padding={14} className={styles.summaryCard}>
              <p className={styles.summaryLabel}>{t('materialCatalogMetricPacks')}</p>
              <p className={styles.summaryValue}>{items.length}</p>
              <p className={styles.summaryHint}>{t('materialCatalogMetricPacksHint')}</p>
            </GlassCard>
            <GlassCard padding={14} className={styles.summaryCard}>
              <p className={styles.summaryLabel}>{t('materialCatalogMetricAccess')}</p>
              <p className={styles.summaryValue}>{t('materialCatalogMetricAccessValue')}</p>
              <p className={styles.summaryHint}>{t('materialCatalogMetricAccessHint')}</p>
            </GlassCard>
            <GlassCard padding={14} className={styles.summaryCard}>
              <p className={styles.summaryLabel}>{t('materialCatalogMetricDelivery')}</p>
              <p className={styles.summaryValue}><Download size={17} /></p>
              <p className={styles.summaryHint}>{t('materialCatalogMetricDeliveryHint')}</p>
            </GlassCard>
          </>
        )}
      </div>

      {!loading && !hasItems ? (
        <div className={styles.emptyState}>
          <GlassCard padding={18} className={styles.emptyCard}>
            <h3 className={styles.emptyTitle}>{t('materialCatalogEmptyTitle')}</h3>
            <p className={styles.emptyHint}>{t('materialCatalogEmptyHint')}</p>
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
            <GlassCard key={`material-skeleton-${idx}`} padding={16} className={styles.skeletonCard}>
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
              <p className={styles.cardMediaText}>{t('materialCatalogMetricDeliveryHint')}</p>
              <span className={styles.cardMediaIcon}><HardDriveDownload size={16} /></span>
            </div>
            <div className={styles.cardHead}>
              <div className={styles.titleRow}>
                <h3 className={styles.cardTitle}>{item.title}</h3>
                <p className={styles.cardDescription}>{item.description || t('commonNoDescription')}</p>
              </div>
              <span className={styles.cardBadge}><Package2 size={14} /> {t('materialCatalogBadge')}</span>
            </div>
            <div className={styles.meta}>
              <span className={styles.metaItem}><ShieldCheck size={13} /> {t('materialCatalogOwnedForever')}</span>
            </div>
            <div className={styles.actions}>
              <Button onClick={() => navigate(`/materials/${item.id}`)}><ShoppingCart size={15} /> {t('materialCatalogActionBuy')}</Button>
              <Button variant="ghost" onClick={() => navigate(`/materials/${item.id}`)}>{t('materialCatalogActionDetails')}</Button>
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

export default MaterialCatalogPage
