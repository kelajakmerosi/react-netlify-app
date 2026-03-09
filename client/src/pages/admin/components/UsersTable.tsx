import { Search, ShieldCheck, Trash2 } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import type { AdminUserSummary } from '../../../services/admin.service'
import styles from '../AdminWorkspace.module.css'

interface UsersTableProps {
  rows: AdminUserSummary[]
  loading?: boolean
  destructiveMode: boolean
  emptyLabel: string
  labels: {
    loading: string
    name: string
    email: string
    phone: string
    role: string
    actions: string
    promote: string
    delete: string
    roleStudent: string
    roleAdmin: string
  }
  onPromote: (user: AdminUserSummary) => void
  onDelete: (user: AdminUserSummary) => void
  onInspect: (user: AdminUserSummary) => void
}

export function UsersTable({
  rows,
  loading = false,
  destructiveMode,
  emptyLabel,
  labels,
  onPromote,
  onDelete,
  onInspect,
}: UsersTableProps): JSX.Element {
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
            <th>{labels.role}</th>
            <th>{labels.actions}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((entry) => (
            <tr key={entry.id}>
              <td>{entry.name}</td>
              <td>{entry.email ?? '—'}</td>
              <td>{entry.phone ?? '—'}</td>
              <td>{entry.role === 'admin' ? labels.roleAdmin : labels.roleStudent}</td>
              <td>
                <div className={styles.actionRow}>
                  <Button variant="ghost" size="sm" onClick={() => onInspect(entry)}>
                    <Search size={14} aria-hidden="true" />
                    Ko'rish
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onPromote(entry)}>
                    <ShieldCheck size={14} aria-hidden="true" />
                    {labels.promote}
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

export default UsersTable
