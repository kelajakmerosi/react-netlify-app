import { z } from 'zod'
import type { User } from '../types'
import api, { ApiError } from './api'
import {
  AuthPayloadSchema,
  OtpRequestCodeResponseSchema,
  PasswordResetConfirmCodeResponseSchema,
  SignupConfirmSchema,
  LoginWithPasswordSchema,
  LegacyLoginOtpConfirmSchema,
  PasswordResetCompleteSchema,
} from '@shared/contracts'

const STORAGE_KEY = 'auth_user'

export const tokenStore = {
  get: () => localStorage.getItem('access_token'),
  set: (t: string) => localStorage.setItem('access_token', t),
  clear: () => localStorage.removeItem('access_token'),
}

const persistUser = (payload: z.infer<typeof AuthPayloadSchema>): User => {
  const user: User = {
    id: payload.user.id,
    name: payload.user.name,
    firstName: payload.user.firstName ?? null,
    lastName: payload.user.lastName ?? null,
    email: payload.user.email ?? null,
    phone: payload.user.phone ?? null,
    phoneVerified: false, // The public user schema doesn't have phoneVerified. Let's provide a default.
    role: payload.user.role,
    capabilities: payload.user.capabilities,
    passwordSetAt: null, // Default
    token: payload.token,
  }

  tokenStore.set(payload.token)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  return user
}

const requireToken = () => {
  const token = tokenStore.get()
  if (!token) {
    throw new ApiError(401, 'Not authenticated', 'NOT_AUTHORISED_NO_TOKEN')
  }
  return token
}

export const authService = {
  signupRequestCode: async (phone: string): Promise<void> => {
    await api.post('/auth/signup/request-code', { phone }, undefined, OtpRequestCodeResponseSchema)
  },

  signupConfirm: async (payload: {
    firstName: string
    lastName: string
    phone: string
    password: string
    code: string
  }): Promise<User> => {
    const body = SignupConfirmSchema.parse(payload)
    const res = await api.post('/auth/signup/confirm', body, undefined, AuthPayloadSchema)
    return persistUser(res)
  },

  loginWithPassword: async (payload: { phone: string; password: string }): Promise<User> => {
    const body = LoginWithPasswordSchema.parse(payload)
    const res = await api.post('/auth/login/password', body, undefined, AuthPayloadSchema)
    return persistUser(res)
  },

  legacyLoginOtpRequestCode: async (phone: string): Promise<void> => {
    await api.post('/auth/login/otp/request-code', { phone }, undefined, OtpRequestCodeResponseSchema)
  },

  legacyLoginOtpConfirm: async (payload: { phone: string; code: string }): Promise<{ user: User; requiresPasswordSetup: boolean }> => {
    const body = LegacyLoginOtpConfirmSchema.parse(payload)
    const res = await api.post('/auth/login/otp/confirm', body, undefined, AuthPayloadSchema)
    const user = persistUser(res)
    return { user, requiresPasswordSetup: Boolean(res.requiresPasswordSetup) }
  },

  passwordResetRequestCode: async (phone: string): Promise<void> => {
    await api.post('/auth/password/reset/request-code', { phone }, undefined, OtpRequestCodeResponseSchema)
  },

  passwordResetConfirmCode: async (payload: { phone: string; code: string }): Promise<{ resetToken: string; resetTokenTtlSec: number }> => {
    const body = LegacyLoginOtpConfirmSchema.parse(payload)
    const res = await api.post('/auth/password/reset/confirm-code', body, undefined, PasswordResetConfirmCodeResponseSchema)
    return { resetToken: res.resetToken, resetTokenTtlSec: res.resetTokenTtlSec }
  },

  passwordResetComplete: async (payload: { phone: string; resetToken: string; newPassword: string }): Promise<void> => {
    const body = PasswordResetCompleteSchema.parse(payload)
    await api.post('/auth/password/reset/complete', body, undefined, z.object({ reset: z.boolean() }))
  },

  passwordSetupComplete: async (newPassword: string): Promise<User> => {
    const token = requireToken()
    const res = await api.post(
      '/auth/password/setup/complete',
      { newPassword },
      token,
      AuthPayloadSchema,
    )
    return persistUser(res)
  },

  loginWithGoogle: async (idToken: string): Promise<User> => {
    const res = await api.post('/auth/google', { idToken }, undefined, AuthPayloadSchema)
    return persistUser(res)
  },

  loginWithGoogleCode: async (code: string, redirectUri: string): Promise<User> => {
    const res = await api.post('/auth/google/code', { code, redirectUri }, undefined, AuthPayloadSchema)
    return persistUser(res)
  },

  logout: (): void => {
    tokenStore.clear()
    localStorage.removeItem(STORAGE_KEY)
  },

  getStoredUser: (): User | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null

      const parsed = JSON.parse(raw) as User
      return parsed && parsed.id && parsed.token ? parsed : null
    } catch {
      return null
    }
  },
}

export default authService
