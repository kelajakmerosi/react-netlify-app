import { GlassCard }    from '../ui/GlassCard'
import { ProgressBar }  from '../ui/index'
import type { Subject } from '../../types'
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
  return (
    <GlassCard className={styles.card} onClick={onClick}>
      <div className={styles.iconWrap} style={{ background: subject.gradient }}>
        <span className={styles.icon}>{subject.icon}</span>
      </div>

      <h3 className={styles.name} style={{ color: subject.color }}>{name}</h3>
      <p className={styles.meta}>{total} topics</p>

      <ProgressBar value={pct} color={subject.gradient} height={8} />

      <div className={styles.footer}>
        <span className={styles.metaSmall}>{completed}/{total} done</span>
        <span className={styles.pct} style={{ color: subject.color }}>{pct}%</span>
      </div>
    </GlassCard>
  )
}
