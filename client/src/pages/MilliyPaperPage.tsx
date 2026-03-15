import { useEffect, useMemo, useState } from 'react'
import { BookOpenCheck, CalendarDays, CircleCheckBig, Clock3, ShieldCheck, ShoppingCart, Wallet, TestTube2 } from 'lucide-react'
import { Alert, MathText, PageHeader } from '../components/ui'
import { Button } from '../components/ui/Button'
import { GlassCard } from '../components/ui/GlassCard'
import { useLang } from '../hooks'
import { useToast } from '../app/providers/ToastProvider'
import useLearnerSubjects from '../hooks/useLearnerSubjects'
import type { ExamCatalogItem } from '../services/exam.service'
import examService from '../services/exam.service'
import { resolveUiErrorMessage } from '../utils/errorPresentation'
import { formatUzs } from '../utils'
import styles from './MilliyPaperFlow.module.css'
import clickLogo from '../assets/click.jpg'
import paymeLogo from '../assets/payme.png'

type CheckoutProvider = 'payme' | 'click' | 'manual'

interface MilliyPaperPageProps {
  subjectId: string
  sectionId: string
  paperKey: string
  onBack: () => void
  onStartAttempt: (attemptId: string) => void
  onGoToPayment: (paymentId: string, examId: string) => void
}

const getPaperKey = (paper: ExamCatalogItem) => paper.topicId || paper.id

