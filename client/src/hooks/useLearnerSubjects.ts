import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SUBJECTS } from '../constants'
import { useAuth } from './useAuth'
import subjectService from '../services/subject.service'
import { toRuntimeSubject } from '../utils/subjectRuntime'
import type { Subject } from '../types'
import { queryKeys } from '../lib/queryClient'

const MIN_DEMO_SUBJECTS = 6
const DEMO_SUBJECT_TITLE = 'demo matematika'
const REMOVED_SUBJECT_IDS = new Set(['geography'])
const REMOVED_SUBJECT_TITLES = new Set(['geografiya', 'geography'])

const fallbackSubjects = SUBJECTS

const isRemovedLearnerSubject = (subject: Subject) => {
  const normalizedId = String(subject.id || '').trim().toLowerCase()
  const normalizedTitle = String(subject.title || '').trim().toLowerCase()
  return normalizedTitle === DEMO_SUBJECT_TITLE
    || REMOVED_SUBJECT_IDS.has(normalizedId)
    || REMOVED_SUBJECT_TITLES.has(normalizedTitle)
}

const composeDemoSubjects = (preferred: Subject[]): Subject[] => {
  const learnerPreferred = preferred.filter((subject) => !isRemovedLearnerSubject(subject))
  const merged = new Map<string, Subject>()

  learnerPreferred.forEach((subject) => {
    if (!merged.has(subject.id)) merged.set(subject.id, subject)
  })

  fallbackSubjects.forEach((subject) => {
    if (merged.size >= MIN_DEMO_SUBJECTS && learnerPreferred.length > 0) return
    if (!merged.has(subject.id)) merged.set(subject.id, subject)
  })

  return Array.from(merged.values())
}

export const useLearnerSubjects = () => {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const { data: subjects = fallbackSubjects, isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: queryKeys.subjects.list(userId),
    queryFn: async () => {
      if (!userId) return fallbackSubjects
      const records = await subjectService.getAll()
      return composeDemoSubjects(records.map(toRuntimeSubject))
    },
    staleTime: 5 * 60 * 1000,
  })

  const error = queryError instanceof Error ? queryError.message : ''

  const byId = useMemo(
    () => new Map(subjects.map((subject) => [subject.id, subject])),
    [subjects],
  )

  return {
    subjects,
    byId,
    loading,
    error,
    reload: () => refetch(),
  }
}

export default useLearnerSubjects
