import { useState } from 'react'
import { useLang }   from '../../hooks'
import type { LocaleKey } from '../../types'
import { Button }    from './Button'

const FLAGS: Record<LocaleKey, string> = { uz:'🇺🇿', en:'🇬🇧', ru:'🇷🇺' }

export function LanguageSwitcher() {
  const { lang, changeLang } = useLang()
  const [open, setOpen] = useState(false)

  return (
    <div style={{ position:'relative' }}>
      <Button variant="ghost" size="sm" onClick={() => setOpen(o => !o)} style={{ gap: 4 }}>
        {FLAGS[lang]} <span style={{ fontSize: 10 }}>▼</span>
      </Button>

      {open && (
        <div style={{
          position:'absolute', right:0, top:'calc(100% + 8px)',
          background:'var(--glass)', backdropFilter:'blur(20px)',
          border:'1px solid var(--glass-border)', borderRadius:'var(--radius-md)',
          boxShadow:'var(--shadow-md)', minWidth:120, padding:6, zIndex:200,
        }}>
          {(Object.keys(FLAGS) as LocaleKey[]).map(l => (
            <button key={l}
              onClick={() => { changeLang(l); setOpen(false) }}
              style={{
                display:'flex', alignItems:'center', gap: 8,
                padding:'8px 12px', width:'100%', border:'none', cursor:'pointer',
                background: l === lang ? 'var(--accent-light)' : 'transparent',
                color: l === lang ? 'var(--accent)' : 'var(--text-2)',
                borderRadius:'var(--radius-sm)', fontFamily:'var(--font-main)',
                fontSize: 14, fontWeight: l === lang ? 600 : 400,
                transition:'all var(--transition)',
              }}
            >
              {FLAGS[l]} {l.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
