import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import uz from '../locales/uz.json'
import ru from '../locales/ru.json'
import en from '../locales/en.json'
import type { LocaleKey } from '../types'

export const DEFAULT_LOCALE: LocaleKey = 'uz'
export const SUPPORTED_LOCALES: LocaleKey[] = ['uz', 'ru', 'en']
export const LANG_STORAGE_KEY = 'lang'

const SUPPORTED_SET = new Set<string>(SUPPORTED_LOCALES)

const normalizeLocale = (value: string | null | undefined): LocaleKey | null => {
  if (!value) return null
  const normalized = value.trim().toLowerCase().replace('_', '-')
  const short = normalized.split('-')[0]
  if (SUPPORTED_SET.has(short)) return short as LocaleKey
  return null
}

const resolveInitialLocale = (): LocaleKey => {
  if (typeof window === 'undefined') return DEFAULT_LOCALE

  const queryLocale = normalizeLocale(new URLSearchParams(window.location.search).get('lang'))
  if (queryLocale) return queryLocale

  const storedLocale = normalizeLocale(window.localStorage.getItem(LANG_STORAGE_KEY))
  if (storedLocale) return storedLocale

  const navLocale = normalizeLocale(window.navigator.language || '')
  if (navLocale) return navLocale

  return DEFAULT_LOCALE
}

const applyDocumentLang = (lang: LocaleKey) => {
  if (typeof document === 'undefined') return
  document.documentElement.lang = lang
}

const initialLocale = resolveInitialLocale()

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      uz: { common: uz },
      ru: { common: ru },
      en: { common: en },
    },
    lng: initialLocale,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: SUPPORTED_LOCALES,
    defaultNS: 'common',
    ns: ['common'],
    interpolation: {
      escapeValue: false,
    },
    showSupportNotice: false,
    returnNull: false,
    parseMissingKeyHandler: (key) => key,
  })

applyDocumentLang(initialLocale)

export const resolveLocale = (candidate?: string | null): LocaleKey => {
  return normalizeLocale(candidate) ?? DEFAULT_LOCALE
}

export const persistLocale = (lang: LocaleKey) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LANG_STORAGE_KEY, lang)
}

export const syncLocaleToUrl = (lang: LocaleKey) => {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  url.searchParams.set('lang', lang)
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
}

i18n.on('languageChanged', (nextLang) => {
  const resolved = resolveLocale(nextLang)
  persistLocale(resolved)
  applyDocumentLang(resolved)
})

export default i18n
