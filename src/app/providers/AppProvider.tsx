import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import type { AppContextValue, TopicProgressData, TopicProgressMap, LessonHistoryEntry, TopicStatus } from '../../types'
import { lessonService } from '../../services/lesson.service'
import { useAuth } from '../../hooks/useAuth'

export const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  const [topicProgress, setTopicProgress] = useState<TopicProgressMap>(() =>
    user ? lessonService.getProgress(user.id) : {},
  )

  const [lessonHistory, setLessonHistory] = useState<LessonHistoryEntry[]>(() =>
    user ? lessonService.getHistory(user.id) : [],
  )

  // Re-load when user changes (login/logout)
  useEffect(() => {
    if (user) {
      setTopicProgress(lessonService.getProgress(user.id))
      setLessonHistory(lessonService.getHistory(user.id))
    } else {
      setTopicProgress({})
      setLessonHistory([])
    }
  }, [user?.id])

  const updateTopicProgress = useCallback(
    (subjectId: string, topicId: string, data: Partial<TopicProgressData>) => {
      if (!user) return
      const next = lessonService.patchTopicProgress(user.id, subjectId, topicId, data)
      setTopicProgress(next)
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

  return (
    <AppContext.Provider value={{
      topicProgress, lessonHistory,
      updateTopicProgress, addLessonHistory,
      getTopicStatus, getTopicData,
    }}>
      {children}
    </AppContext.Provider>
  )
}
