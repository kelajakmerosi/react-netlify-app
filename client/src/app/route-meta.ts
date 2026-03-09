import type { PageId } from '../types'

export const resolveActivePage = (pathname: string): PageId => {
  if (pathname.startsWith('/payments/')) return 'payment'
  if (pathname.startsWith('/exam-attempts/')) return 'examAttempt'
  if (pathname.startsWith('/exams/')) return 'exam'
  if (pathname.startsWith('/exams')) return 'exams'
  if (pathname.startsWith('/subjects/')) return pathname.includes('/topics/') ? 'topic' : 'subject'
  if (pathname.startsWith('/subjects')) return 'subjects'
  if (pathname.startsWith('/profile')) return 'profile'
  if (pathname.startsWith('/admin')) return 'admin'
  return 'dashboard'
}
