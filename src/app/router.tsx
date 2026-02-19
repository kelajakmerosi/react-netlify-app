/**
 * router.tsx
 * Lightweight in-app router using state. 
 * Ready to swap for React Router v6 — each "page" maps to a <Route> path.
 */
import { useState, type ReactNode } from 'react'
import type { CurrentTopic, PageId } from '../types'

export interface RouterState {
  activePage:     PageId
  currentSubject: string | null
  currentTopic:   CurrentTopic | null
  navigate:       (page: PageId, opts?: { subjectId?: string; topic?: CurrentTopic }) => void
  goBack:         () => void
}

// A simple stack-based history for back navigation
const BACK_MAP: Partial<Record<PageId, PageId>> = {
  subject: 'subjects',
  topic:   'subject',
}

export function useRouter(): RouterState {
  const [activePage,     setActivePage]     = useState<PageId>('dashboard')
  const [currentSubject, setCurrentSubject] = useState<string | null>(null)
  const [currentTopic,   setCurrentTopic]   = useState<CurrentTopic | null>(null)

  const navigate = (page: PageId, opts?: { subjectId?: string; topic?: CurrentTopic }) => {
    setActivePage(page)
    if (opts?.subjectId) setCurrentSubject(opts.subjectId)
    if (opts?.topic)     setCurrentTopic(opts.topic)
  }

  const goBack = () => {
    const prev = BACK_MAP[activePage]
    if (prev) setActivePage(prev)
  }

  return { activePage, currentSubject, currentTopic, navigate, goBack }
}
