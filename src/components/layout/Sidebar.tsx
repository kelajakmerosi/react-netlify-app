import type { PageId } from '../../types'
import { useAuth } from '../../hooks/useAuth'
import { useLang } from '../../hooks'
import { Avatar }  from '../ui/index'
import { Button }  from '../ui/Button'
import styles      from './Sidebar.module.css'

interface SidebarProps {
  activePage:    PageId
  navigate:      (page: PageId) => void
  mobileOpen:    boolean
  onClose:       () => void
}

const NAV_ITEMS = [
  { id: 'dashboard' as PageId, icon: '⊞' },
  { id: 'subjects'  as PageId, icon: '📚' },
  { id: 'profile'   as PageId, icon: '👤' },
]

export function Sidebar({ activePage, navigate, mobileOpen, onClose }: SidebarProps) {
  const { user, isGuest, logout } = useAuth()
  const { t } = useLang()

  const handleNav = (page: PageId) => { navigate(page); onClose() }

  const pageLabels: Record<PageId, string> = {
    dashboard: t('dashboard'), subjects: t('subjects'), profile: t('profile'),
    subject: '', topic: '',
  }

  return (
    <>
      {mobileOpen && <div className="overlay" onClick={onClose} />}

      <aside className={`${styles.sidebar} ${mobileOpen ? styles.mobileOpen : ''}`}>
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoIcon}>KM</div>
          <span className="logo-text">KelajakMerosi</span>
        </div>

        {/* Nav */}
        <nav className={styles.nav}>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`${styles.navItem} ${activePage === item.id ? styles.navItemActive : ''}`}
              onClick={() => handleNav(item.id)}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {pageLabels[item.id]}
            </button>
          ))}
        </nav>

        {/* User footer */}
        <div className={styles.footer}>
          {user ? (
            <>
              <div className={styles.userRow}>
                <Avatar name={user.name} size={34} />
                <div className={styles.userInfo}>
                  <span className={styles.userName}>{user.name}</span>
                  <span className={styles.userRole}>Pro</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" fullWidth onClick={logout}
                style={{ marginTop: 10, justifyContent:'center' }}>
                🚪 {t('logout')}
              </Button>
            </>
          ) : (
            <div>
              <span className={styles.guestBadge}>👤 Guest</span>
              <p className={styles.guestNote}>{t('guestWarning')}</p>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
