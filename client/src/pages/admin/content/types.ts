import type { SubjectSection } from '@shared/contracts'
import type { SubjectRecord, SubjectQuestion, SubjectTopic } from '../../../services/admin.service'

export type BuilderStep = 1 | 2 | 3 | 4
export type ContentSubtab = 'overview' | 'subjects' | 'exams' | 'imports'

export type TopicStatus = 'draft' | 'ready' | 'published'

export interface QuestionDraftVm {
  id?: number
  text: string
  imageUrl: string
  options: string[]
  answer: number
  concept: string
}

export interface TopicDraftVm {
  id: string
  title: string
  videoId: string
  videoUrl: string
  order: number
  questions: QuestionDraftVm[]
}

export interface SubjectDraftVm {
  title: string
  description: string
  icon: string
  color: string
  imageUrl: string
  order: number
  visualMode: 'preset' | 'manual'
}

export interface ContentDraft {
  subject: SubjectDraftVm
  topics: TopicDraftVm[]
}

export interface ValidationIssue {
  step: BuilderStep
  path: string
  message: string
}

export interface StepCompletionState {
  step1: boolean
  step2: boolean
  step3: boolean
}

export interface StoredDraftPayload {
  savedAt: number
  draft: ContentDraft
  sections?: SubjectSection[]
}

const normalizeString = (value: unknown, fallback = ''): string => (
  typeof value === 'string' ? value : fallback
)

const normalizeNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const slugifyTopicIdSeed = (value: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized
}

export const deriveTopicId = (
  topic: Pick<TopicDraftVm, 'id' | 'title'>,
  fallbackIndex: number,
): string => {
  const explicitId = topic.id.trim()
  if (explicitId) return explicitId

  const fromTitle = slugifyTopicIdSeed(topic.title)
  if (fromTitle) return fromTitle

  return `topic-${fallbackIndex + 1}`
}

export const ensureUniqueTopicIds = (topics: TopicDraftVm[]): TopicDraftVm[] => {
  const used = new Set<string>()

  return topics.map((topic, index) => {
    const baseId = deriveTopicId(topic, index)
    let nextId = baseId
    let suffix = 2

    while (used.has(nextId)) {
      nextId = `${baseId}-${suffix}`
      suffix += 1
    }

    used.add(nextId)
    return { ...topic, id: nextId }
  })
}

export const NEW_SUBJECT_ID = '__content_builder_new_subject__'

export const emptyQuestionDraft = (): QuestionDraftVm => ({
  text: '',
  imageUrl: '',
  options: ['', '', '', ''],
  answer: 0,
  concept: '',
})

export const emptyTopicDraft = (order = 0): TopicDraftVm => ({
  id: '',
  title: '',
  videoId: '',
  videoUrl: '',
  order,
  questions: [emptyQuestionDraft()],
})

export const emptyContentDraft = (): ContentDraft => ({
  subject: {
    title: '',
    description: '',
    icon: 'calculator',
    color: '#3f68f7',
    imageUrl: '',
    order: 0,
    visualMode: 'preset',
  },
  topics: [],
})

export const normalizeContentDraft = (draft: unknown): ContentDraft => {
  const source = (draft && typeof draft === 'object') ? draft as Partial<ContentDraft> : {}
  const subject = (source.subject && typeof source.subject === 'object')
    ? source.subject as Partial<SubjectDraftVm>
    : {}
  const topics = Array.isArray(source.topics) ? source.topics : []

  return {
    subject: {
      title: normalizeString(subject.title),
      description: normalizeString(subject.description),
      icon: normalizeString(subject.icon, 'calculator'),
      color: normalizeString(subject.color, '#3f68f7'),
      imageUrl: normalizeString(subject.imageUrl),
      order: normalizeNumber(subject.order, 0),
      visualMode: subject.visualMode === 'manual' || normalizeString(subject.imageUrl).length > 0
        ? 'manual'
        : 'preset',
    },
    topics: topics.map((topic, topicIndex) => {
      const sourceTopic = (topic && typeof topic === 'object') ? topic as Partial<TopicDraftVm> : {}
      const questions = Array.isArray(sourceTopic.questions) ? sourceTopic.questions : []

      return {
        id: normalizeString(sourceTopic.id),
        title: normalizeString(sourceTopic.title),
        videoId: normalizeString(sourceTopic.videoId),
        videoUrl: normalizeString(sourceTopic.videoUrl),
        order: normalizeNumber(sourceTopic.order, topicIndex),
        questions: questions.map((question) => {
          const sourceQuestion = (question && typeof question === 'object') ? question as Partial<QuestionDraftVm> : {}
          const options = Array.isArray(sourceQuestion.options)
            ? sourceQuestion.options.map((option) => normalizeString(option)).filter(Boolean)
            : []

          return {
            id: typeof sourceQuestion.id === 'number' ? sourceQuestion.id : undefined,
            text: normalizeString(sourceQuestion.text),
            imageUrl: normalizeString(sourceQuestion.imageUrl),
            options: options.length > 0 ? options : ['', '', '', ''],
            answer: normalizeNumber(sourceQuestion.answer, 0),
            concept: normalizeString(sourceQuestion.concept),
          }
        }),
      }
    }),
  }
}

