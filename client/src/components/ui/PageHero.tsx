import type { ReactNode } from 'react'
import { cn } from '../../utils'
import styles from './PageHero.module.css'

interface PageHeroMetric {
  label: string
  value: string | number
  icon?: ReactNode
}

interface PageHeroProps {
  eyebrow: string
  title: string
  subtitle: string
  icon: ReactNode
  metrics: PageHeroMetric[]
  actions?: ReactNode
  className?: string
}

export function PageHero({
  eyebrow,
  title,
  subtitle,
  icon,
  metrics,
  actions,
  className,
}: PageHeroProps) {
  return (
    <section className={cn(styles.hero, className)}>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.title}>
          <span className={styles.titleIcon}>{icon}</span>
          <span>{title}</span>
        </h1>
        <p className={styles.subtitle}>{subtitle}</p>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>

      <div className={styles.metrics}>
        {metrics.map((metric) => (
          <div key={metric.label} className={styles.metric}>
            <span className={styles.metricLabel}>
              {metric.icon ? <span className={styles.metricIcon}>{metric.icon}</span> : null}
              {metric.label}
            </span>
            <strong className={styles.metricValue}>{metric.value}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}

export default PageHero
