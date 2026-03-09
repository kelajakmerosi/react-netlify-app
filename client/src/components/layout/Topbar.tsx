import { useMemo, useState } from 'react'
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

export function Topbar({ activePage, onMenuToggle }: TopbarProps) {
  const { user, logout } = useAuth()
  const { lang, t, changeLang } = useLang()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [languageOpen, setLanguageOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const roleLabel = useMemo(() => {
    if (!user?.role) return t('guest')
    if (user.role === 'student') return t('learner')
    return t(user.role)
  }, [t, user?.role])

  const localeLabels: Record<LocaleKey, string> = {
    uz: "O'zbek",
    ru: 'Русский',
    en: 'English',
  }

  const title = useMemo(() => {
    if (activePage === 'dashboard') return t('myLearning')
    if (activePage === 'subjects' || activePage === 'subject' || activePage === 'topic') return t('lessons')
    if (activePage === 'exams' || activePage === 'exam' || activePage === 'examAttempt') return t('exams')
    if (activePage === 'profile') return t('profile')
    if (activePage === 'admin') return t('admin')
    return t('myLearning')
  }, [activePage, t])

  return (
    <>
      <header className={styles.topbar}>
        <div className={styles.left}>
          <IconButton className={styles.hamburger} onClick={onMenuToggle} label={t('menu')} icon={<Menu size={19} />} />
          <h1 className={styles.pageTitle}>{title}</h1>
        </div>

        <div className={styles.right}>
          <IconButton
            icon={<Languages size={16} />}
            label={`${t('language')}: ${lang.toUpperCase()}`}
            onClick={() => setLanguageOpen(true)}
          />
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

      <Modal
        open={languageOpen}
        onClose={() => setLanguageOpen(false)}
        title={t('language')}
        description={`${t('language')}: ${localeLabels[lang]}`}
        className={styles.drawerPanel}
      >
        <div className="grid gap-3">
          {SUPPORTED_LOCALES.map((locale) => {
            const active = locale === lang
            return (
              <button
                key={locale}
                type="button"
                onClick={() => {
                  changeLang(locale)
                  setLanguageOpen(false)
                }}
                className={[
                  'flex items-center justify-between rounded-2xl border px-4 py-4 text-left transition',
                  active
                    ? 'border-[color:var(--accent)] bg-[color:var(--accent-light)] text-[color:var(--accent)]'
                    : 'border-[color:var(--surface-border)] bg-[color:var(--bg-2)] text-[color:var(--text)] hover:border-[color:var(--accent)]/40 hover:bg-[color:var(--accent-light)]/40',
                ].join(' ')}
              >
                <div className="grid gap-1">
                  <span className="text-sm font-extrabold tracking-tight">{localeLabels[locale]}</span>
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--text-3)]">
                    {locale.toUpperCase()}
                  </span>
                </div>
                {active ? <Check size={18} aria-hidden="true" /> : null}
              </button>
            )
          })}
        </div>
      </Modal>

      <Modal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title={t('settings')}
        description={roleLabel}
        className={styles.drawerPanel}
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
        <div className="grid gap-5">
          <section className="rounded-[24px] border border-[color:var(--surface-border)] bg-[color:var(--bg-2)] p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-4">
              <Avatar name={user?.name || t('learner')} size={54} />
              <div className="grid gap-1">
                <strong className="text-xl font-extrabold tracking-tight text-[color:var(--text)]">
                  {user?.name || t('learner')}
                </strong>
                <span className="text-sm font-semibold text-[color:var(--text-2)]">{roleLabel}</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--glass)] px-4 py-3">
                <span className="block text-[11px] font-extrabold uppercase tracking-[0.18em] text-[color:var(--text-3)]">{t('name')}</span>
                <strong className="mt-1 block text-sm text-[color:var(--text)]">{user?.name || '-'}</strong>
              </div>
              <div className="rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--glass)] px-4 py-3">
                <span className="block text-[11px] font-extrabold uppercase tracking-[0.18em] text-[color:var(--text-3)]">{t('email')}</span>
                <strong className="mt-1 block text-sm text-[color:var(--text)]">{user?.email || '-'}</strong>
              </div>
              <div className="rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--glass)] px-4 py-3">
                <span className="block text-[11px] font-extrabold uppercase tracking-[0.18em] text-[color:var(--text-3)]">Phone</span>
                <strong className="mt-1 block text-sm text-[color:var(--text)]">{user?.phone || '-'}</strong>
              </div>
              <div className="rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--glass)] px-4 py-3">
                <span className="block text-[11px] font-extrabold uppercase tracking-[0.18em] text-[color:var(--text-3)]">Role</span>
                <strong className="mt-1 block text-sm text-[color:var(--text)]">{roleLabel}</strong>
              </div>
            </div>
          </section>

          <section className="grid gap-3">
            <div className="rounded-[24px] border border-[color:var(--surface-border)] bg-[color:var(--bg-2)] p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[color:var(--text-3)]">{t('language')}</p>
                  <h3 className="text-lg font-extrabold tracking-tight text-[color:var(--text)]">{localeLabels[lang]}</h3>
                </div>
                <Button variant="ghost" onClick={() => {
                  setSettingsOpen(false)
                  setLanguageOpen(true)
                }}>
                  {t('language')}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {SUPPORTED_LOCALES.map((locale) => (
                  <button
                    key={`settings-lang-${locale}`}
                    type="button"
                    onClick={() => changeLang(locale)}
                    className={[
                      'rounded-full border px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] transition',
                      locale === lang
                        ? 'border-[color:var(--accent)] bg-[color:var(--accent-light)] text-[color:var(--accent)]'
                        : 'border-[color:var(--surface-border)] bg-[color:var(--glass)] text-[color:var(--text-2)] hover:border-[color:var(--accent)]/35 hover:text-[color:var(--text)]',
                    ].join(' ')}
                  >
                    {localeLabels[locale]}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-[color:var(--surface-border)] bg-[color:var(--bg-2)] p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[color:var(--text-3)]">{t('theme')}</p>
                  <h3 className="text-lg font-extrabold tracking-tight text-[color:var(--text)]">
                    {theme === 'light' ? 'Light' : 'Dark'}
                  </h3>
                </div>
                <Button variant="ghost" onClick={toggleTheme}>
                  {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                  {t('theme')}
                </Button>
              </div>
              <p className="text-sm leading-6 text-[color:var(--text-2)]">
                Clean contrast, softer surfaces, and route-wide readability now follow the active theme.
              </p>
            </div>
          </section>
        </div>
      </Modal>
    </>
  )
}
