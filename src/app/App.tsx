import { ThemeProvider }   from './providers/ThemeProvider'
import { LanguageProvider } from './providers/LanguageProvider'
import { AuthProvider }     from './providers/AuthProvider'
import { AppProvider }      from './providers/AppProvider'
import { AppShell }         from '../components/layout/AppShell'
import { AuthPage }         from '../pages/AuthPage'
import { useAuth }          from '../hooks/useAuth'

// Inner wrapper needs auth context already mounted
function InnerApp() {
  const { user, isGuest } = useAuth()
  if (!user && !isGuest) return <AuthPage />
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <InnerApp />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
