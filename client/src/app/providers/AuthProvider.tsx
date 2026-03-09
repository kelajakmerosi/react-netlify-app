import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import type { AuthContextValue, User } from '../../types'
import { authService } from '../../services/auth.service'
import { setApiAuthFailureHandler } from '../../services/api'

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => authService.getStoredUser())
  const [isGuest, setIsGuest] = useState(false)

  const signupRequestCode = useCallback(async (phone: string): Promise<void> => {
    await authService.signupRequestCode(phone)
  }, [])

  const signupConfirm = useCallback(async (payload: {
    firstName: string
    lastName: string
    phone: string
    password: string
    code: string
  }): Promise<User> => {
    const u = await authService.signupConfirm(payload)
    setUser(u)
    setIsGuest(false)
    return u
  }, [])

  const loginWithPassword = useCallback(async (payload: { phone: string; password: string }): Promise<User> => {
    const u = await authService.loginWithPassword(payload)
    setUser(u)
    setIsGuest(false)
    return u
  }, [])

  const legacyLoginOtpRequestCode = useCallback(async (phone: string): Promise<void> => {
    await authService.legacyLoginOtpRequestCode(phone)
  }, [])

  const legacyLoginOtpConfirm = useCallback(async (payload: { phone: string; code: string }): Promise<{ user: User; requiresPasswordSetup: boolean }> => {
    const result = await authService.legacyLoginOtpConfirm(payload)
    setUser(result.user)
    setIsGuest(false)
    return result
  }, [])

  const passwordResetRequestCode = useCallback(async (phone: string): Promise<void> => {
    await authService.passwordResetRequestCode(phone)
  }, [])

  const passwordResetConfirmCode = useCallback(async (payload: { phone: string; code: string }): Promise<{ resetToken: string; resetTokenTtlSec: number }> => {
    return authService.passwordResetConfirmCode(payload)
  }, [])

  const passwordResetComplete = useCallback(async (payload: { phone: string; resetToken: string; newPassword: string }): Promise<void> => {
    await authService.passwordResetComplete(payload)
  }, [])

  const passwordSetupComplete = useCallback(async (newPassword: string): Promise<User> => {
    const updated = await authService.passwordSetupComplete(newPassword)
    setUser(updated)
    setIsGuest(false)
    return updated
  }, [])

  const loginWithGoogle = useCallback(async (idToken: string): Promise<User> => {
    const u = await authService.loginWithGoogle(idToken)
    setUser(u)
    setIsGuest(false)
    return u
  }, [])

  const loginWithGoogleCode = useCallback(async (code: string, redirectUri: string): Promise<User> => {
    const u = await authService.loginWithGoogleCode(code, redirectUri)
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

  useEffect(() => {
    setApiAuthFailureHandler(() => {
      authService.logout()
      setUser(null)
      setIsGuest(false)
    })

    return () => {
      setApiAuthFailureHandler(null)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isGuest,
        signupRequestCode,
        signupConfirm,
        loginWithPassword,
        legacyLoginOtpRequestCode,
        legacyLoginOtpConfirm,
        passwordResetRequestCode,
        passwordResetConfirmCode,
        passwordResetComplete,
        passwordSetupComplete,
        loginWithGoogle,
        loginWithGoogleCode,
        logout,
        continueAsGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
