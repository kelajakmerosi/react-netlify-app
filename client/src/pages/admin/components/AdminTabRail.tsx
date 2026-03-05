import type { CSSProperties, ReactNode } from 'react'
import { SegmentedControl } from '../../../components/ui'
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
    <SegmentedControl
      options={tabs.map((tab) => ({ id: tab.id, label: tab.label }))}
      value={active}
      onChange={onChange}
      ariaLabel={ariaLabel}
      className={styles.tabRailSegmented}
      style={{ '--admin-tab-count': String(Math.max(1, tabs.length)) } as CSSProperties}
    />
  )
}

export default AdminTabRail
