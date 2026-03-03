import { ReactNode } from 'react'
// ─── Domain types ─────────────────────────────────────────

export type LocaleKey = 'uz' | 'en' | 'ru'

export type TopicStatus = 'completed' | 'inprogress' | 'onhold' | 'locked'
export type QuizDifficulty = 'easy' | 'medium' | 'hard'
export type ModuleTrack = 'foundation' | 'practice'

export interface Question {
  id:      number
  text:    string
  imageUrl?: string
  options: string[]
  answer:  number          // index of correct option
  difficulty?: QuizDifficulty
  explanation?: string
  concept?: string
}

export interface Topic {
  id:        string
  videoId:   string        // YouTube video ID
  questions: Question[]
  estimatedMinutes?: number
}

export interface SubjectModule {
  id:      string
  track:   ModuleTrack
  topicIds: string[]
}

export interface Subject {
  id:       string
  icon:     ReactNode
  color:    string
  gradient: string
  topics:   Topic[]
  modules:  SubjectModule[]
}

// ─── Auth types ───────────────────────────────────────────

export interface User {
  id:    string
  name:  string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  phoneVerified?: boolean
  role?: 'student' | 'admin' | 'superadmin'
  passwordSetAt?: string | null
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
  quizTotalQuestions?: number
  quizAnswers?:   Record<number, number>
  quizSubmitted?: boolean
  masteryScore?:  number
  quizAttempts?:  number
  quizAttemptHistory?: QuizAttemptEntry[]
  timeOnTaskSec?: number
  lastActivityAt?: number
  completedAt?:   number | null
  resumeQuestionIndex?: number
}

export type TopicProgressMap = Record<string, TopicProgressData>

export interface LessonHistoryEntry {
  subjectId:  string
  topicId:    string
  quizScore?: number
  timestamp:  number
}

export interface QuizAttemptEntry {
  id: string
  score: number
  totalQuestions: number
  masteryScore: number
  attemptedAt: number
}

export interface ResumeTarget {
  subjectId: string
  topicId:   string
  reason:    'resume' | 'weak' | 'next'
}

export interface WeakTopicInsight {
  subjectId:  string
  topicId:    string
  score:      number
  attempts:   number
  updatedAt:  number
}

export interface DueTodayItem {
  subjectId: string
  topicId:   string
  reason:    'inprogress' | 'weak' | 'planned'
}

export interface LearningSummary {
  totalTopics:       number
  completedTopics:   number
  completionPct:     number
  streakDays:        number
  timeOnTaskSec:     number
  lastActivityAt:    number | null
  resumeTarget:      ResumeTarget | null
  dueToday:          DueTodayItem[]
  weakTopics:        WeakTopicInsight[]
  recommendedNext:   ResumeTarget | null
}

export interface ProgressMetrics {
  streakDays: number
  timeOnTaskSec: number
  lastActivityAt: number | null
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
  signupRequestCode: (phone: string) => Promise<void>
  signupConfirm: (payload: {
    firstName: string
    lastName: string
    phone: string
    password: string
    code: string
  }) => Promise<User>
  loginWithPassword: (payload: { phone: string; password: string }) => Promise<User>
  legacyLoginOtpRequestCode: (phone: string) => Promise<void>
  legacyLoginOtpConfirm: (payload: { phone: string; code: string }) => Promise<{ user: User; requiresPasswordSetup: boolean }>
  passwordResetRequestCode: (phone: string) => Promise<void>
  passwordResetConfirmCode: (payload: { phone: string; code: string }) => Promise<{ resetToken: string; resetTokenTtlSec: number }>
  passwordResetComplete: (payload: { phone: string; resetToken: string; newPassword: string }) => Promise<void>
  passwordSetupComplete: (newPassword: string) => Promise<User>
  loginWithGoogle:   (idToken: string) => Promise<User>
  logout:            () => void
  continueAsGuest:   () => void
}

export interface AppContextValue {
  topicProgress:      TopicProgressMap
  lessonHistory:      LessonHistoryEntry[]
  learningSummary:    LearningSummary
  progressMetrics:    ProgressMetrics
  isHydrating:        boolean
  loadError:          string | null
  updateTopicProgress:(subjectId: string, topicId: string, data: Partial<TopicProgressData>) => void
  addLessonHistory:   (entry: Omit<LessonHistoryEntry, 'timestamp'>) => void
  recordTimeOnTask:   (subjectId: string, topicId: string, sec: number) => void
  retryLoad:          () => void
  getTopicStatus:     (subjectId: string, topicId: string) => TopicStatus
  getTopicData:       (subjectId: string, topicId: string) => TopicProgressData
}

// ─── Page / routing types ─────────────────────────────────

export type PageId = 'dashboard' | 'subjects' | 'subject' | 'topic' | 'profile' | 'admin'

export interface CurrentTopic {
  subjectId: string
  topicId:   string
}
