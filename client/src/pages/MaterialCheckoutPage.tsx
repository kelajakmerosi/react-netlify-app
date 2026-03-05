import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert } from '../components/ui'
import { Button } from '../components/ui/Button'
import { GlassCard } from '../components/ui/GlassCard'
import { Select } from '../components/ui/Select'
import materialService from '../services/material.service'
import { useLang } from '../hooks'
import { formatUzs } from '../utils'
import { resolveUiErrorMessage } from '../utils/errorPresentation'
import styles from './ExamPages.module.css'

interface MaterialItem {
  id: string
  title: string
  description?: string
  priceUzs: number
}

type Provider = 'manual' | 'payme' | 'click'

export function MaterialCheckoutPage() {
  const navigate = useNavigate()
  const { packId } = useParams<{ packId: string }>()
  const { t, lang } = useLang()
  const [pack, setPack] = useState<MaterialItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [provider, setProvider] = useState<Provider>('manual')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!packId) return
      try {
        setLoading(true)
        setError('')
        const packs = await materialService.getCatalog()
        if (!mounted) return
        const found = (packs as MaterialItem[]).find((entry) => entry.id === packId) ?? null
        setPack(found)
      } catch (err) {
        if (!mounted) return
        setError(resolveUiErrorMessage(err, t, 'errorMaterialPackLoadFailed'))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    return () => { mounted = false }
  }, [packId, t])

  const providerHint = useMemo(() => {
    if (provider === 'manual') return t('checkoutProviderHintManual')
    return t('checkoutProviderHintGateway')
  }, [provider, t])

  const handleCheckout = async () => {
    if (!packId) return
    setProcessing(true)
    setError('')
    setNotice('')
    try {
      const payload = await materialService.checkout(packId, { provider })
      if (provider === 'manual' && payload.payment.status === 'paid') {
        navigate('/materials/library')
        return
      }

      navigate(`/payments/${payload.payment.id}?kind=material&resourceId=${encodeURIComponent(packId)}`)
    } catch (err) {
      setError(resolveUiErrorMessage(err, t, 'errorCheckoutFailed'))
    } finally {
      setProcessing(false)
    }
  }

  if (!packId) return <div className="page-content"><Alert variant="error">{t('materialCheckoutInvalidPackId')}</Alert></div>

  return (
    <div className="page-content fade-in">
      <div className={styles.header}>
        <h2 className={styles.title}>{t('materialCheckoutTitle')}</h2>
        <p className={styles.subtitle}>{t('materialCheckoutSubtitle')}</p>
      </div>

      {loading ? <Alert variant="info">{t('materialCheckoutLoading')}</Alert> : null}
      {error ? <Alert variant="error">{error}</Alert> : null}
      {notice ? <Alert variant="info">{notice}</Alert> : null}
      {!loading && !pack ? <Alert variant="warning">{t('materialCheckoutNotFound')}</Alert> : null}

      {pack ? (
        <GlassCard padding={18} className={styles.panel}>
          <div className={styles.cardHead}>
            <div className={styles.titleRow}>
              <h3 className={styles.cardTitle}>{pack.title}</h3>
              <p className={styles.cardDescription}>{pack.description || t('commonNoDescription')}</p>
            </div>
            <span className={styles.cardBadge}>{t('materialCheckoutSecureBadge')}</span>
          </div>
          <div className={styles.meta}>
            <span className={styles.metaItem}>{t('materialCatalogOwnedForever')}</span>
          </div>

          <div className={styles.providerBox}>
            <Select
              label={t('checkoutProviderLabel')}
              value={provider}
              onChange={(event) => setProvider(event.target.value as Provider)}
              helperText={providerHint}
            >
              <option value="manual">{t('checkoutProviderManual')}</option>
              <option value="payme">Payme</option>
              <option value="click">Click</option>
            </Select>
          </div>

          <div className={styles.actions}>
            <Button onClick={() => void handleCheckout()} disabled={processing}>
              {processing ? t('checkoutProcessing') : provider === 'manual' ? t('materialCheckoutPayAndUnlock') : t('checkoutContinueToPayment')}
            </Button>
            <Button variant="ghost" onClick={() => navigate('/materials/library')} disabled={processing}>
              {t('materialCatalogOpenLibrary')}
            </Button>
            <div className={styles.priceBox}>
              <span className={styles.priceLabel}>{t('priceLabel')}</span>
              <strong className={styles.priceValue}>{formatUzs(pack.priceUzs, lang)}</strong>
            </div>
          </div>
        </GlassCard>
      ) : null}
    </div>
  )
}

export default MaterialCheckoutPage
