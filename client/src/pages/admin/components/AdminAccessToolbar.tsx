import { ShieldMinus, ShieldPlus } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import styles from '../AdminWorkspace.module.css'

interface AdminAccessToolbarProps {
  search: string
  roleFilter: 'all' | 'admin' | 'superadmin' | 'student'
  destructiveMode: boolean
  identity: string
  loading?: boolean
  onSearchChange: (value: string) => void
  onRoleFilterChange: (value: 'all' | 'admin' | 'superadmin' | 'student') => void
  onDestructiveModeChange: (value: boolean) => void
  onIdentityChange: (value: string) => void
  onGrant: () => void
  onRevoke: () => void
  labels: {
    searchPlaceholder: string
    all: string
    admins: string
    superadmins: string
    students: string
    destructive: string
    identityPlaceholder: string
    grant: string
    revoke: string
  }
}

export function AdminAccessToolbar({
  search,
  roleFilter,
  destructiveMode,
  identity,
  loading = false,
  onSearchChange,
  onRoleFilterChange,
  onDestructiveModeChange,
  onIdentityChange,
  onGrant,
  onRevoke,
  labels,
}: AdminAccessToolbarProps): JSX.Element {
  return (
    <div className={styles.userToolbar}>
      <div className={styles.userToolbarRow}>
        <input
          className={styles.input}
          placeholder={labels.searchPlaceholder}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />

        <select
          className={styles.input}
          value={roleFilter}
          onChange={(event) => onRoleFilterChange(event.target.value as 'all' | 'admin' | 'superadmin' | 'student')}
        >
          <option value="all">{labels.all}</option>
          <option value="admin">{labels.admins}</option>
          <option value="superadmin">{labels.superadmins}</option>
          <option value="student">{labels.students}</option>
        </select>

        <label className={styles.toggleWrap}>
          <input
            type="checkbox"
            checked={destructiveMode}
            onChange={(event) => onDestructiveModeChange(event.target.checked)}
          />
          <span>{labels.destructive}</span>
        </label>
      </div>

      <div className={styles.userToolbarRow}>
        <input
          className={styles.input}
          placeholder={labels.identityPlaceholder}
          value={identity}
          onChange={(event) => onIdentityChange(event.target.value)}
        />
        <Button variant="primary" disabled={loading} onClick={onGrant}>
          <ShieldPlus size={16} aria-hidden="true" />
          {labels.grant}
        </Button>
        <Button variant="ghost" disabled={loading} onClick={onRevoke}>
          <ShieldMinus size={16} aria-hidden="true" />
          {labels.revoke}
        </Button>
      </div>
    </div>
  )
}

export default AdminAccessToolbar