export const toQuestionDraft = (question: SubjectQuestion): QuestionDraftVm => ({
  id: question.id,
  text: question.text ?? '',
  imageUrl: question.imageUrl ?? '',
  options: (question.options ?? []).length > 0 ? [...question.options] : ['', '', '', ''],
  answer: Number(question.answer ?? 0),
  concept: question.concept ?? '',
})

export const toTopicDraft = (topic: SubjectTopic, order: number): TopicDraftVm => ({
  id: topic.id ?? '',
  title: topic.title ?? '',
  videoId: topic.videoId ?? '',
  videoUrl: topic.videoUrl ?? '',
  order,
  questions: (topic.questions ?? []).map(toQuestionDraft),
})

export const toContentDraft = (subject: SubjectRecord | null): ContentDraft => {
  if (!subject) return emptyContentDraft()

  return {
    subject: {
      title: subject.title ?? '',
      description: subject.description ?? '',
      icon: subject.icon ?? 'calculator',
      color: subject.color ?? '#3f68f7',
      imageUrl: subject.imageUrl ?? subject.image_url ?? '',
      order: Number(subject.order ?? 0),
      visualMode: subject.imageUrl || subject.image_url ? 'manual' : 'preset',
    },
    topics: (subject.topics ?? []).map((topic, index) => toTopicDraft(topic, index)),
  }
}

const extractYoutubeVideoId = (value: string): string => {
  const input = value.trim()
  if (!input) return ''

  try {
    const url = new URL(input)
    const host = url.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      return url.pathname.replace('/', '').trim()
    }

    if (host.endsWith('youtube.com')) {
      const watchId = url.searchParams.get('v')
      if (watchId) return watchId.trim()

      const parts = url.pathname.split('/').filter(Boolean)
      const embedIndex = parts.findIndex((part) => part === 'embed' || part === 'shorts' || part === 'live')
      if (embedIndex >= 0 && parts[embedIndex + 1]) return parts[embedIndex + 1].trim()
    }
  } catch {
    return ''
  }

  return ''
}

const normalizeOptionalUrl = (value: string): string | undefined => {
  const input = value.trim()
  if (!input) return undefined

  if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(input)) {
    return input
  }

  const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(input) ? input : `https://${input}`
  try {
    const parsed = new URL(withProtocol)
    return parsed.toString()
  } catch {
    return undefined
  }
}

export const toSubjectPayload = (draft: ContentDraft): Omit<SubjectRecord, 'id'> => ({
  title: draft.subject.title.trim(),
  description: draft.subject.description.trim(),
  icon: draft.subject.icon.trim() || 'calculator',
  color: draft.subject.color.trim() || '#3f68f7',
  imageUrl: draft.subject.visualMode === 'manual'
    ? (normalizeOptionalUrl(draft.subject.imageUrl) ?? null)
    : null,
  order: Number(draft.subject.order) || 0,
  topics: ensureUniqueTopicIds(draft.topics)
    .sort((a, b) => a.order - b.order)
    .map((topic) => ({
      id: topic.id.trim(),
      title: topic.title.trim(),
      videoId: topic.videoId.trim() || extractYoutubeVideoId(topic.videoUrl),
      videoUrl: normalizeOptionalUrl(topic.videoUrl),
      questions: topic.questions.map((question) => {
        const options = question.options.map((option) => option.trim()).filter(Boolean)
        return {
          id: question.id,
          text: question.text.trim(),
          imageUrl: normalizeOptionalUrl(question.imageUrl),
          options,
          answer: Number(question.answer) || 0,
          concept: question.concept.trim() || undefined,
        }
      }),
    })),
})
