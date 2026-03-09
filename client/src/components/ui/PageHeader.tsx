import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '../../utils'
import styles from './PageHeader.module.css'

interface PageHeaderBreadcrumb {
  label: string
  onClick?: () => void
}

interface PageHeaderProps {
  breadcrumbs?: PageHeaderBreadcrumb[]
  title: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({
  breadcrumbs = [],
  title,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn(styles.header, className)}>
      <div className={styles.headerTitles}>
        {breadcrumbs.length > 0 && (
          <div className={styles.breadcrumb}>
            {breadcrumbs.map((crumb, idx) => (
              <div key={idx} className={styles.breadcrumbItem}>
                {crumb.onClick ? (
                  <button
                    type="button"
                    onClick={crumb.onClick}
                    className={styles.breadcrumbLink}
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className={styles.breadcrumbCurrent}>{crumb.label}</span>
                )}
                {idx < breadcrumbs.length - 1 && (
                  <ChevronRight size={14} className={styles.breadcrumbDivider} />
                )}
              </div>
            ))}
          </div>
        )}
        <h1 className={styles.title}>{title}</h1>
      </div>
      {actions && <div className={styles.headerActions}>{actions}</div>}
    </header>
  )
}

export default PageHeader
