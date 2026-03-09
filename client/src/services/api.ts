import { z, type ZodType } from 'zod'

const RAW_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api'
const BASE_URL = RAW_BASE_URL.replace(/\/$/, '').endsWith('/api')
  ? RAW_BASE_URL.replace(/\/$/, '')
  : `${RAW_BASE_URL.replace(/\/$/, '')}/api`
const NETWORK_FAILURE_COOLDOWN_MS = 5000
const inflightGetRequests = new Map<string, Promise<unknown>>()

interface RequestOptions<T = unknown> {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  token?: string
  schema?: ZodType<T>
}

const EnvelopeSchema = z.object({
  data: z.unknown(),
  meta: z.record(z.unknown()).optional(),
})

const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string().optional(),
    details: z.unknown().optional(),
  }),
})

let onAuthFailure: (() => void) | null = null
let lastNetworkFailureAt = 0

export const setApiAuthFailureHandler = (handler: (() => void) | null) => {
  onAuthFailure = handler
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public requestId?: string,
    public details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const parseSuccessPayload = <T>(payload: unknown, schema?: ZodType<T>): T => {
  const envelope = EnvelopeSchema.safeParse(payload)
  const candidate = envelope.success ? envelope.data.data : payload

  if (!schema) return candidate as T

  const parsed = schema.safeParse(candidate)
  if (!parsed.success) {
    throw new ApiError(500, 'Invalid response payload', 'INVALID_RESPONSE_SHAPE', undefined, parsed.error.flatten())
  }

  return parsed.data
}

const toApiError = (status: number, payload: unknown): ApiError => {
  const parsed = ErrorEnvelopeSchema.safeParse(payload)
  if (parsed.success) {
    const err = parsed.data.error
    return new ApiError(status, err.message, err.code, err.requestId, err.details)
  }

  const fallback = (payload as Record<string, unknown>)?.message || 'Unknown error'
  return new ApiError(status, String(fallback))
}

async function request<T>(endpoint: string, options: RequestOptions<T> = {}): Promise<T> {
  const { method = 'GET', body, token, schema } = options
  const now = Date.now()
  const requestKey = method === 'GET'
    ? `${method}:${endpoint}:${token || ''}`
    : null

  if (lastNetworkFailureAt && now - lastNetworkFailureAt < NETWORK_FAILURE_COOLDOWN_MS) {
    throw new ApiError(
      0,
      'API server is unreachable',
      'API_UNREACHABLE',
    )
  }

  const isFormDataBody = typeof FormData !== 'undefined' && body instanceof FormData
  const headers: HeadersInit = {}
  if (!isFormDataBody) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`

  const runRequest = async (): Promise<T> => {
    let res: Response
    try {
      res = await fetch(`${BASE_URL}${endpoint}`, {
        method,
        headers,
        body: body
          ? (isFormDataBody ? body : JSON.stringify(body))
          : undefined,
      })
      lastNetworkFailureAt = 0
    } catch (error) {
      lastNetworkFailureAt = Date.now()
      throw new ApiError(
        0,
        'API server is unreachable',
        'API_UNREACHABLE',
        undefined,
        { endpoint, method, cause: error instanceof Error ? error.message : String(error) },
      )
    }

    const raw = await res.text()
    let payload: unknown = {}
    try {
      payload = raw ? JSON.parse(raw) : {}
    } catch {
      payload = { message: raw || 'Invalid JSON response' }
    }

    if (!res.ok) {
      const apiError = toApiError(res.status, payload)
      if (res.status === 401 && onAuthFailure) onAuthFailure()
      throw apiError
    }

    return parseSuccessPayload<T>(payload, schema)
  }

  if (requestKey) {
    const existingRequest = inflightGetRequests.get(requestKey)
    if (existingRequest) {
      return existingRequest as Promise<T>
    }

    const requestPromise = runRequest().finally(() => {
      inflightGetRequests.delete(requestKey)
    })
    inflightGetRequests.set(requestKey, requestPromise)
    return requestPromise
  }

  return runRequest()
}

export const api = {
  get: <T>(url: string, token?: string, schema?: ZodType<T>) => request<T>(url, { token, schema }),
  post: <T>(url: string, body: unknown, token?: string, schema?: ZodType<T>) => request<T>(url, { method: 'POST', body, token, schema }),
  put: <T>(url: string, body: unknown, token?: string, schema?: ZodType<T>) => request<T>(url, { method: 'PUT', body, token, schema }),
  patch: <T>(url: string, body: unknown, token?: string, schema?: ZodType<T>) => request<T>(url, { method: 'PATCH', body, token, schema }),
  delete: <T>(url: string, token?: string, schema?: ZodType<T>) => request<T>(url, { method: 'DELETE', token, schema }),
}

export default api
