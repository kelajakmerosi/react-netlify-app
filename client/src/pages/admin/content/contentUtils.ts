import type { SubjectRecord } from '../../../services/admin.service'
import type {
  BuilderStep,
  ContentDraft,
  QuestionDraftVm,
  StepCompletionState,
  TopicDraftVm,
  TopicStatus,
  ValidationIssue,
} from './types'
import { deriveTopicId } from './types'

const hasText = (value: string) => value.trim().length > 0

const isValidOptionalUrl = (value: string): boolean => {
  const input = value.trim()
  if (!input) return true

  const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(input) ? input : `https://${input}`
  try {
    // Validate normalized URL shape only; domain reachability is not checked here.
    new URL(withProtocol)
    return true
  } catch {
    return false
  }
}

export const extractYoutubeVideoId = (value: string): string => {
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

export const isQuestionComplete = (question: QuestionDraftVm): boolean => {
  const options = question.options.map((option) => option.trim()).filter(Boolean)
  return hasText(question.text) && options.length >= 2 && question.answer >= 0 && question.answer < options.length
}

export const isTopicCoreComplete = (topic: TopicDraftVm): boolean => {
  const hasVideo = hasText(topic.videoId) || Boolean(extractYoutubeVideoId(topic.videoUrl))
  return hasText(topic.title) && hasVideo
}

export const isTopicQuizComplete = (topic: TopicDraftVm): boolean => {
  return topic.questions.length > 0 && topic.questions.every(isQuestionComplete)
}

export const validateDraftForPublish = (draft: ContentDraft): ValidationIssue[] => {
  const issues: ValidationIssue[] = []

  if (!hasText(draft.subject.title)) {
    issues.push({
      step: 1,
      path: 'subject.title',
      message: 'adminContentIssueSubjectTitleRequired',
    })
  }

  if (draft.topics.length === 0) {
    issues.push({
      step: 2,
      path: 'topics',
      message: 'adminContentIssueTopicsRequired',
    })
  }

  draft.topics.forEach((topic, topicIndex) => {
    deriveTopicId(topic, topicIndex)

    if (!isTopicCoreComplete(topic)) {
      issues.push({
        step: 2,
        path: `topics.${topicIndex}`,
        message: 'adminContentIssueTopicCoreRequired',
      })
    }

    if (topic.questions.length === 0) {
      issues.push({
        step: 3,
        path: `topics.${topicIndex}.questions`,
        message: 'adminContentIssueQuestionRequired',
      })
      return
    }

    topic.questions.forEach((question, questionIndex) => {
      if (!isValidOptionalUrl(question.imageUrl)) {
        issues.push({
          step: 3,
          path: `topics.${topicIndex}.questions.${questionIndex}.imageUrl`,
          message: 'adminContentIssueInvalidUrl',
        })
      }

      if (!isQuestionComplete(question)) {
        issues.push({
          step: 3,
          path: `topics.${topicIndex}.questions.${questionIndex}`,
          message: 'adminContentIssueQuestionInvalid',
        })
      }
    })
  })

  return issues
}

export const buildStepCompletion = (draft: ContentDraft): StepCompletionState => {
  const step1 = hasText(draft.subject.title)
  const step2 = draft.topics.length > 0 && draft.topics.every(isTopicCoreComplete)
  const step3 = draft.topics.length > 0 && draft.topics.every(isTopicQuizComplete)

  return { step1, step2, step3 }
}

export const getFirstInvalidStep = (issues: ValidationIssue[]): BuilderStep => {
  if (issues.length === 0) return 4
  return issues.reduce<BuilderStep>((min, issue) => (issue.step < min ? issue.step : min), issues[0].step)
}

export const resolveTopicStatus = (
  topic: TopicDraftVm,
  liveSubject: SubjectRecord | null,
): TopicStatus => {
  const published = Boolean(liveSubject?.topics?.some((candidate) => candidate.id === topic.id))
  const coreComplete = isTopicCoreComplete(topic)
  const quizComplete = isTopicQuizComplete(topic)

  if (published && coreComplete && quizComplete) return 'published'
  if (coreComplete && quizComplete) return 'ready'
  return 'draft'
}

export const normalizeTopicOrders = (topics: TopicDraftVm[]): TopicDraftVm[] => (
  topics.map((topic, index) => ({ ...topic, order: index }))
)

export const sortByOrder = (topics: TopicDraftVm[]): TopicDraftVm[] => (
  [...topics].sort((a, b) => a.order - b.order)
)
