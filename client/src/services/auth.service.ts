import { z } from 'zod'
import type { User } from '../types'
import api, { ApiError } from './api'

const STORAGE_KEY = 'auth_user'

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  phoneVerified: z.boolean().optional(),
  role: z.enum(['student', 'admin', 'superadmin']).optional(),
  capabilities: z.object({
    canTeach: z.boolean().optional(),
    canBuy: z.boolean().optional(),
    canLearn: z.boolean().optional(),
  }).optional(),
  passwordSetAt: z.string().nullable().optional(),
})

const AuthResponseSchema = z.object({
  token: z.string(),
  user: UserSchema,
  requiresPasswordSetup: z.boolean().optional(),
})

const OtpRequestResponseSchema = z.object({
  sent: z.boolean(),
  phone: z.string(),
  ttlSec: z.number().int().positive(),
  resendCooldownSec: z.number().int().positive(),
})

const PasswordResetConfirmResponseSchema = z.object({
  verified: z.boolean(),
  resetToken: z.string().min(1),
  resetTokenTtlSec: z.number().int().positive(),
})

const PhoneSchema = z.string().regex(/^\+998\d{9}$/)
const CodeSchema = z.string().regex(/^\d{6}$/)

const SignupConfirmRequestSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: PhoneSchema,
  password: z.string().min(8).max(128),
  code: CodeSchema,
})

const LoginWithPasswordRequestSchema = z.object({
  phone: PhoneSchema,
  password: z.string().min(1).max(128),
})

const LegacyLoginOtpConfirmRequestSchema = z.object({
  phone: PhoneSchema,
  code: CodeSchema,
})

const PasswordResetCompleteRequestSchema = z.object({
  phone: PhoneSchema,
  resetToken: z.string().min(1),
  newPassword: z.string().min(8).max(128),
})

export const tokenStore = {
  get: () => localStorage.getItem('access_token'),
  set: (t: string) => localStorage.setItem('access_token', t),
  clear: () => localStorage.removeItem('access_token'),
}

const persistUser = (payload: z.infer<typeof AuthResponseSchema>): User => {
  const user: User = {
    id: payload.user.id,
    name: payload.user.name,
    firstName: payload.user.firstName ?? null,
    lastName: payload.user.lastName ?? null,
    email: payload.user.email ?? null,
    phone: payload.user.phone ?? null,
    phoneVerified: payload.user.phoneVerified ?? false,
    role: payload.user.role,
    capabilities: payload.user.capabilities,
    passwordSetAt: payload.user.passwordSetAt ?? null,
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
    await api.post('/auth/signup/request-code', { phone }, undefined, OtpRequestResponseSchema)
  },

  signupConfirm: async (payload: {
    firstName: string
    lastName: string
    phone: string
    password: string
    code: string
  }): Promise<User> => {
    const body = SignupConfirmRequestSchema.parse(payload)
    const res = await api.post('/auth/signup/confirm', body, undefined, AuthResponseSchema)
    return persistUser(res)
  },

  loginWithPassword: async (payload: { phone: string; password: string }): Promise<User> => {
    const body = LoginWithPasswordRequestSchema.parse(payload)
    const res = await api.post('/auth/login/password', body, undefined, AuthResponseSchema)
    return persistUser(res)
  },

  legacyLoginOtpRequestCode: async (phone: string): Promise<void> => {
    await api.post('/auth/login/otp/request-code', { phone }, undefined, OtpRequestResponseSchema)
  },

  legacyLoginOtpConfirm: async (payload: { phone: string; code: string }): Promise<{ user: User; requiresPasswordSetup: boolean }> => {
    const body = LegacyLoginOtpConfirmRequestSchema.parse(payload)
    const res = await api.post('/auth/login/otp/confirm', body, undefined, AuthResponseSchema)
    const user = persistUser(res)
    return { user, requiresPasswordSetup: Boolean(res.requiresPasswordSetup) }
  },

  passwordResetRequestCode: async (phone: string): Promise<void> => {
    await api.post('/auth/password/reset/request-code', { phone }, undefined, OtpRequestResponseSchema)
  },

  passwordResetConfirmCode: async (payload: { phone: string; code: string }): Promise<{ resetToken: string; resetTokenTtlSec: number }> => {
    const body = LegacyLoginOtpConfirmRequestSchema.parse(payload)
    const res = await api.post('/auth/password/reset/confirm-code', body, undefined, PasswordResetConfirmResponseSchema)
    return { resetToken: res.resetToken, resetTokenTtlSec: res.resetTokenTtlSec }
  },

  passwordResetComplete: async (payload: { phone: string; resetToken: string; newPassword: string }): Promise<void> => {
    const body = PasswordResetCompleteRequestSchema.parse(payload)
    await api.post('/auth/password/reset/complete', body, undefined, z.object({ reset: z.boolean() }))
  },

  passwordSetupComplete: async (newPassword: string): Promise<User> => {
    const token = requireToken()
    const res = await api.post(
      '/auth/password/setup/complete',
      { newPassword },
      token,
      AuthResponseSchema,
    )
    return persistUser(res)
  },

  loginWithGoogle: async (idToken: string): Promise<User> => {
    const res = await api.post('/auth/google', { idToken }, undefined, AuthResponseSchema)
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
