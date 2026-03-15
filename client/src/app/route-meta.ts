import type { PageId } from '../types'

export const resolveActivePage = (pathname: string): PageId => {
  if (pathname.startsWith('/payments/')) return 'payment'
  if (pathname.startsWith('/attestations/')) return 'attestation'
  if (pathname.startsWith('/general/')) return 'generalSection'
  if (pathname.startsWith('/my-tests')) return 'myTests'
  if (pathname.startsWith('/my-results')) return 'myResults'
  if (pathname.startsWith('/subjects/')) return pathname.includes('/topics/') ? 'topic' : 'subject'
  if (pathname.startsWith('/subjects')) return 'subjects'
  if (pathname.startsWith('/profile')) return 'profile'
  if (pathname.startsWith('/admin')) return 'admin'
  return 'dashboard'
}
