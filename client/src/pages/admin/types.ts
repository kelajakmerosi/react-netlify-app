import type {
  AdminUserSummary,
  AnalyticsBreakdown,
  AnalyticsSummary,
  AnalyticsTimeseries,
  SubjectQuestion,
  SubjectRecord,
  SubjectTopic,
  SystemInfo,
} from '../../services/admin.service'

export type AdminTab = 'overview' | 'users' | 'content' | 'analytics'

export interface TopicQuestionDraft {
  id?: number
  text: string
  imageUrl?: string
  optionsText: string
  answer: number
  concept?: string
}

export interface TopicDraft {
  id: string
  title: string
  videoId: string
  videoUrl?: string
  questions: TopicQuestionDraft[]
}

export interface SubjectDraft {
  title: string
  description: string
  icon: string
  color: string
  order: number
  topics: SubjectTopic[]
}

export interface KpiVm {
  label: string
  value: string | number
}

export interface TrendVm {
  title: string
  subtitle: string
  contextLabel: string
  points: Array<{ bucket: string; value: number }>
  valueSuffix?: string
}

export interface BreakdownVm {
  title: string
  subtitle: string
  contextLabel: string
  items: Array<{ label: string; value: number }>
}

export interface AdminCoreState {
  info: SystemInfo | null
  users: AdminUserSummary[]
  subjects: SubjectRecord[]
}

export interface AnalyticsState {
  summary: AnalyticsSummary | null
  growthSeries: AnalyticsTimeseries | null
  activeSeries: AnalyticsTimeseries | null
  completionSeries: AnalyticsTimeseries | null
  quizSeries: AnalyticsTimeseries | null
  subjectBreakdown: AnalyticsBreakdown | null
  authBreakdown: AnalyticsBreakdown | null
  quizBreakdown: AnalyticsBreakdown | null
}

export interface ConfirmDeleteState {
  open: boolean
  user: AdminUserSummary | null
}

export const NEW_SUBJECT_ID = '__new_subject__'

export const emptySubjectDraft = (): SubjectDraft => ({
  title: '',
  description: '',
  icon: '📘',
  color: '#3f68f7',
  order: 0,
  topics: [],
})

export const emptyTopicDraft = (): TopicDraft => ({
  id: '',
  title: '',
  videoId: '',
  videoUrl: '',
  questions: [],
})

export const toTopicDraft = (topic: SubjectTopic): TopicDraft => ({
  id: topic.id,
  title: topic.title,
  videoId: topic.videoId,
  videoUrl: topic.videoUrl ?? '',
  questions: (topic.questions || []).map((question) => ({
    id: question.id,
    text: question.text,
    imageUrl: question.imageUrl ?? '',
    optionsText: question.options.join(' | '),
    answer: question.answer,
    concept: question.concept ?? '',
  })),
})

export const fromTopicDraft = (draft: TopicDraft): SubjectTopic => ({
  id: draft.id.trim(),
  title: draft.title.trim(),
  videoId: draft.videoId.trim(),
  videoUrl: draft.videoUrl?.trim() || undefined,
  questions: draft.questions.map((question) => {
    const options = question.optionsText
      .split('|')
      .map((option) => option.trim())
      .filter(Boolean)

    const payload: SubjectQuestion = {
      text: question.text.trim(),
      imageUrl: question.imageUrl?.trim() || undefined,
      options,
      answer: Number(question.answer) || 0,
    }

    if (question.id) payload.id = question.id
    if (question.concept?.trim()) payload.concept = question.concept.trim()
    return payload
  }),
})

export const toSubjectDraft = (subject: SubjectRecord): SubjectDraft => ({
  title: subject.title ?? '',
  description: subject.description ?? '',
  icon: subject.icon ?? '📘',
  color: subject.color ?? '#3f68f7',
  order: subject.order ?? 0,
  topics: subject.topics ?? [],
})

export const buildDefaultRange = (days = 30) => {
  const to = new Date()
  const from = new Date(to.getTime() - (days * 24 * 60 * 60 * 1000))
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  }
}
