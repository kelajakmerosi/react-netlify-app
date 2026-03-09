import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type {
  AppContextValue,
  DueTodayItem,
  LearningSummary,
  LessonHistoryEntry,
  ProgressMetrics,
  ResumeTarget,
  TopicProgressData,
  TopicProgressMap,
  TopicStatus,
  WeakTopicInsight,
} from '../../types'
import { lessonService } from '../../services/lesson.service'
import { progressService } from '../../services/progress.service'
import { useAuth } from '../../hooks/useAuth'
import { SUBJECTS } from '../../constants'

export const AppContext = createContext<AppContextValue | null>(null)

const FALLBACK_METRICS: ProgressMetrics = {
  streakDays: 0,
  timeOnTaskSec: 0,
  lastActivityAt: null,
}

const toProgressErrorMessage = (err: unknown): string => {
  const raw = err instanceof Error ? err.message : String(err ?? '')
  const normalized = raw.toLowerCase()

  if (normalized.includes('failed to fetch') || normalized.includes('networkerror')) {
    return 'Progress sync failed: API server is unreachable. Start server with `cd server && npm run dev`.'
  }

  if (normalized.includes('api server is unreachable') || normalized.includes('api_unreachable')) {
    return 'Progress sync failed: API server is unreachable. Start server with `cd server && npm run dev`.'
  }

  if (
    normalized.includes('cors')
  ) {
    return 'Progress sync failed due to CORS. Check server CLIENT_URL and allowed origins.'
  }

  return raw || 'Progress sync failed. Please retry.'
}

const TOPIC_CATALOG = SUBJECTS.flatMap(subject =>
  subject.topics.map(topic => ({ subjectId: subject.id, topicId: topic.id })),
)

