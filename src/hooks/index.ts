import { useContext } from 'react'
import { ThemeContext }    from '../app/providers/ThemeProvider'
import { LanguageContext } from '../app/providers/LanguageProvider'
import { AuthContext }     from '../app/providers/AuthProvider'
import { AppContext }      from '../app/providers/AppProvider'
import type { ThemeContextValue, LanguageContextValue, AuthContextValue, AppContextValue } from '../types'

function useRequired<T>(ctx: T | null, name: string): T {
  if (!ctx) throw new Error(`${name} must be used inside its Provider`)
  return ctx
}

export const useTheme    = () => useRequired(useContext(ThemeContext),    'ThemeContext')    as ThemeContextValue
export const useLang     = () => useRequired(useContext(LanguageContext), 'LanguageContext') as LanguageContextValue
export const useAuth     = () => useRequired(useContext(AuthContext),     'AuthContext')     as AuthContextValue
export const useApp      = () => useRequired(useContext(AppContext),      'AppContext')      as AppContextValue
