/**
 * auth.service.ts
 * Real API implementation — talks to the Node.js/Express backend.
 */
import type { User } from '../types'
import api from './api'

const STORAGE_KEY = 'auth_user'

// ─── Token helpers ────────────────────────────────────────────────────
export const tokenStore = {
  get:   ()          => localStorage.getItem('access_token'),
  set:   (t: string) => localStorage.setItem('access_token', t),
  clear: ()          => localStorage.removeItem('access_token'),
}

// ─── API response type ────────────────────────────────────────────────
interface AuthResponse {
  token: string
  user: {
    id:    string
    name:  string
    email: string
    role:  string
  }
}

// ─── Public service ────────────────────────────────────────────────────
export const authService = {
  loginWithGoogle: async (idToken: string): Promise<User> => {
    const res = await api.post<AuthResponse>('/auth/google', { idToken })
    const user: User = { id: res.user.id, name: res.user.name, email: res.user.email, token: res.token }
    tokenStore.set(res.token)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    return user
  },

  login: async (email: string, password: string): Promise<User> => {
    const res = await api.post<AuthResponse>('/auth/login', { email, password })
    const user: User = { id: res.user.id, name: res.user.name, email: res.user.email, token: res.token }
    tokenStore.set(res.token)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    return user
  },

  register: async (name: string, email: string, password: string): Promise<User> => {
    const res = await api.post<AuthResponse>('/auth/register', { name, email, password })
    const user: User = { id: res.user.id, name: res.user.name, email: res.user.email, token: res.token }
    tokenStore.set(res.token)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    return user
  },

  logout: (): void => {
    tokenStore.clear()
    localStorage.removeItem(STORAGE_KEY)
  },

  getStoredUser: (): User | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as User) : null
    } catch {
      return null
    }
  },
}

export default authService
