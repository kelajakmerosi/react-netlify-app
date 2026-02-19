import { createContext, useCallback, useState, type ReactNode } from 'react'
import type { LanguageContextValue, LocaleKey } from '../../types'
import uz from '../../locales/uz.json'
import en from '../../locales/en.json'
import ru from '../../locales/ru.json'

const TRANSLATIONS: Record<LocaleKey, Record<string, string>> = { uz, en, ru }

export const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<LocaleKey>(
    () => (localStorage.getItem('lang') as LocaleKey) ?? 'uz',
  )

  const changeLang = useCallback((l: LocaleKey) => {
    localStorage.setItem('lang', l)
    setLang(l)
  }, [])

  const t = useCallback(
    (key: string) => TRANSLATIONS[lang]?.[key] ?? key,
    [lang],
  )

  return (
    <LanguageContext.Provider value={{ lang, changeLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}
