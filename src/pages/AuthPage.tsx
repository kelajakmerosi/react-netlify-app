import { useState } from 'react'
import { useAuth }  from '../hooks/useAuth'
import { useLang }  from '../hooks'
import { Input }    from '../components/ui/Input'
import { Button }   from '../components/ui/Button'
import { GlassCard }from '../components/ui/GlassCard'
import { Alert, Tabs, Divider } from '../components/ui/index'
import styles from './AuthPage.module.css'

export function AuthPage() {
  const { t } = useLang()
  const { login, register, continueAsGuest } = useAuth()

  const [mode,    setMode]    = useState<'login' | 'register'>('login')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [form,    setForm]    = useState({ email:'', password:'', name:'', confirm:'' })

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
