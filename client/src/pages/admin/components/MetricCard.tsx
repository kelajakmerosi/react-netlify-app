import { GlassCard } from '../../../components/ui/GlassCard'
import styles from '../AdminWorkspace.module.css'

interface MetricCardProps {
  label: string
  value: string | number
  helper?: string
}

export function MetricCard({ label, value, helper }: MetricCardProps): JSX.Element {
  return (
    <GlassCard className={styles.metricCard} padding={18}>
      <p className={styles.metricLabel}>{label}</p>
      <p className={styles.metricValue}>{value}</p>
      {helper ? <p className={styles.metricHelper}>{helper}</p> : null}
    </GlassCard>
  )
}

export default MetricCard