export function MilliyPaperPage({
  subjectId,
  sectionId,
  paperKey,
  onBack,
  onStartAttempt,
  onGoToPayment,
}: MilliyPaperPageProps) {
  const { t, lang } = useLang()
  const toast = useToast()
  const { byId } = useLearnerSubjects()
  const [paper, setPaper] = useState<ExamCatalogItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [provider, setProvider] = useState<CheckoutProvider>('click')

  const subject = byId.get(subjectId)
  const section = (subject?.sections ?? []).find((entry) => entry.id === sectionId && entry.type === 'milliy') ?? null

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const catalog = await examService.getCatalog({ subjectId, sectionType: 'milliy' })
        if (!active) return
        const nextPaper = catalog.find((entry) => getPaperKey(entry) === paperKey) ?? null
        setPaper(nextPaper)
      } catch (err) {
        if (!active) return
        setError(resolveUiErrorMessage(err, t, 'errorExamLoadFailed'))
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => { active = false }
  }, [paperKey, subjectId, t])

  const breadcrumbs = useMemo(() => ([
    { label: t('lessons'), onClick: onBack },
    { label: subject?.title || subjectId, onClick: onBack },
    { label: section?.title || 'Milliy sertifikat', onClick: onBack },
    { label: paper?.title || paperKey },
  ]), [onBack, paper?.title, paperKey, section?.title, subject?.title, subjectId, t])

  const handleCheckout = async () => {
    if (!paper) return

    try {
      setProcessing(true)
      setError('')
      if (paper.purchased || Number(paper.attemptsRemaining || 0) > 0) {
        const started = await examService.startAttempt(paper.id)
        onStartAttempt(started.attempt.id)
        return
      }

      if (Number(paper.priceUzs || 0) <= 0) {
        const started = await examService.startAttempt(paper.id)
        onStartAttempt(started.attempt.id)
        return
      }

      const checkout = await examService.checkout(paper.id, { provider, attempts: 1 })
      onGoToPayment(checkout.payment.id, paper.id)
    } catch (err) {
      const message = resolveUiErrorMessage(err, t, 'errorCheckoutFailed')
      setError(message)
      toast.error(message)
    } finally {
      setProcessing(false)
    }
  }

  if (!subject || !section) {
    return (
      <div className="page-content fade-in">
        <Alert variant="warning">Milliy sertifikat bo'limi topilmadi.</Alert>
        <div style={{ marginTop: 12 }}>
          <Button variant="ghost" onClick={onBack}>Ortga</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content fade-in">
      <PageHeader breadcrumbs={breadcrumbs} title="" />

      <div className={styles.detailGrid}>
        {error ? <Alert variant="warning">{error}</Alert> : null}
        {loading ? <Alert variant="info">Variant yuklanmoqda...</Alert> : null}

        {!loading && !paper ? (
          <GlassCard className={styles.detailCard}>
            <span className={styles.badge}>Topilmadi</span>
            <p className={styles.muted}>Bu variant hozircha o'quvchilar uchun mavjud emas.</p>
            <div className={styles.actionsRow}>
              <Button variant="ghost" onClick={onBack}>Bo'limga qaytish</Button>
            </div>
          </GlassCard>
        ) : null}

        {paper ? (
          <>
            <GlassCard className={styles.detailCard}>
              <div className={styles.badgeRow}>
                <span className={`${styles.badge} ${styles.badgePrimary}`}>
                  <CalendarDays size={14} /> 28.02.2026
                </span>
                <span className={styles.badge}><BookOpenCheck size={14} /> 2-smena</span>
                <span className={styles.badge}>{paper.requiredQuestionCount || 0} savol</span>
                {paper.purchased || Number(paper.attemptsRemaining || 0) > 0 ? (
                  <span className={`${styles.badge} ${styles.badgeSuccess}`}>
                    <CircleCheckBig size={14} /> Xarid qilingan
                  </span>
                ) : null}
              </div>

              <div>
                <h2 className={styles.heroTitle}>{paper.title}</h2>
                {paper.description ? (
                  <p className={styles.cardText} style={{ marginTop: '12px' }}>
                    <MathText>
                      {paper.description.includes('Barcha 45 ta savol')
                        ? "Ushbu imtihon formati haqiqiy Milliy Sertifikat standartlariga to'liq mos keladi. Barcha testlar va yozma topshiriqlar mutaxassislar tomonidan tuzilgan bo'lib, bilimingizni aniq va xolis baholash imkonini beradi."
                        : paper.description}
                    </MathText>
                  </p>
                ) : null}
              </div>

              <div className={styles.summaryStats}>
                <div className={styles.statBox}>
                   <Clock3 size={18} className={styles.statIcon} />
                   <div>
                     <div className={styles.statLabel}>Ajratilgan vaqt</div>
                     <div className={styles.statVal}>{Math.round((paper.durationSec || 0) / 60)} daq</div>
                   </div>
                </div>
                <div className={styles.statBox}>
                   <ShieldCheck size={18} className={styles.statIcon} />
                   <div>
                     <div className={styles.statLabel}>O'tish bali</div>
                     <div className={styles.statVal}>{paper.passPercent}%</div>
                   </div>
                </div>
                <div className={styles.statBox}>
                   <Wallet size={18} className={styles.statIcon} />
                   <div>
                     <div className={styles.statLabel}>Narx</div>
                     <div className={styles.statVal}>{Number(paper.priceUzs) > 0 ? formatUzs(paper.priceUzs || 0, lang) : 'Bepul'}</div>
                   </div>
                </div>
              </div>
            </GlassCard>

            {!paper.purchased && Number(paper.attemptsRemaining || 0) <= 0 ? (
              <GlassCard className={styles.detailCard}>
                <h3 className={styles.detailSectionTitle}>To'lov usulini tanlang</h3>
                <div className={styles.providerGrid}>
                  {([
                    ['click', 'Click', 'Tezkor to\'lov oynasi', clickLogo],
                    ['payme', 'Payme', 'Payme orqali to\'lash', paymeLogo],
                    ['manual', 'Demo', 'Demo tasdiq oqimi', TestTube2],
                  ] as const).map(([value, label, detail, Visual]) => (
                    <button
                      key={value}
                      type="button"
                      className={`${styles.providerBtn} ${provider === value ? styles.providerBtnActive : ''}`}
                      onClick={() => setProvider(value)}
                    >
                      <span className={styles.providerIcon} style={typeof Visual === 'string' ? { background: '#ffffff' } : undefined}>
                        {typeof Visual === 'string' ? (
                             <img src={Visual} alt={label} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '6px' }} />
                        ) : (
                             <Visual size={24} />
                        )}
                      </span>
                      <div className={styles.providerInfo}>
                        <div className={styles.providerName}>{label}</div>
                        <div className={styles.providerDesc}>{detail}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </GlassCard>
            ) : null}

            <GlassCard className={styles.detailCard} style={{ padding: '16px 24px' }}>
              <div className={styles.actionsRow}>
                <Button variant="ghost" onClick={onBack} disabled={processing}>
                  Ortga
                </Button>
                <Button onClick={() => void handleCheckout()} disabled={processing}>
                  {paper.purchased || Number(paper.attemptsRemaining || 0) > 0 ? (
                    'Testni boshlash'
                  ) : (
                    <>
                      <ShoppingCart size={18} />
                      Xaridni davom ettirish
                    </>
                  )}
                </Button>
              </div>
            </GlassCard>
          </>
        ) : null}
      </div>
    </div>
  )
}
