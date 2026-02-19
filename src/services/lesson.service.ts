/**
 * lesson.service.ts
 * Handles progress read/write to localStorage (swap for API calls when backend is live).
 */
import type { TopicProgressMap, LessonHistoryEntry, TopicProgressData, TopicStatus } from '../types'

const MAX_HISTORY = 20

// ─── Storage key helpers ──────────────────────────────────
const progressKey  = (userId: string) => `progress_${userId}`
const historyKey   = (userId: string) => `history_${userId}`

// ─── Progress ─────────────────────────────────────────────
export const lessonService = {
  getProgress: (userId: string): TopicProgressMap => {
    try {
      return JSON.parse(localStorage.getItem(progressKey(userId)) ?? '{}') as TopicProgressMap
    } catch {
      return {}
    }
  },

  saveProgress: (userId: string, map: TopicProgressMap): void => {
    // TODO: debounce + PATCH /progress when backend is ready
    localStorage.setItem(progressKey(userId), JSON.stringify(map))
  },

  patchTopicProgress: (
    userId:    string,
    subjectId: string,
    topicId:   string,
    data:      Partial<TopicProgressData>,
  ): TopicProgressMap => {
    const map   = lessonService.getProgress(userId)
    const key   = `${subjectId}_${topicId}`
    const next  = { ...map, [key]: { ...map[key], ...data } }
    lessonService.saveProgress(userId, next)
    return next
  },

  deriveStatus: (data: TopicProgressData): TopicStatus => {
    if (!data || !data.status) return 'locked'
    return data.status
  },

  // ─── History ─────────────────────────────────────────────
  getHistory: (userId: string): LessonHistoryEntry[] => {
    try {
      return JSON.parse(localStorage.getItem(historyKey(userId)) ?? '[]') as LessonHistoryEntry[]
    } catch {
      return []
    }
  },

  addHistory: (userId: string, entry: Omit<LessonHistoryEntry, 'timestamp'>): LessonHistoryEntry[] => {
    const prev    = lessonService.getHistory(userId)
    const filtered = prev.filter(h => h.topicId !== entry.topicId)
    const next    = [{ ...entry, timestamp: Date.now() }, ...filtered].slice(0, MAX_HISTORY)
    localStorage.setItem(historyKey(userId), JSON.stringify(next))
    return next
  },
}

export default lessonService
