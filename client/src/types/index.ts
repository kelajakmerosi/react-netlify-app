import { ReactNode } from 'react'
// ─── Domain types ─────────────────────────────────────────

export type LocaleKey = 'uz' | 'en' | 'ru'

export type TopicStatus = 'completed' | 'inprogress' | 'onhold' | 'locked'

export interface Question {
  id:      number
  text:    string
  options: string[]
  answer:  number          // index of correct option
}

export interface Topic {
  id:        string
  videoId:   string        // YouTube video ID
  questions: Question[]
}

export interface Subject {
  id:       string
  icon:     ReactNode
  color:    string
  gradient: string
  topics:   Topic[]
}

// ─── Auth types ───────────────────────────────────────────

export interface User {
  id:    string
  name:  string
  email: string
  token: string            // JWT-ready
}

export interface AuthState {
  user:    User | null
  isGuest: boolean
}

// ─── Progress & history types ─────────────────────────────

export interface TopicProgressData {
  status?:        TopicStatus
  videoWatched?:  boolean
  quizScore?:     number
  quizAnswers?:   Record<number, number>
  quizSubmitted?: boolean
}

export type TopicProgressMap = Record<string, TopicProgressData>

export interface LessonHistoryEntry {
  subjectId:  string
  topicId:    string
  quizScore?: number
  timestamp:  number
}

// ─── Context types ────────────────────────────────────────

export interface ThemeContextValue {
  theme:       'light' | 'dark'
  toggleTheme: () => void
}

export interface LanguageContextValue {
  lang:       LocaleKey
  changeLang: (l: LocaleKey) => void
  t:          (key: string) => string
}

export interface AuthContextValue extends AuthState {
  login:             (emailOrUsername: string, password: string) => Promise<User>
  register:          (name: string, email: string, password: string) => Promise<User>
  loginWithGoogle:   (idToken: string) => Promise<User>
  logout:            () => void
  continueAsGuest:   () => void
}

export interface AppContextValue {
  topicProgress:      TopicProgressMap
  lessonHistory:      LessonHistoryEntry[]
  updateTopicProgress:(subjectId: string, topicId: string, data: Partial<TopicProgressData>) => void
  addLessonHistory:   (entry: Omit<LessonHistoryEntry, 'timestamp'>) => void
  getTopicStatus:     (subjectId: string, topicId: string) => TopicStatus
  getTopicData:       (subjectId: string, topicId: string) => TopicProgressData
}

// ─── Page / routing types ─────────────────────────────────

export type PageId = 'dashboard' | 'subjects' | 'subject' | 'topic' | 'profile'

export interface CurrentTopic {
  subjectId: string
  topicId:   string
}
