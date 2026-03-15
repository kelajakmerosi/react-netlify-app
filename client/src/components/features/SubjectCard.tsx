import type { ReactNode } from 'react'
import { CheckCircle2, PlayCircle } from 'lucide-react'
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
  actionLabel?: string
  secondaryActions?: ReactNode[]
  topAction?: ReactNode
  visualKey?: string
}

export function SubjectCard({
  subject,
  name,
  completed,
  total,
  pct: _pct,
  onClick,
  actionLabel,
  secondaryActions = [],
  topAction,
  visualKey,
}: SubjectCardProps) {
  const { t } = useLang()
  const safeName = typeof name === 'string' ? name : String(name ?? '')
  const safeTotal = Number.isFinite(total) ? total : 0
  const safeCompleted = Number.isFinite(completed) ? completed : 0
  const visual = getSubjectVisual(visualKey ?? subject.visualKey ?? subject.id)
  const Icon = visual.Icon

  return (
    <CatalogCard
      variant="default"
      className={styles.card}
      mediaBackground={visual.media}
      mediaIcon={<Icon size={42} aria-hidden="true" />}
      mediaImageUrl={subject.imageUrl || visual.imageUrl}
      mediaImageAlt={subject.imageUrl ? `${safeName} card image` : visual.imageAlt}
      topAction={topAction}
      onClick={onClick}
      clickLabel={`${actionLabel || t('continue')}: ${safeName}`}
      subtitle={`${safeCompleted}/${safeTotal} ${t('completed')}`}
      title={safeName}
      description={`${safeTotal} ${t('lessons')}`}
      metaItems={[
        { icon: <PlayCircle size={12} aria-hidden="true" />, text: `${safeTotal} ${t('lessons')}` },
        { icon: <CheckCircle2 size={12} aria-hidden="true" />, text: `${safeCompleted}/${safeTotal} ${t('completed')}` },
      ]}
      actions={[
        <Button key="continue" size="sm" onClick={onClick} className={styles.actionBtn}>
          {actionLabel || t('continue')} <ArrowRight size={14} aria-hidden="true" />
        </Button>,
        ...secondaryActions,
      ]}
    >
      {subject.sections && subject.sections.length > 0 ? (
        <div className={styles.sectionsContainer}>
          <p className={styles.sectionLabel}>{t('sections')}</p>
          <ul className={styles.sectionList}>
            {subject.sections.map((section) => (
              <li key={section.id} className={styles.sectionItem}>
                {section.title}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </CatalogCard>
  )
}
