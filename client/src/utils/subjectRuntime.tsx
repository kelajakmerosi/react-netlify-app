import type { ReactNode } from 'react'
import { BookOpen, Calculator, Dna, FlaskConical, Globe2, Sigma, Zap } from 'lucide-react'
import type { Subject, SubjectModule, Topic } from '../types'
import type { SubjectRecord } from '../services/subject.service'

const FALLBACK_COLORS = ['#3f68f7', '#0c95d8', '#10936a', '#e67d13', '#7c3aed', '#0ea5a4']

const iconByName: Record<string, ReactNode> = {
  calculator: <Calculator size={22} strokeWidth={2.35} />,
  sigma: <Sigma size={22} strokeWidth={2.35} />,
  zap: <Zap size={22} strokeWidth={2.35} />,
  dna: <Dna size={22} strokeWidth={2.35} />,
  flaskconical: <FlaskConical size={22} strokeWidth={2.35} />,
  flask: <FlaskConical size={22} strokeWidth={2.35} />,
  globe: <Globe2 size={22} strokeWidth={2.35} />,
  bookopen: <BookOpen size={22} strokeWidth={2.35} />,
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export const extractYouTubeVideoId = (raw = ''): string => {
  const value = String(raw || '').trim()
  if (!value) return ''

  const directMatch = value.match(/^[a-zA-Z0-9_-]{11}$/)
  if (directMatch) return directMatch[0]

  try {
    const url = new URL(value)
    if (url.hostname.includes('youtu.be')) {
      const candidate = url.pathname.split('/').filter(Boolean)[0]
      if (candidate) return candidate
    }
    const fromQuery = url.searchParams.get('v')
    if (fromQuery) return fromQuery

    const embedMatch = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]{6,})/)
    if (embedMatch) return embedMatch[1]
  } catch {
    // noop, fallback below
  }

  const fallbackMatch = value.match(/([a-zA-Z0-9_-]{11})/)
  return fallbackMatch ? fallbackMatch[1] : ''
}

const pickColor = (subjectId: string, rawColor?: string) => {
  if (rawColor && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(rawColor.trim())) return rawColor.trim()
  const hash = Array.from(subjectId).reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length]
}

const getIconNode = (iconName: string | undefined) => {
  const key = String(iconName || '').toLowerCase().replace(/\s+/g, '')
  return iconByName[key] || <BookOpen size={22} strokeWidth={2.35} />
}

export const toRuntimeSubject = (record: SubjectRecord): Subject => {
  const color = pickColor(record.id, record.color)
  const gradient = `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 58%, #ffffff 42%))`

  const topics: Topic[] = (record.topics || []).map((topic) => {
    const optionsSafe = (questionOptions: unknown) => {
      const options = Array.isArray(questionOptions) ? questionOptions.map((entry) => String(entry)) : []
      if (options.length >= 2) return options
      return ['Option A', 'Option B']
    }

    const questions = (topic.questions || []).map((question, idx) => {
      const options = optionsSafe(question.options)
      return {
        id: Number(question.id ?? idx + 1),
        text: String(question.text || `Question ${idx + 1}`),
        imageUrl: question.imageUrl || undefined,
        options,
        answer: clamp(Number(question.answer ?? 0), 0, options.length - 1),
        concept: question.concept || undefined,
      }
    })

    const resolvedVideoId = extractYouTubeVideoId(topic.videoId || topic.videoUrl || '')

    return {
      id: topic.id,
      title: topic.title,
      videoId: resolvedVideoId,
      videoUrl: topic.videoUrl || undefined,
      questions,
    }
  })

  const modules: SubjectModule[] = [{
    id: `${record.id}-foundation`,
    track: 'foundation',
    topicIds: topics.map((topic) => topic.id),
  }]

  return {
    id: record.id,
    title: record.title,
    description: record.description || '',
    iconName: record.icon,
    icon: getIconNode(record.icon),
    color,
    gradient,
    topics,
    modules,
  }
}
