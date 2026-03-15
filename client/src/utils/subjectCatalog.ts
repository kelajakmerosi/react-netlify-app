import { SUBJECT_NAMES, SUBJECTS } from '../constants'
import type { LocaleKey, Subject } from '../types'
import type { SubjectRecord as LearnerSubjectRecord } from '../services/subject.service'
import type { SubjectSectionRecord, SubjectTopic } from '../services/admin.service'
import { toRuntimeSubject } from './subjectRuntime'

const DEMO_SUBJECT_TITLE = 'demo matematika'

export const BUILTIN_SUBJECT_ROUTE_IDS = SUBJECTS.map((subject) => subject.id)

const BUILTIN_SUBJECT_SET = new Set(BUILTIN_SUBJECT_ROUTE_IDS)
const BUILTIN_SUBJECT_BY_ROUTE_ID = new Map(SUBJECTS.map((subject, index) => [
  subject.id,
  { subject, index },
]))

export interface LiveSubjectLike {
  id: string
  title: string
  description?: string | null
  icon?: string | null
  color?: string | null
  imageUrl?: string | null
  image_url?: string | null
  order?: number
  topics?: Array<SubjectTopic | LearnerSubjectRecord['topics'][number]>
  sections?: Array<SubjectSectionRecord | LearnerSubjectRecord['sections'][number]>
  catalogKey?: string | null
  catalog_key?: string | null
  isHidden?: boolean
  is_hidden?: boolean
}

export interface CanonicalSubjectEntry<T extends LiveSubjectLike = LiveSubjectLike> {
  routeId: string
  displayName: string
  subject: Subject
  liveSubject: T | null
  liveSubjectId: string | null
  seedSubjectId: string | null
  sortOrder: number
}

const normalizeText = (value = '') => value.trim().toLowerCase()

const isHiddenSubject = <T extends LiveSubjectLike>(subject: T | null | undefined): boolean => (
  Boolean(subject?.isHidden ?? subject?.is_hidden)
)

const toCanonicalRuntimeSubject = <T extends LiveSubjectLike>(subject: T, routeId: string): Subject => (
  toRuntimeSubject({
    ...(subject as LearnerSubjectRecord),
    id: routeId,
  })
)

const overlaySeedSubject = <T extends LiveSubjectLike>(seed: Subject, liveSubject: T, routeId: string): Subject => {
  const liveRuntime = toCanonicalRuntimeSubject(liveSubject, routeId)
  return {
    ...seed,
    ...liveRuntime,
    id: routeId,
    icon: liveRuntime.icon ?? seed.icon,
    iconName: liveRuntime.iconName ?? seed.iconName,
    visualKey: liveRuntime.visualKey ?? seed.visualKey,
    imageUrl: liveRuntime.imageUrl ?? seed.imageUrl,
    color: liveRuntime.color || seed.color,
    gradient: liveRuntime.gradient || seed.gradient,
  }
}

export const isSeedSubjectRouteId = (value: string | null | undefined): boolean => BUILTIN_SUBJECT_SET.has(String(value || ''))

export const getSubjectCatalogKey = (
  subject?: Pick<LiveSubjectLike, 'id' | 'catalogKey' | 'catalog_key'> | null,
): string | null => {
  const catalogKey = String(subject?.catalogKey ?? subject?.catalog_key ?? '').trim()
  return catalogKey.length > 0 ? catalogKey : null
}

export const getSubjectRouteId = (
  subject?: Pick<LiveSubjectLike, 'id' | 'catalogKey' | 'catalog_key'> | null,
): string => {
  const catalogKey = getSubjectCatalogKey(subject)
  return catalogKey || String(subject?.id || '')
}

const isRemovedDemoSubject = <T extends LiveSubjectLike>(subject: T): boolean => {
  if (getSubjectCatalogKey(subject)) return false
  return normalizeText(subject.title ?? '') === DEMO_SUBJECT_TITLE
}

const getDisplayName = <T extends LiveSubjectLike>(
  routeId: string,
  liveSubject: T | null,
  fallbackSubject?: Subject,
  lang: LocaleKey = 'uz',
): string => (
  liveSubject?.title?.trim()
  || fallbackSubject?.title?.trim()
  || SUBJECT_NAMES[lang]?.[routeId]
  || routeId
)

export const buildCanonicalSubjectCatalog = <T extends LiveSubjectLike>(
  liveSubjects: T[],
  lang: LocaleKey = 'uz',
): CanonicalSubjectEntry<T>[] => {
  const filteredLiveSubjects = liveSubjects.filter((subject) => !isRemovedDemoSubject(subject))
  const liveByRouteId = new Map<string, T>()

  filteredLiveSubjects.forEach((subject) => {
    const routeId = getSubjectRouteId(subject)
    if (!routeId || liveByRouteId.has(routeId)) return
    liveByRouteId.set(routeId, subject)
  })

  const entries: CanonicalSubjectEntry<T>[] = []
  const seenRouteIds = new Set<string>()

  SUBJECTS.forEach((seedSubject, index) => {
    const liveSubject = liveByRouteId.get(seedSubject.id) ?? null
    if (isHiddenSubject(liveSubject)) {
      seenRouteIds.add(seedSubject.id)
      return
    }
    entries.push({
      routeId: seedSubject.id,
      displayName: getDisplayName(seedSubject.id, liveSubject, seedSubject, lang),
      subject: liveSubject ? overlaySeedSubject(seedSubject, liveSubject, seedSubject.id) : seedSubject,
      liveSubject,
      liveSubjectId: liveSubject?.id ?? null,
      seedSubjectId: seedSubject.id,
      sortOrder: index,
    })
    seenRouteIds.add(seedSubject.id)
  })

  filteredLiveSubjects.forEach((liveSubject, index) => {
    const routeId = getSubjectRouteId(liveSubject)
    if (!routeId || seenRouteIds.has(routeId) || isHiddenSubject(liveSubject)) return

    const builtin = BUILTIN_SUBJECT_BY_ROUTE_ID.get(routeId)
    const runtimeSubject = builtin
      ? overlaySeedSubject(builtin.subject, liveSubject, routeId)
      : toCanonicalRuntimeSubject(liveSubject, routeId)

    entries.push({
      routeId,
      displayName: getDisplayName(routeId, liveSubject, builtin?.subject, lang),
      subject: runtimeSubject,
      liveSubject,
      liveSubjectId: liveSubject.id,
      seedSubjectId: builtin?.subject.id ?? null,
      sortOrder: typeof liveSubject.order === 'number' ? liveSubject.order : SUBJECTS.length + index,
    })
    seenRouteIds.add(routeId)
  })

  return entries.sort((left, right) => {
    const leftBuiltin = left.seedSubjectId ? BUILTIN_SUBJECT_BY_ROUTE_ID.get(left.seedSubjectId)?.index ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER
    const rightBuiltin = right.seedSubjectId ? BUILTIN_SUBJECT_BY_ROUTE_ID.get(right.seedSubjectId)?.index ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER

    if (leftBuiltin !== rightBuiltin) return leftBuiltin - rightBuiltin
    if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder
    return left.displayName.localeCompare(right.displayName)
  })
}
