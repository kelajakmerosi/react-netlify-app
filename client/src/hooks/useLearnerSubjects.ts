import { useCallback, useEffect, useMemo, useState } from 'react'
import { SUBJECTS } from '../constants'
import { useAuth } from './useAuth'
import subjectService from '../services/subject.service'
import { toRuntimeSubject } from '../utils/subjectRuntime'
import type { Subject } from '../types'

const cacheByUser = new Map<string, Subject[]>()
const CACHE_PREFIX = 'learner-subjects:v2:'

const fallbackSubjects = SUBJECTS

const getCacheKey = (userId: string) => `${CACHE_PREFIX}${userId}`

type StorableSubject = Omit<Subject, 'icon'>

const toStorableSubjects = (subjects: Subject[]): StorableSubject[] => (
  subjects.map(({ icon: _icon, ...rest }) => rest)
)

const fromStorableSubjects = (payload: unknown): Subject[] | null => {
  if (!Array.isArray(payload)) return null
  const mapped = payload
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => {
      const raw = entry as Partial<StorableSubject>
      const color = typeof raw.color === 'string' ? raw.color : '#3f68f7'
      const gradient = typeof raw.gradient === 'string'
        ? raw.gradient
        : `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 58%, #ffffff 42%))`

      return {
        ...raw,
        color,
        gradient,
        icon: null,
        topics: Array.isArray(raw.topics) ? raw.topics : [],
        modules: Array.isArray(raw.modules) ? raw.modules : [],
      } as Subject
    })
    .filter((entry) => Boolean(entry.id))

  return mapped
}

const readPersisted = (userId: string): Subject[] | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(getCacheKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return fromStorableSubjects(parsed)
  } catch {
    return null
  }
}

const readCached = (userId: string): Subject[] | null => {
  const fromMemory = cacheByUser.get(userId)
  if (fromMemory && fromMemory.length) return fromMemory
  const fromStorage = readPersisted(userId)
  if (fromStorage && fromStorage.length) {
    cacheByUser.set(userId, fromStorage)
    return fromStorage
  }
  return null
}

const writeCached = (userId: string, subjects: Subject[]) => {
  cacheByUser.set(userId, subjects)
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(getCacheKey(userId), JSON.stringify(toStorableSubjects(subjects)))
  } catch {
    // ignore storage errors
  }
}

export const useLearnerSubjects = () => {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [subjects, setSubjects] = useState<Subject[]>(() => {
    if (!userId) return fallbackSubjects
    return readCached(userId) || []
  })
  const [loading, setLoading] = useState<boolean>(() => {
    if (!userId) return false
    return !(readCached(userId) || []).length
  })
  const [error, setError] = useState<string>('')

  const loadSubjects = useCallback(async (force = false) => {
    if (!userId) {
      setSubjects(fallbackSubjects)
      setLoading(false)
      setError('')
      return
    }

    const cached = readCached(userId)
    if (cached && !force) {
      setSubjects(cached)
    }

    try {
      setLoading(force || !cached)
      setError('')
      const records = await subjectService.getAll()
      const runtime = records.map(toRuntimeSubject)
      writeCached(userId, runtime)
      setSubjects(runtime)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subjects')
      if (cached && cached.length) {
        setSubjects(cached)
      } else {
        setSubjects([])
      }
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) {
      setSubjects(fallbackSubjects)
      setLoading(false)
      setError('')
      return
    }

    const cached = readCached(userId)
    setSubjects(cached || [])
    setLoading(!cached)
    setError('')
  }, [userId])

  useEffect(() => {
    void loadSubjects()
  }, [loadSubjects])

  const byId = useMemo(
    () => new Map(subjects.map((subject) => [subject.id, subject])),
    [subjects],
  )

  return {
    subjects,
    byId,
    loading,
    error,
    reload: () => loadSubjects(true),
  }
}

export default useLearnerSubjects
