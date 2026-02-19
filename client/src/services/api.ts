/**
 * api.ts — Centralised HTTP client
 * Ready for Axios swap-in: replace `fetch` calls with axios instance.
 */

const RAW_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api'
const BASE_URL = RAW_BASE_URL.replace(/\/$/, '').endsWith('/api')
  ? RAW_BASE_URL.replace(/\/$/, '')
  : `${RAW_BASE_URL.replace(/\/$/, '')}/api`

interface RequestOptions {
  method?:  'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?:    unknown
  token?:   string
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options

  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({ message: 'Unknown error' }))
    throw new ApiError(res.status, data.message ?? 'Unknown error')
  }

  return res.json() as Promise<T>
}

// ─── Exported API methods (backend-ready stubs) ───────────
export const api = {
  get:    <T>(url: string, token?: string) => request<T>(url, { token }),
  post:   <T>(url: string, body: unknown, token?: string) => request<T>(url, { method:'POST', body, token }),
  put:    <T>(url: string, body: unknown, token?: string) => request<T>(url, { method:'PUT',  body, token }),
  patch:  <T>(url: string, body: unknown, token?: string) => request<T>(url, { method:'PATCH',body, token }),
  delete: <T>(url: string, token?: string) => request<T>(url, { method:'DELETE', token }),
}

export default api
