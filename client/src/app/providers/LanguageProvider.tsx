import { createContext, useCallback, useMemo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { LanguageContextValue, LocaleKey } from '../../types'
import i18n, { resolveLocale, syncLocaleToUrl } from '../i18n'

export const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { t, i18n: instance } = useTranslation('common')
  const lang = resolveLocale(instance.resolvedLanguage || instance.language) as LocaleKey

  const changeLang = useCallback((l: LocaleKey) => {
    const next = resolveLocale(l)
    void i18n.changeLanguage(next)
    syncLocaleToUrl(next)
  }, [])

  const safeTranslate = useCallback((key: string) => {
    const value = t(key)
    return typeof value === 'string' ? value : key
  }, [t])

  const value = useMemo<LanguageContextValue>(() => ({
    lang,
    changeLang,
    t: safeTranslate,
  }), [changeLang, lang, safeTranslate])

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}
