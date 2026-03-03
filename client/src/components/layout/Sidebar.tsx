import { useLocation, useNavigate } from 'react-router-dom'
import type { PageId } from '../../types'
import { useAuth } from '../../hooks/useAuth'
import { useLang } from '../../hooks'
import { cn } from '../../utils'
import { Avatar } from '../ui/index'
import { Button } from '../ui/Button'
import styles from './Sidebar.module.css'
import { LayoutDashboard, BookOpen, User, LogOut, Shield } from 'lucide-react'

interface SidebarProps {
  mobileOpen: boolean
  onClose: () => void
}

const NAV_ITEMS = [
  { id: 'dashboard' as PageId, path: '/dashboard', icon: <LayoutDashboard size={20} /> },
  { id: 'subjects' as PageId, path: '/subjects', icon: <BookOpen size={20} /> },
  { id: 'profile' as PageId, path: '/profile', icon: <User size={20} /> },
  { id: 'admin' as PageId, path: '/admin', icon: <Shield size={20} />, adminOnly: true },
]

const resolveActivePage = (pathname: string): PageId => {
  if (pathname.startsWith('/subjects/')) return pathname.includes('/topics/') ? 'topic' : 'subject'
  if (pathname.startsWith('/subjects')) return 'subjects'
  if (pathname.startsWith('/profile')) return 'profile'
  if (pathname.startsWith('/admin')) return 'admin'
  return 'dashboard'
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { user, isGuest, logout } = useAuth()
  const { t } = useLang()
  const navigate = useNavigate()
  const location = useLocation()

  const activePage = resolveActivePage(location.pathname)

  const handleNav = (path: string) => {
    navigate(path)
    onClose()
  }

  return (
    <>
      {mobileOpen && <div className="overlay" onClick={onClose} />}

      <aside className={cn(styles.sidebar, mobileOpen && styles.mobileOpen)}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>KM</div>
          <span className={styles.logoText}>KelajakMerosi</span>
        </div>

        <nav className={styles.nav}>
          {NAV_ITEMS.filter(item => !item.adminOnly || user?.role === 'admin' || user?.role === 'superadmin').map(item => (
            <Button
              key={item.id}
              variant="nav"
              active={activePage === item.id}
              onClick={() => handleNav(item.path)}
              fullWidth
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {t(item.id as any)}
            </Button>
          ))}
        </nav>

        <div className={styles.footer}>
          {user ? (
            <>
              <div className={styles.userRow}>
                <Avatar name={user.name} size={34} />
                <div className={styles.userInfo}>
                  <span className={styles.userName}>{user.name}</span>
                  <span className={styles.userRole}>
                    {user.role === 'superadmin' ? t('superadmin') : (user.role === 'admin' ? t('admin') : t('learner'))}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                fullWidth
                onClick={logout}
                style={{ marginTop: 10, justifyContent: 'center', gap: 8 }}
              >
                <LogOut size={16} /> {t('logout')}
              </Button>
            </>
          ) : isGuest ? (
            <div>
              <span className={styles.guestBadge}>
                <User size={14} /> {t('guest')}
              </span>
              <Button
                variant="primary"
                size="sm"
                fullWidth
                onClick={logout}
                style={{ marginTop: 8, justifyContent: 'center' }}
              >
                {t('login')}
              </Button>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  )
}
