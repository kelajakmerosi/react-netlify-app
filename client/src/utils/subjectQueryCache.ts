import { queryClient, queryKeys } from '../lib/queryClient'
import type { SubjectRecord } from '../services/admin.service'

export const sortSubjectRecords = (items: SubjectRecord[]): SubjectRecord[] => (
  [...items].sort((left, right) => {
    const orderDelta = (left.order ?? 0) - (right.order ?? 0)
    if (orderDelta !== 0) return orderDelta
    return String(left.title ?? '').localeCompare(String(right.title ?? ''))
  })
)

export const syncSubjectListCache = (subjects: SubjectRecord[]) => {
  const nextSubjects = sortSubjectRecords(subjects)
  queryClient.setQueriesData<SubjectRecord[]>({ queryKey: queryKeys.subjects.all() }, () => nextSubjects)
  void queryClient.invalidateQueries({ queryKey: queryKeys.subjects.all() })
}
