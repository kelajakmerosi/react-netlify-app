import { useState, useEffect, useRef } from 'react'
import { useAuth }  from '../hooks/useAuth'
import { useLang }  from '../hooks'
import { Input }    from '../components/ui/Input'
import { Button }   from '../components/ui/Button'
import { GlassCard }from '../components/ui/GlassCard'
import { Alert, Tabs, Divider } from '../components/ui/index'
import styles from './AuthPage.module.css'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string

export function AuthPage() {
  const { t } = useLang()
  const { login, register, loginWithGoogle, continueAsGuest } = useAuth()

  const [mode,    setMode]    = useState<'login' | 'register'>('login')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [gLoading,setGLoading]= useState(false)
  const [form,    setForm]    = useState({ email:'', password:'', name:'', confirm:'' })
  const googleBtnRef = useRef<HTMLDivElement>(null)

  // ─── Initialize Google Identity Services ───────────────────────────────────
  useEffect(() => {
    const initGoogle = () => {
      if (!GOOGLE_CLIENT_ID || !window.google?.accounts?.id) return

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async ({ credential }: { credential: string }) => {
          setGLoading(true)
          setError('')
          try {
            await loginWithGoogle(credential)
          } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Google login failed')
            setGLoading(false)
          }
        },
      })

      if (googleBtnRef.current) {
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size:  'large',
          width: 340,
          text:  'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
        })
      }
    }

    // GSI script may load async — wait for it if not yet ready
    if (window.google) {
      initGoogle()
    } else {
      const script = document.querySelector('script[src*="accounts.google.com/gsi/client"]')
      script?.addEventListener('load', initGoogle)
      return () => script?.removeEventListener('load', initGoogle)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async () => {
    setError('')
    if (!form.email || !form.password) return
    if (mode === 'register' && form.password !== form.confirm) {
      setError(t('passwordMismatch')); return
    }
    setLoading(true)
    try {
      if (mode === 'login') await login(form.email, form.password)
      else await register(form.name || form.email.split('@')[0], form.email, form.password)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'error'
      setError(t(msg) !== msg ? t(msg) : msg)
    }
    setLoading(false)
  }

  const onKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSubmit() }

  return (
    <div className={styles.page}>
      <div className={styles.glow1} />
      <div className={styles.glow2} />

      <GlassCard className={`${styles.card} fade-in`}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.logoWrap}>
            {/* <div className={styles.logoIcon}>E</div> */}
          </div>
          <span className="logo-text" style={{ fontSize: 30 }}>KelajakMerosi</span>
          <p className={styles.tagline}>{t('tagline')}</p>
        </div>

        {/* Mode tabs */}
        <Tabs
          tabs={[{ id:'login', label: t('login') }, { id:'register', label: t('register') }]}
          active={mode}
          onChange={id => { setMode(id as typeof mode); setError('') }}
        />

        {/* Form */}
        <div className={styles.form}>
          {mode === 'register' && (
            <Input placeholder={t('name')} value={form.name}
              onChange={set('name')} onKeyDown={onKey} />
          )}
          <Input placeholder={t('email')} value={form.email}
            onChange={set('email')} onKeyDown={onKey} error={!!error} />
          <Input type="password" placeholder={t('password')} value={form.password}
            onChange={set('password')} onKeyDown={onKey} error={!!error} />
          {mode === 'register' && (
            <Input type="password" placeholder={t('confirmPassword')} value={form.confirm}
              onChange={set('confirm')} onKeyDown={onKey} error={!!error} />
          )}
  
          {error && <Alert variant="error">{error}</Alert>}

          <Button fullWidth size="lg" onClick={handleSubmit} disabled={loading}>
            {loading ? '...' : mode === 'login' ? t('login') : t('createAccount')}
          </Button>

          <div className={styles.orRow}>
            <span className={styles.orLine} />
            <span className={styles.orText}>{t('orContinueWith')}</span>
            <span className={styles.orLine} />
          </div>

          {/* Google Sign-In button rendered by GSI SDK */}
          <div className={styles.googleWrap}>
            {gLoading
              ? <div className={styles.googleLoading}>...</div>
              : <div ref={googleBtnRef} className={styles.googleBtn} />
            }
          </div>

          <Divider />

          <Button variant="ghost" fullWidth onClick={continueAsGuest}>
            {t('guestMode')}
          </Button>
        </div>

        {/* Switch mode link */}
        <p className={styles.switchNote}>
          {mode === 'login' ? t('noAccount') : t('haveAccount')}{' '}
          <button className={styles.switchLink}
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>
            {mode === 'login' ? t('register') : t('login')}
          </button>
        </p>
      </GlassCard>
    </div>
  )
}