const toDayKey = (ts: number): string => {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

const computeLocalStreak = (activityTimestamps: number[]): number => {
  if (activityTimestamps.length === 0) return 0

  const daySet = new Set(activityTimestamps.map(toDayKey))
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)

  let streak = 0
  while (daySet.has(cursor.toISOString().slice(0, 10))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

const addUniqueDueToday = (
  target: DueTodayItem[],
  seen: Set<string>,
  item: DueTodayItem,
  max = 4,
) => {
  if (target.length >= max) return
  const key = `${item.subjectId}_${item.topicId}`
  if (seen.has(key)) return
  seen.add(key)
  target.push(item)
}

const toScorePct = (data: TopicProgressData): number => {
  if (typeof data.masteryScore === 'number') return data.masteryScore
  if (typeof data.quizScore !== 'number') return 0

  const fromHistory = data.quizAttemptHistory?.[0]?.totalQuestions
  const totalQuestions = data.quizTotalQuestions ?? fromHistory ?? 10
  if (!totalQuestions || totalQuestions <= 0) return 0

  return Math.round((data.quizScore / totalQuestions) * 100)
}

type TopicEntry = {
  subjectId: string
  topicId: string
  status: TopicStatus
  data: TopicProgressData
  scorePct: number
  updatedAt: number
}

const buildSummary = (
  topicProgress: TopicProgressMap,
  lessonHistory: LessonHistoryEntry[],
  progressMetrics: ProgressMetrics,
  topicCatalog: Array<{ subjectId: string; topicId: string }>,
): LearningSummary => {
  const entries: TopicEntry[] = topicCatalog.map(({ subjectId, topicId }) => {
    const key = `${subjectId}_${topicId}`
    const data = topicProgress[key] ?? {}
    const status = data.status ?? 'locked'
    const scorePct = toScorePct(data)

    return {
      subjectId,
      topicId,
      status,
      data,
      scorePct,
      updatedAt: data.lastActivityAt ?? 0,
    }
  })

  const totalTopics = entries.length
  const completedTopics = entries.filter(e => e.status === 'completed').length

  const weakTopics: WeakTopicInsight[] = entries
    .filter(e => e.data.quizSubmitted && e.scorePct < 75)
    .map(e => ({
      subjectId: e.subjectId,
      topicId: e.topicId,
      score: e.scorePct,
      attempts: e.data.quizAttempts ?? 1,
      updatedAt: e.updatedAt,
    }))
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score
      return b.updatedAt - a.updatedAt
    })

  const inProgress = entries
    .filter(e => e.status === 'inprogress' || e.status === 'onhold')
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))

  const nextPending = entries.find(e => e.status !== 'completed') ?? null

  const toTarget = (item: TopicEntry | WeakTopicInsight, reason: ResumeTarget['reason']): ResumeTarget => ({
    subjectId: item.subjectId,
    topicId: item.topicId,
    reason,
  })

  const resumeTarget = inProgress[0]
    ? toTarget(inProgress[0], 'resume')
    : weakTopics[0]
      ? toTarget(weakTopics[0], 'weak')
      : nextPending
        ? toTarget(nextPending, 'next')
        : null

  const recommendedNext = weakTopics[0]
    ? toTarget(weakTopics[0], 'weak')
    : nextPending
      ? toTarget(nextPending, 'next')
      : null

  const dueToday: DueTodayItem[] = []
  const dueTodaySeen = new Set<string>()

  inProgress.slice(0, 2).forEach(item => {
    addUniqueDueToday(dueToday, dueTodaySeen, {
      subjectId: item.subjectId,
      topicId: item.topicId,
      reason: 'inprogress',
    })
  })

  weakTopics.slice(0, 2).forEach(item => {
    addUniqueDueToday(dueToday, dueTodaySeen, {
      subjectId: item.subjectId,
      topicId: item.topicId,
      reason: 'weak',
    })
  })

  if (nextPending) {
    addUniqueDueToday(dueToday, dueTodaySeen, {
      subjectId: nextPending.subjectId,
      topicId: nextPending.topicId,
      reason: 'planned',
    })
  }

  const allActivity = entries
    .map(e => e.data.lastActivityAt)
    .concat(lessonHistory.map(h => h.timestamp))
    .filter((ts): ts is number => typeof ts === 'number' && ts > 0)

  const localTimeOnTask = entries.reduce((sum, e) => sum + (e.data.timeOnTaskSec ?? 0), 0)
  const localLastActivity = allActivity.reduce((max, ts) => (ts > max ? ts : max), 0)

  return {
    totalTopics,
    completedTopics,
    completionPct: totalTopics === 0 ? 0 : Math.round((completedTopics / totalTopics) * 100),
    streakDays: progressMetrics.streakDays || computeLocalStreak(allActivity),
    timeOnTaskSec: Math.max(progressMetrics.timeOnTaskSec, localTimeOnTask),
    lastActivityAt: Math.max(progressMetrics.lastActivityAt ?? 0, localLastActivity) || null,
    resumeTarget,
    dueToday,
    weakTopics,
    recommendedNext,
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  const [topicProgress, setTopicProgress] = useState<TopicProgressMap>({})
  const [lessonHistory, setLessonHistory] = useState<LessonHistoryEntry[]>([])
  const [progressMetrics, setProgressMetrics] = useState<ProgressMetrics>(FALLBACK_METRICS)
  const [topicCatalog, setTopicCatalog] = useState(TOPIC_CATALOG)
  const [isHydrating, setIsHydrating] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadState = useCallback(async () => {
    if (!user) {
      setTopicProgress({})
      setLessonHistory([])
      setProgressMetrics(FALLBACK_METRICS)
      setTopicCatalog(TOPIC_CATALOG)
      setLoadError(null)
      setIsHydrating(false)
      return
    }

    setIsHydrating(true)
    setLoadError(null)

    const localProgress = lessonService.getProgress(user.id)
    const localHistory = lessonService.getHistory(user.id)

    setTopicProgress(localProgress)
    setLessonHistory(localHistory)
    setTopicCatalog(TOPIC_CATALOG)

    try {
      const remote = await progressService.getProgress(user.token)
      const nextProgress = remote.topicProgress ?? {}
      const nextHistory = remote.lessonHistory ?? []
      const hasRemoteData = Object.keys(nextProgress).length > 0 || nextHistory.length > 0

      setTopicProgress(hasRemoteData ? nextProgress : localProgress)
      setLessonHistory(hasRemoteData ? nextHistory : localHistory)
      setProgressMetrics(remote.metrics ?? FALLBACK_METRICS)

      lessonService.saveProgress(user.id, hasRemoteData ? nextProgress : localProgress)
      lessonService.saveHistory(user.id, hasRemoteData ? nextHistory : localHistory)
    } catch (err) {
      setProgressMetrics(FALLBACK_METRICS)
      setLoadError(toProgressErrorMessage(err))
    } finally {
      setIsHydrating(false)
    }
  }, [user])

  useEffect(() => {
    void loadState()
  }, [loadState])

  const updateTopicProgress = useCallback(
    (subjectId: string, topicId: string, data: Partial<TopicProgressData>) => {
      if (!user) return

      const nextPatch: Partial<TopicProgressData> = {
        ...data,
        lastActivityAt: data.lastActivityAt ?? Date.now(),
      }

      const nextProgress = lessonService.patchTopicProgress(user.id, subjectId, topicId, nextPatch)
      setTopicProgress(nextProgress)

      setProgressMetrics(prev => ({
        ...prev,
        lastActivityAt: Math.max(prev.lastActivityAt ?? 0, nextPatch.lastActivityAt ?? 0) || null,
        timeOnTaskSec: Math.max(prev.timeOnTaskSec, nextPatch.timeOnTaskSec ?? 0),
      }))

      void progressService
        .patchTopicProgress(subjectId, topicId, nextPatch, user.token)
        .then(snapshot => {
          setTopicProgress(snapshot.topicProgress)
          setLessonHistory(snapshot.lessonHistory)
          setProgressMetrics(snapshot.metrics)
          setLoadError(null)

          lessonService.saveProgress(user.id, snapshot.topicProgress)
          lessonService.saveHistory(user.id, snapshot.lessonHistory)
        })
        .catch((err) => {
          setLoadError(toProgressErrorMessage(err))
        })
    },
    [user],
  )

  const addLessonHistory = useCallback(
    (entry: Omit<LessonHistoryEntry, 'timestamp'>) => {
      if (!user) return
      const next = lessonService.addHistory(user.id, entry)
      setLessonHistory(next)
    },
    [user],
  )

  const recordTimeOnTask = useCallback(
    (subjectId: string, topicId: string, sec: number) => {
      if (!user) return

      const delta = Math.round(sec)
      if (delta <= 0) return

      const key = `${subjectId}_${topicId}`
      const current = topicProgress[key] ?? {}
      const nextTime = (current.timeOnTaskSec ?? 0) + delta

      const nextStatus: TopicStatus = current.status === 'completed'
        ? 'completed'
        : (current.status && current.status !== 'locked')
          ? current.status
          : 'inprogress'

      updateTopicProgress(subjectId, topicId, {
        timeOnTaskSec: nextTime,
        status: nextStatus,
        lastActivityAt: Date.now(),
      })
    },
    [topicProgress, updateTopicProgress, user],
  )

  const getTopicStatus = useCallback(
    (subjectId: string, topicId: string): TopicStatus => {
      const data = topicProgress[`${subjectId}_${topicId}`]
      return data?.status ?? 'locked'
    },
    [topicProgress],
  )

  const getTopicData = useCallback(
    (subjectId: string, topicId: string): TopicProgressData =>
      topicProgress[`${subjectId}_${topicId}`] ?? {},
    [topicProgress],
  )

  const learningSummary = useMemo(
    () => buildSummary(topicProgress, lessonHistory, progressMetrics, topicCatalog),
    [lessonHistory, progressMetrics, topicCatalog, topicProgress],
  )

  const retryLoad = useCallback(() => {
    void loadState()
  }, [loadState])

  return (
    <AppContext.Provider
      value={{
        topicProgress,
        lessonHistory,
        learningSummary,
        progressMetrics,
        isHydrating,
        loadError,
        updateTopicProgress,
        addLessonHistory,
        recordTimeOnTask,
        retryLoad,
        getTopicStatus,
        getTopicData,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}
