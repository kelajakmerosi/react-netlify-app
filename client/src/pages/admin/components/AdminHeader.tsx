import { Clock3, Download, RefreshCcw } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import styles from '../AdminWorkspace.module.css'

interface AdminHeaderProps {
  title: string
  subtitle: string
  lastUpdatedLabel: string
  refreshLabel: string
  refreshingLabel: string
  exportLabel: string
  loading?: boolean
  onRefresh: () => void
  onExport: () => void
}

export function AdminHeader({
  title,
  subtitle,
  lastUpdatedLabel,
  refreshLabel,
  refreshingLabel,
  exportLabel,
  loading = false,
  onRefresh,
  onExport,
}: AdminHeaderProps): JSX.Element {
  return (
    <header className={styles.adminHeader}>
      <div>
        <h2 className={styles.pageTitle}>{title}</h2>
        <p className={styles.pageSubtitle}>{subtitle}</p>
      </div>
      <div className={styles.headerActions}>
        <span className={styles.lastUpdated}>
          <Clock3 size={14} aria-hidden="true" />
          {lastUpdatedLabel}
        </span>
        <Button variant="ghost" onClick={onExport}>
          <Download size={16} aria-hidden="true" />
          {exportLabel}
        </Button>
        <Button variant="primary" disabled={loading} onClick={onRefresh}>
          <RefreshCcw size={16} aria-hidden="true" />
          {loading ? refreshingLabel : refreshLabel}
        </Button>
      </div>
    </header>
  )
}

export default AdminHeader
