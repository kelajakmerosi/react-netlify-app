import { ThemeToggle }      from '../ui/ThemeToggle'
import { LanguageSwitcher } from '../ui/LanguageSwitcher'
import { useLang }          from '../../hooks'
import type { PageId }      from '../../types'
import styles               from './Topbar.module.css'

interface TopbarProps {
  activePage:    PageId
  onMenuToggle:  () => void
}

export function Topbar({ activePage, onMenuToggle }: TopbarProps) {
  const { t } = useLang()

  const titles: Partial<Record<PageId, string>> = {
    dashboard: t('dashboard'),
    subjects:  t('subjects'),
    subject:   t('subjects'),
    profile:   t('profile'),
    topic:     t('topics'),
  }

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <button className={styles.hamburger} onClick={onMenuToggle} aria-label="Menu">
          <span /><span /><span />
        </button>
        <h1 className={styles.title}>{titles[activePage] ?? ''}</h1>
      </div>

      <div className={styles.right}>
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
  )
}
