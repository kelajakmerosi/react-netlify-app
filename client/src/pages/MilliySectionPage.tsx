import { useEffect, useMemo, useState } from 'react'
import { BookOpenCheck, CalendarDays, CircleAlert, Clock3, ShieldCheck, Wallet } from 'lucide-react'
import { Alert, MathText, PageHeader } from '../components/ui'
import { Button } from '../components/ui/Button'
import { GlassCard } from '../components/ui/GlassCard'
import { useLang } from '../hooks'
import useLearnerSubjects from '../hooks/useLearnerSubjects'
import type { ExamCatalogItem } from '../services/exam.service'
import examService from '../services/exam.service'
import { formatUzs } from '../utils'
import { resolveUiErrorMessage } from '../utils/errorPresentation'
import styles from './MilliyPaperFlow.module.css'

interface MilliySectionPageProps {
  subjectId: string
  sectionId: string
  onBack: () => void
  onOpenPaper: (paperKey: string) => void
}

const getPaperKey = (paper: ExamCatalogItem) => paper.topicId || paper.id

export function MilliySectionPage({ subjectId, sectionId, onBack, onOpenPaper }: MilliySectionPageProps) {
  const { t, lang } = useLang()
  const { byId } = useLearnerSubjects()
  const [papers, setPapers] = useState<ExamCatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
        setPapers(catalog.filter((entry) => getPaperKey(entry)))
      } catch (err) {
        if (!active) return
        setError(resolveUiErrorMessage(err, t, 'errorExamLoadFailed'))
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => { active = false }
  }, [subjectId, t])

  const breadcrumbs = useMemo(() => ([
    { label: t('lessons'), onClick: onBack },
    { label: subject?.title || subjectId, onClick: onBack },
    { label: section?.title || 'Milliy sertifikat' },
  ]), [onBack, section?.title, subject?.title, subjectId, t])

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
      <PageHeader
        breadcrumbs={breadcrumbs}
        title=""
      />

      <div className={styles.shell}>
        <GlassCard className={styles.hero}>
          <div className={styles.badgeRow}>
            <span className={`${styles.badge} ${styles.badgePrimary}`}>Milliy sertifikat</span>
          </div>
          <h2 className={styles.heroTitle}>{subject.title}</h2>
          <p className={styles.heroText}>
            Fan bo'yicha milliy sertifikat variantlari shu yerda jamlanadi. Faqat chop etilgan variantlar o'quvchilarga ko'rinadi.
          </p>
          <div className={styles.heroMeta}>
            <span><BookOpenCheck size={16} /> {papers.length} ta variant</span>
            <span><ShieldCheck size={16} /> Faqat tasdiqlangan variantlar</span>
            <span><CalendarDays size={16} /> Matematika bo'yicha alohida oqim</span>
          </div>
        </GlassCard>

        {error ? <Alert variant="warning">{error}</Alert> : null}
        {loading ? <Alert variant="info">Variantlar yuklanmoqda...</Alert> : null}

        {!loading && !error && papers.length === 0 ? (
          <GlassCard className={styles.card}>
            <span className={`${styles.badge} ${styles.badgeWarning}`}>
              <CircleAlert size={14} /> Hozircha ochiq variant yo'q
            </span>
            <p className={styles.muted}>
              Admin draft holatidagi variantlarni tayyorlayapti. Variant chop etilgach shu yerda paydo bo'ladi.
            </p>
          </GlassCard>
        ) : null}

        {!loading && papers.length > 0 ? (
          <div className={styles.grid}>
            {papers.map((paper) => (
              <GlassCard key={paper.id} className={styles.card}>
                <div className={styles.badgeRow}>
                  <span className={styles.badge}>Variant</span>
                  <span className={`${styles.badge} ${styles.badgePrimary}`}>{paper.requiredQuestionCount || 0} savol</span>
                </div>

                <div>
                  <h3 className={styles.cardTitle}>{paper.title}</h3>
                  {paper.description ? (
                    <p className={styles.cardText}>
                      <MathText>
                        {paper.description.includes('Barcha 45 ta savol')
                          ? "Ushbu imtihon formati haqiqiy Milliy Sertifikat standartlariga to'liq mos keladi. Barcha testlar va yozma topshiriqlar mutaxassislar tomonidan tuzilgan bo'lib, bilimingizni aniq va xolis baholash imkonini beradi."
                          : paper.description}
                      </MathText>
                    </p>
                  ) : null}
                </div>

                <div className={styles.metaRow}>
                  <span className={styles.metaItem}><Clock3 size={16} /> {Math.round((paper.durationSec || 0) / 60)} daqiqa</span>
                  <span className={styles.metaItem}><ShieldCheck size={16} /> {paper.passPercent}% o'tish</span>
                  <span className={styles.metaItem}><Wallet size={16} /> {Number(paper.priceUzs) > 0 ? formatUzs(paper.priceUzs || 0, lang) : 'Bepul'}</span>
                </div>

                <div className={styles.actionsRow}>
                  <Button onClick={() => onOpenPaper(getPaperKey(paper))}>
                    Tafsilotlar
                  </Button>
                </div>
              </GlassCard>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
