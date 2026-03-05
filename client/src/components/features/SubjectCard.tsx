import type { CSSProperties } from 'react'
import { GlassCard }    from '../ui/GlassCard'
import { ProgressBar }  from '../ui/index'
import { useLang } from '../../hooks'
import type { Subject } from '../../types'
import { renderSafeIcon } from '../../utils/renderSafeIcon'
import styles           from './SubjectCard.module.css'

interface SubjectCardProps {
  subject:      Subject
  name:         string
  completed:    number
  total:        number
  pct:          number
  onClick:      () => void
}

export function SubjectCard({ subject, name, completed, total, pct, onClick }: SubjectCardProps) {
  const { t } = useLang()

  return (
    <GlassCard
      className={styles.card}
      onClick={onClick}
      style={{ '--subject-color': subject.color } as CSSProperties}
    >
      <div className={styles.iconWrap} style={{ background: subject.gradient }}>
        <span className={styles.icon}>{renderSafeIcon(subject.icon)}</span>
      </div>

      <h3 className={styles.name} style={{ color: subject.color }}>{name}</h3>
      <p className={styles.meta}>{total} {t('lessons')}</p>

      <ProgressBar value={pct} color={subject.gradient} height={8} />

      <div className={styles.footer}>
        <span className={styles.metaSmall}>{completed}/{total} {t('completed')}</span>
        <span className={styles.pct} style={{ color: subject.color }}>{pct}%</span>
      </div>
    </GlassCard>
  )
}
