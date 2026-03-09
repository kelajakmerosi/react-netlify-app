import { describe, expect, it } from 'vitest'
import { resolveActivePage } from './route-meta'

describe('resolveActivePage', () => {
  it('maps nested and collection routes consistently', () => {
    expect(resolveActivePage('/dashboard')).toBe('dashboard')
    expect(resolveActivePage('/subjects')).toBe('subjects')
    expect(resolveActivePage('/subjects/math')).toBe('subject')
    expect(resolveActivePage('/subjects/math/topics/algebra')).toBe('topic')
    expect(resolveActivePage('/exams')).toBe('exams')
    expect(resolveActivePage('/exams/abc')).toBe('exam')
    expect(resolveActivePage('/exam-attempts/att-1')).toBe('examAttempt')
    expect(resolveActivePage('/payments/p-1')).toBe('payment')
    expect(resolveActivePage('/profile')).toBe('profile')
    expect(resolveActivePage('/admin')).toBe('admin')
  })

  it('falls back to dashboard for unknown routes', () => {
    expect(resolveActivePage('/unknown')).toBe('dashboard')
  })
})
