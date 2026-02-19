import { createContext, useCallback, useState, type ReactNode } from 'react'
import type { AuthContextValue, User } from '../../types'
import { authService } from '../../services/auth.service'

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(() => authService.getStoredUser())
  const [isGuest, setIsGuest] = useState(false)

  const login = useCallback(async (identifier: string, password: string): Promise<User> => {
    const u = await authService.login(identifier, password)
    setUser(u)
    setIsGuest(false)
    return u
  }, [])

  const register = useCallback(async (name: string, email: string, password: string): Promise<User> => {
    const u = await authService.register(name, email, password)
    setUser(u)
    setIsGuest(false)
    return u
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    setUser(null)
    setIsGuest(false)
  }, [])

  const continueAsGuest = useCallback(() => {
    setIsGuest(true)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isGuest, login, register, logout, continueAsGuest }}>
      {children}
    </AuthContext.Provider>
  )
}
