import type { ReactNode } from 'react'
import { GlassCard } from '../../../components/ui/GlassCard'
import styles from '../AdminWorkspace.module.css'

interface SectionCardProps {
  title: string
  subtitle?: string
  right?: ReactNode
  children: ReactNode
  className?: string
}

export function SectionCard({ title, subtitle, right, children, className }: SectionCardProps): JSX.Element {
  return (
    <GlassCard className={`${styles.sectionCard} ${className ?? ''}`} padding={0}>
      <div className={styles.sectionHeader}>
        <div>
          <h3 className={styles.sectionTitle}>{title}</h3>
          {subtitle ? <p className={styles.sectionSubtitle}>{subtitle}</p> : null}
        </div>
        {right ? <div className={styles.sectionHeaderRight}>{right}</div> : null}
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </GlassCard>
  )
}

export default SectionCard
