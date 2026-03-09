import type { ReactNode } from 'react'
import { GlassCard } from '../../../components/ui/GlassCard'
import { cn } from '../../../utils'
import styles from '../AdminWorkspace.module.css'

interface MetricCardProps {
  label: string
  value: string | number
  helper?: string
  icon?: ReactNode
  trend?: {
    value: number
    label: string
    positive?: boolean
  }
}

export function MetricCard({ label, value, helper, icon, trend }: MetricCardProps): JSX.Element {
  return (
    <GlassCard className={styles.metricCard} padding={18}>
      <div className={styles.metricHeaderWrap}>
        <p className={styles.metricLabel}>{label}</p>
        {icon && <div className={styles.metricIconWrap}>{icon}</div>}
      </div>
      <div className={styles.metricBodyWrap}>
        <p className={styles.metricValue}>{value}</p>
        {trend && (
          <div className={cn(styles.metricTrend, trend.positive ? styles.metricTrendPos : styles.metricTrendNeg)}>
            <span className={styles.metricTrendValue}>
              {trend.positive ? '+' : ''}{trend.value}%
            </span>
            <span className={styles.metricTrendLabel}>{trend.label}</span>
          </div>
        )}
      </div>
      {helper ? <p className={styles.metricHelper}>{helper}</p> : null}
    </GlassCard>
  )
}

export default MetricCard
