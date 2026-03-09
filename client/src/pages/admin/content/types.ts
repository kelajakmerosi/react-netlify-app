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
  order: number
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
    order: 0,
  },
  topics: [],
})

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
      order: Number(subject.order ?? 0),
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

  const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(input) ? input : `https://${input}`
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
  order: Number(draft.subject.order) || 0,
  topics: draft.topics
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
