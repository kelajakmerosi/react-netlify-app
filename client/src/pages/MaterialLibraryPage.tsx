import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert } from '../components/ui'
import { Button } from '../components/ui/Button'
import { GlassCard } from '../components/ui/GlassCard'
import { useAuth } from '../hooks/useAuth'
import { useLang } from '../hooks'
import adminService from '../services/admin.service'
import materialService from '../services/material.service'
import { resolveUiErrorMessage } from '../utils/errorPresentation'
import { Download, FolderCheck, HardDriveDownload, PackageCheck } from 'lucide-react'
import styles from './ExamPages.module.css'

interface LibraryAsset {
  id: string
  fileName: string
  storageKey: string
  access?: {
    url?: string | null
  }
}

interface LibraryEntry {
  entitlementId: string
  pack: {
    id: string
    title: string
    description: string
  }
  assets: LibraryAsset[]
}

export function MaterialLibraryPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useLang()
  const [loading, setLoading] = useState(true)
  const [bootstrapping, setBootstrapping] = useState(false)
  const [error, setError] = useState('')
  const [entries, setEntries] = useState<LibraryEntry[]>([])

  const canBootstrapDemo = user?.role === 'admin' || user?.role === 'superadmin'

  const loadLibrary = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const payload = await materialService.getLibrary()
      setEntries(payload as LibraryEntry[])
    } catch (err) {
      setError(resolveUiErrorMessage(err, t, 'errorMaterialLibraryLoadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadLibrary()
  }, [loadLibrary])

  const handleBootstrap = async () => {
    if (bootstrapping) return
    try {
      setBootstrapping(true)
      setError('')
      await adminService.bootstrapDemoDataset()
      await loadLibrary()
    } catch (err) {
      setError(resolveUiErrorMessage(err, t, 'errorDemoBootstrapFailed'))
    } finally {
      setBootstrapping(false)
    }
  }

  const totalAssets = entries.reduce((acc, entry) => acc + (entry.assets?.length || 0), 0)

  return (
    <div className="page-content fade-in">
      <div className={styles.header}>
        <h2 className={styles.title}>{t('materialLibraryTitle')}</h2>
        <p className={styles.subtitle}>{t('materialLibrarySubtitle')}</p>
        <div className={styles.headerActions}>
          <Button variant="ghost" onClick={() => navigate('/materials')}>{t('materialLibraryBrowseCatalog')}</Button>
        </div>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className={styles.summaryGrid}>
        {loading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <GlassCard key={`library-summary-skeleton-${idx}`} padding={14} className={styles.summarySkeleton}>
              <div className={styles.summarySkeletonLineLg} />
              <div className={styles.summarySkeletonLine} />
              <div className={styles.summarySkeletonLineSm} />
            </GlassCard>
          ))
        ) : (
          <>
            <GlassCard padding={14} className={styles.summaryCard}>
              <p className={styles.summaryLabel}>{t('materialLibraryMetricPacks')}</p>
              <p className={styles.summaryValue}>{entries.length}</p>
              <p className={styles.summaryHint}>{t('materialLibraryMetricPacksHint')}</p>
            </GlassCard>
            <GlassCard padding={14} className={styles.summaryCard}>
              <p className={styles.summaryLabel}>{t('materialLibraryMetricAssets')}</p>
              <p className={styles.summaryValue}>{totalAssets}</p>
              <p className={styles.summaryHint}>{t('materialLibraryMetricAssetsHint')}</p>
            </GlassCard>
            <GlassCard padding={14} className={styles.summaryCard}>
              <p className={styles.summaryLabel}>{t('materialLibraryMetricAccess')}</p>
              <p className={styles.summaryValue}>{t('materialLibraryMetricAccessValue')}</p>
              <p className={styles.summaryHint}>{t('materialLibraryMetricAccessHint')}</p>
            </GlassCard>
          </>
        )}
      </div>

      {!loading && entries.length === 0 ? (
        <div className={styles.emptyState}>
          <GlassCard padding={18} className={styles.emptyCard}>
            <h3 className={styles.emptyTitle}>{t('materialLibraryEmptyTitle')}</h3>
            <p className={styles.emptyHint}>{t('materialLibraryEmptyHint')}</p>
          </GlassCard>
          {canBootstrapDemo ? (
            <Button onClick={handleBootstrap} disabled={bootstrapping}>
              {bootstrapping ? t('demoBootstrapPreparing') : t('demoBootstrapAction')}
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className={`${styles.grid} ${!loading && entries.length === 1 ? styles.gridSingle : ''}`}>
        {loading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <GlassCard key={`library-skeleton-${idx}`} padding={16} className={styles.skeletonCard}>
              <div className={styles.skeletonMedia} />
              <div className={styles.skeletonLineLg} />
              <div className={styles.skeletonLine} />
              <div className={styles.skeletonLineSm} />
            </GlassCard>
          ))
        ) : null}

        {entries.map((entry) => (
          <GlassCard key={entry.entitlementId} padding={16} className={styles.examCard}>
            <div className={styles.cardMedia}>
              <p className={styles.cardMediaText}>{t('materialLibraryReadyToDownload')}</p>
              <span className={styles.cardMediaIcon}><Download size={16} /></span>
            </div>
            <div className={styles.cardHead}>
              <div className={styles.titleRow}>
                <h3 className={styles.cardTitle}>{entry.pack.title}</h3>
                <p className={styles.cardDescription}>{entry.pack.description || t('commonNoDescription')}</p>
              </div>
              <span className={styles.cardBadge}><PackageCheck size={14} /> {t('materialLibraryUnlockedBadge')}</span>
            </div>
            <div className={styles.libraryAssetList}>
              {(entry.assets || []).map((asset) => (
                <div key={asset.id} className={styles.libraryAssetRow}>
                  <div className={styles.libraryAssetName}>
                    <strong>{asset.fileName}</strong>
                    <span className={styles.libraryAssetMeta}>
                      {asset.access?.url ? t('materialLibraryReadyToDownload') : t('materialLibraryStorageKey')}
                    </span>
                  </div>
                  {asset.access?.url ? (
                    <Button
                      size="sm"
                      onClick={() => window.open(asset.access?.url || '', '_blank', 'noopener,noreferrer')}
                    >
                      <Download size={14} /> {t('materialLibraryDownload')}
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" disabled>
                      <HardDriveDownload size={14} /> {asset.storageKey}
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <div className={styles.actions}>
              <Button variant="ghost" onClick={() => navigate('/materials')}>
                <FolderCheck size={14} /> {t('materialLibraryFindMore')}
              </Button>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}

export default MaterialLibraryPage
