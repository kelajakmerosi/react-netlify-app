/**
 * auth.service.ts
 * Mock auth now; swap `mockLogin` / `mockRegister` for real API calls when backend is live.
 */
import type { User } from '../types'
import { MOCK_CREDENTIALS } from '../constants'

const STORAGE_KEY = 'auth_user'

// ─── Token helpers (JWT-ready) ────────────────────────────
export const tokenStore = {
  get:    ()     => localStorage.getItem('access_token'),
  set:    (t: string) => localStorage.setItem('access_token', t),
  clear:  ()     => localStorage.removeItem('access_token'),
}

// ─── Mock implementations ─────────────────────────────────
async function mockLogin(identifier: string, password: string): Promise<User> {
  // Simulate network latency
  await new Promise(r => setTimeout(r, 400))

  if (!MOCK_CREDENTIALS.identifiers.includes(identifier)) throw new Error('userNotFound')
  if (password !== MOCK_CREDENTIALS.password)             throw new Error('wrongPassword')

  return {
    id:    'usr_1',
    name:  'Foydalanuvchi',
    email: 'user@edu.uz',
    token: 'mock_jwt_access_token_xyz',
  }
}

async function mockRegister(name: string, email: string, _password: string): Promise<User> {
  await new Promise(r => setTimeout(r, 400))
  return {
    id:    `usr_${Date.now()}`,
    name,
    email,
    token: `mock_jwt_${Date.now()}`,
  }
}

// ─── Public service ───────────────────────────────────────
export const authService = {
  login: async (identifier: string, password: string): Promise<User> => {
    // TODO: replace with real API:
    // return api.post<{ user: User; token: string }>('/auth/login', { identifier, password })
    //   .then(res => { tokenStore.set(res.token); return res.user })
    const user = await mockLogin(identifier, password)
    tokenStore.set(user.token)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    return user
  },

  register: async (name: string, email: string, password: string): Promise<User> => {
    // TODO: replace with real API call
    const user = await mockRegister(name, email, password)
    tokenStore.set(user.token)
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
