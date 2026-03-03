import { ShieldX, Trash2 } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import type { AdminUserSummary } from '../../../services/admin.service'
import styles from '../AdminWorkspace.module.css'

interface AdminsTableProps {
  rows: AdminUserSummary[]
  loading?: boolean
  destructiveMode: boolean
  emptyLabel: string
  labels: {
    loading: string
    name: string
    email: string
    phone: string
    source: string
    actions: string
    demote: string
    delete: string
    sourceNone: string
    sourceAllowlist: string
    sourceDbRole: string
    sourceBoth: string
    sourceFallback: string
  }
  onDemote: (user: AdminUserSummary) => void
  onDelete: (user: AdminUserSummary) => void
}

export function AdminsTable({
  rows,
  loading = false,
  destructiveMode,
  emptyLabel,
  labels,
  onDemote,
  onDelete,
}: AdminsTableProps): JSX.Element {
  const sourceLabel = (source: AdminUserSummary['adminSource']) => {
    switch (source) {
      case 'none':
        return labels.sourceNone
      case 'allowlist':
        return labels.sourceAllowlist
      case 'db_role':
        return labels.sourceDbRole
      case 'both':
        return labels.sourceBoth
      default:
        return labels.sourceFallback
    }
  }

  if (loading) return <div className={styles.emptyState}>{labels.loading}</div>
  if (rows.length === 0) return <div className={styles.emptyState}>{emptyLabel}</div>

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{labels.name}</th>
            <th>{labels.email}</th>
            <th>{labels.phone}</th>
            <th>{labels.source}</th>
            <th>{labels.actions}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((entry) => (
            <tr key={entry.id}>
              <td>{entry.name}</td>
              <td>{entry.email ?? '—'}</td>
              <td>{entry.phone ?? '—'}</td>
              <td>
                <span className={styles.adminTag}>{sourceLabel(entry.adminSource)}</span>
              </td>
              <td>
                <div className={styles.actionRow}>
                  <Button variant="ghost" size="sm" onClick={() => onDemote(entry)}>
                    <ShieldX size={14} aria-hidden="true" />
                    {labels.demote}
                  </Button>
                  <Button variant="danger" size="sm" disabled={!destructiveMode} onClick={() => onDelete(entry)}>
                    <Trash2 size={14} aria-hidden="true" />
                    {labels.delete}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default AdminsTable
