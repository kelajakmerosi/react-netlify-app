import { useState } from 'react'
import { useLang }   from '../../hooks'
import type { LocaleKey } from '../../types'
import { Button }    from './Button'
import { Globe, ChevronDown } from 'lucide-react'
import { SUPPORTED_LOCALES } from '../../app/i18n'

const LOCALE_LABELS: Record<LocaleKey, string> = {
  uz: "O'zbek",
  ru: 'Русский',
  en: 'English',
}

export function LanguageSwitcher() {
  const { lang, changeLang } = useLang()
  const [open, setOpen] = useState(false)

  return (
    <div style={{ position:'relative' }}>
      <Button variant="ghost" size="sm" onClick={() => setOpen(o => !o)}
        style={{ gap: 6, fontWeight: 600, fontSize: 12, letterSpacing: '0.06em' }}>
        <Globe size={15} />
        {lang.toUpperCase()}
        <ChevronDown size={12} style={{ opacity: 0.6 }} />
      </Button>

      {open && (
        <div style={{
          position:'absolute', right:0, top:'calc(100% + 8px)',
          background:'var(--glass)', backdropFilter:'blur(20px)',
          border:'1px solid var(--glass-border)', borderRadius:'var(--radius-md)',
          boxShadow:'var(--shadow-md)', minWidth:110, padding:6, zIndex:200,
        }}>
          {SUPPORTED_LOCALES.map(l => (
            <button key={l}
              onClick={() => { changeLang(l); setOpen(false) }}
              style={{
                display:'flex', alignItems:'center', gap: 8,
                padding:'8px 12px', width:'100%', border:'none', cursor:'pointer',
                background: l === lang ? 'var(--accent-light)' : 'transparent',
                color: l === lang ? 'var(--accent)' : 'var(--text-2)',
                borderRadius:'var(--radius-sm)', fontFamily:'var(--font-main)',
                fontSize: 13, fontWeight: l === lang ? 700 : 400,
                letterSpacing: '0.06em',
                transition:'all var(--transition)',
              }}
            >
              {LOCALE_LABELS[l]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
