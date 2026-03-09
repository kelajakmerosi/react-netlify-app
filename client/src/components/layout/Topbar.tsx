import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../ui'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { useAuth } from '../../hooks/useAuth'
import { useLang, useTheme } from '../../hooks'
import type { LocaleKey } from '../../types'
import { SUPPORTED_LOCALES } from '../../app/i18n'
import type { PageId } from '../../types'
import styles from './Topbar.module.css'
import { Check, Languages, Menu, Moon, Settings, Sun } from 'lucide-react'

interface TopbarProps {
  activePage: PageId
  onMenuToggle: () => void
}

const LOCALE_LABELS: Record<LocaleKey, string> = {
  uz: "O'zbek",
  ru: 'Русский',
  en: 'English',
}

export function Topbar({ activePage, onMenuToggle }: TopbarProps) {
  const { user, logout } = useAuth()
  const { lang, t, changeLang } = useLang()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [langOpen, setLangOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)

  const roleLabel = useMemo(() => {
    if (!user?.role) return t('guest')
    if (user.role === 'student') return t('learner')
    return t(user.role)
  }, [t, user?.role])

  const title = useMemo(() => {
    if (activePage === 'dashboard') return t('myLearning')
    if (activePage === 'subjects' || activePage === 'subject' || activePage === 'topic') return t('lessons')
    if (activePage === 'exams' || activePage === 'exam' || activePage === 'examAttempt') return t('exams')
    if (activePage === 'profile') return t('profile')
    if (activePage === 'admin') return t('admin')
    return t('myLearning')
  }, [activePage, t])

  // Close lang dropdown on click-outside or Escape
  const closeLang = useCallback(() => setLangOpen(false), [])

  useEffect(() => {
    if (!langOpen) return undefined
    const onClickOutside = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) closeLang()
    }
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeLang()
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onEscape)
    }
  }, [langOpen, closeLang])

  return (
    <>
      <header className={styles.topbar}>
        <div className={styles.left}>
          <IconButton className={styles.hamburger} onClick={onMenuToggle} label={t('menu')} icon={<Menu size={19} />} />
          <h1 className={styles.pageTitle}>{title}</h1>
        </div>

        <div className={styles.right}>
          {/* Language Dropdown */}
          <div className={styles.langWrap} ref={langRef}>
            <IconButton
              icon={<Languages size={16} />}
              label={`${t('language')}: ${lang.toUpperCase()}`}
              onClick={() => setLangOpen((prev) => !prev)}
            />
            {langOpen && (
              <div className={styles.langDropdown}>
                {SUPPORTED_LOCALES.map((locale) => {
                  const active = locale === lang
                  return (
                    <button
                      key={locale}
                      type="button"
                      className={`${styles.langOption} ${active ? styles.langOptionActive : ''}`}
                      onClick={() => {
                        changeLang(locale)
                        setLangOpen(false)
                      }}
                    >
                      <span className={styles.langOptionLabel}>{LOCALE_LABELS[locale]}</span>
                      {active && <Check size={14} aria-hidden="true" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <IconButton
            icon={theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            label={t('theme')}
            onClick={toggleTheme}
          />
          <IconButton icon={<Settings size={16} />} label={t('settings')} onClick={() => setSettingsOpen(true)} />

          <div className={styles.divider} />

          <Button
            variant="ghost"
            size="none"
            className={styles.userMeta}
            onClick={() => navigate('/profile')}
            aria-label={t('profile')}
          >
            <Avatar name={user?.name || t('learner')} size={38} />
            <div className={styles.userCopy}>
              <strong>{user?.name || t('learner')}</strong>
              <span>{roleLabel}</span>
            </div>
          </Button>
        </div>
      </header>

      {/* Settings Modal — centered, clean */}
      <Modal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title={t('settings')}
        description={roleLabel}
        footer={(
          <>
            <Button variant="ghost" onClick={() => {
              setSettingsOpen(false)
              navigate('/profile')
            }}>
              {t('profile')}
            </Button>
            <Button variant="danger" onClick={() => {
              setSettingsOpen(false)
              logout()
            }}>
              {t('logout')}
            </Button>
          </>
        )}
      >
        <div className={styles.settingsBody}>
          {/* User Info */}
          <section className={styles.settingsCard}>
            <div className={styles.settingsUserRow}>
              <Avatar name={user?.name || t('learner')} size={42} />
              <div className={styles.settingsUserCopy}>
                <strong>{user?.name || t('learner')}</strong>
                <span>{roleLabel}</span>
              </div>
            </div>
            <div className={styles.settingsInfoGrid}>
              <div className={styles.settingsInfoCell}>
                <span className={styles.settingsInfoLabel}>{t('name')}</span>
                <strong>{user?.name || '-'}</strong>
              </div>
              <div className={styles.settingsInfoCell}>
                <span className={styles.settingsInfoLabel}>{t('email')}</span>
                <strong>{user?.email || '-'}</strong>
              </div>
              <div className={styles.settingsInfoCell}>
                <span className={styles.settingsInfoLabel}>Phone</span>
                <strong>{user?.phone || '-'}</strong>
              </div>
              <div className={styles.settingsInfoCell}>
                <span className={styles.settingsInfoLabel}>Role</span>
                <strong>{roleLabel}</strong>
              </div>
            </div>
          </section>

          {/* Language */}
          <section className={styles.settingsSection}>
            <div className={styles.settingsSectionHeader}>
              <span className={styles.settingsInfoLabel}>{t('language')}</span>
              <strong>{LOCALE_LABELS[lang]}</strong>
            </div>
            <div className={styles.settingsLangRow}>
              {SUPPORTED_LOCALES.map((locale) => (
                <button
                  key={`settings-lang-${locale}`}
                  type="button"
                  onClick={() => changeLang(locale)}
                  className={`${styles.settingsLangBtn} ${locale === lang ? styles.settingsLangBtnActive : ''}`}
                >
                  {LOCALE_LABELS[locale]}
                </button>
              ))}
            </div>
          </section>

          {/* Theme */}
          <section className={styles.settingsSection}>
            <div className={styles.settingsSectionHeader}>
              <span className={styles.settingsInfoLabel}>{t('theme')}</span>
              <strong>{theme === 'light' ? 'Light' : 'Dark'}</strong>
            </div>
            <Button variant="ghost" size="sm" onClick={toggleTheme}>
              {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
              {theme === 'light' ? 'Dark' : 'Light'}
            </Button>
          </section>
        </div>
      </Modal>
    </>
  )
}
