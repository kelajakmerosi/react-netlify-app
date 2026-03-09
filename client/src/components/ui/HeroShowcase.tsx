import type { ReactNode } from 'react'
import { cn } from '../../utils'
import styles from './HeroShowcase.module.css'

type HeroMetric = {
  label: string
  value: string
}

interface HeroShowcaseProps {
  eyebrow: string
  title: string
  subtitle: string
  metrics?: HeroMetric[]
  actions?: ReactNode
  className?: string
}

const chartHeights = ['34%', '72%', '44%', '88%', '56%', '79%', '62%']

const DeviceScreen = ({ includeChart = true }: { includeChart?: boolean }) => (
  <div className={styles.screen}>
    <div className={styles.screenTop}>
      <span className={styles.dot} />
      <span className={styles.dot} />
      <span className={styles.dot} />
    </div>
    <div className={styles.screenBody}>
      <div className={styles.barLg} />
      <div className={styles.bar} />
      <div className={styles.barSm} />
      {includeChart ? (
        <div className={styles.chart}>
          {chartHeights.map((height, idx) => (
            <span key={`chart-col-${idx}`} className={styles.chartCol} style={{ height }} />
          ))}
        </div>
      ) : null}
    </div>
  </div>
)

export function HeroShowcase({
  eyebrow,
  title,
  subtitle,
  metrics = [],
  actions,
  className,
}: HeroShowcaseProps) {
  return (
    <section className={cn(styles.hero, className)}>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.subtitle}>{subtitle}</p>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
        {metrics.length ? (
          <div className={styles.stats}>
            {metrics.map((metric) => (
              <div key={metric.label} className={styles.stat}>
                <span className={styles.statValue}>{metric.value}</span>
                <span className={styles.statLabel}>{metric.label}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div className={styles.visual} aria-hidden="true">
        <div className={styles.desktop}>
          <DeviceScreen />
        </div>
        <div className={styles.tablet}>
          <DeviceScreen />
        </div>
        <div className={styles.phone}>
          <DeviceScreen includeChart={false} />
        </div>
      </div>
    </section>
  )
}

export default HeroShowcase
