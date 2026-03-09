import { BarChart3, CheckCircle2, PlayCircle } from 'lucide-react'
import { Button } from '../ui/Button'
import { useLang } from '../../hooks'
import type { Subject } from '../../types'
import { ArrowRight } from 'lucide-react'
import { getSubjectVisual } from '../../utils/subjectVisuals'
import { CatalogCard } from './CatalogCard'
import styles from './SubjectCard.module.css'

interface SubjectCardProps {
  subject: Subject
  name: string
  completed: number
  total: number
  pct: number
  onClick: () => void
}

export function SubjectCard({ subject, name, completed, total, pct, onClick }: SubjectCardProps) {
  const { t } = useLang()
  const safeName = typeof name === 'string' ? name : String(name ?? '')
  const safeTotal = Number.isFinite(total) ? total : 0
  const safeCompleted = Number.isFinite(completed) ? completed : 0
  const safePct = Number.isFinite(pct) ? pct : 0
  const visual = getSubjectVisual(subject.id)
  const Icon = visual.Icon

  return (
    <CatalogCard
      variant="default"
      className={styles.card}
      mediaBackground={visual.media}
      mediaIcon={<Icon size={42} aria-hidden="true" />}
      mediaImageUrl={visual.imageUrl}
      mediaImageAlt={visual.imageAlt}
      subtitle={`${safeCompleted}/${safeTotal} ${t('completed')}`}
      title={safeName}
      description={`${safeTotal} ${t('lessons')} • ${safePct}% ${t('progress')}`}
      rating={{ value: Math.max(3.8, Math.min(5, Number((safePct / 20 + 3.5).toFixed(1)))), votes: `(${safeTotal})` }}
      metaItems={[
        { icon: <PlayCircle size={12} aria-hidden="true" />, text: `${safeTotal} ${t('lessons')}` },
        { icon: <CheckCircle2 size={12} aria-hidden="true" />, text: `${safeCompleted}/${safeTotal} ${t('completed')}` },
        { icon: <BarChart3 size={12} aria-hidden="true" />, text: `${safePct}% ${t('progress')}` },
      ]}
      actions={[
        <Button key="continue" size="sm" onClick={onClick} className={styles.actionBtn}>
          {t('continue')} <ArrowRight size={14} aria-hidden="true" />
        </Button>,
      ]}
    />
  )
}
