import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import subjectService from '../services/subject.service'
import type { LocaleKey } from '../types'
import { queryKeys } from '../lib/queryClient'
import { buildCanonicalSubjectCatalog } from '../utils/subjectCatalog'
import { useLang } from './index'

export const useLearnerSubjects = () => {
  const { user } = useAuth()
  const { lang } = useLang()
  const userId = user?.id ?? null

  const { data: liveSubjects = [], isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: queryKeys.subjects.list(userId),
    queryFn: async () => {
      if (!userId) return []
      return subjectService.getAll()
    },
    staleTime: 5 * 60 * 1000,
  })

  const error = queryError instanceof Error ? queryError.message : ''

  const catalog = useMemo(
    () => buildCanonicalSubjectCatalog(liveSubjects, lang as LocaleKey),
    [lang, liveSubjects],
  )

  const subjects = useMemo(
    () => catalog.map((entry) => entry.subject),
    [catalog],
  )

  const byId = useMemo(
    () => new Map(subjects.map((subject) => [subject.id, subject])),
    [subjects],
  )

  return {
    catalog,
    subjects,
    byId,
    loading,
    error,
    reload: () => refetch(),
  }
}

export default useLearnerSubjects
