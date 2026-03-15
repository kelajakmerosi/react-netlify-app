import type { LocaleKey } from '../../../types'
import type { SubjectRecord } from '../../../services/admin.service'
import {
  buildCanonicalSubjectCatalog,
  type CanonicalSubjectEntry,
} from '../../../utils/subjectCatalog'

export type ContentCatalogEntry = CanonicalSubjectEntry<SubjectRecord>

export const buildContentCatalog = (
  liveSubjects: SubjectRecord[],
  lang: LocaleKey,
): ContentCatalogEntry[] => buildCanonicalSubjectCatalog(liveSubjects, lang)

export const resolveCatalogEntry = (
  entries: ContentCatalogEntry[],
  subjectRef: string,
): ContentCatalogEntry | null => entries.find((entry) => entry.routeId === subjectRef) ?? null
