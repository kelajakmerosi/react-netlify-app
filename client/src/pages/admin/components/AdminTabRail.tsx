import type { CSSProperties, ReactNode } from 'react'
import type { AdminTab } from '../types'
import styles from '../AdminWorkspace.module.css'

interface TabItem {
  id: AdminTab
  label: string
  icon?: ReactNode
}

interface AdminTabRailProps {
  tabs: TabItem[]
  active: AdminTab
  onChange: (tab: AdminTab) => void
  ariaLabel: string
}

export function AdminTabRail({ tabs, active, onChange, ariaLabel }: AdminTabRailProps): JSX.Element {
  return (
    <div
      className={styles.tabRail}
      role="tablist"
      aria-label={ariaLabel}
      style={{ '--admin-tab-count': String(Math.max(1, tabs.length)) } as CSSProperties}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className={`${styles.tabItem} ${active === tab.id ? styles.tabItemActive : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon ? <span className={styles.tabItemIcon}>{tab.icon}</span> : null}
          <span className={styles.tabItemLabel}>{tab.label}</span>
        </button>
      ))}
    </div>
  )
}

export default AdminTabRail
