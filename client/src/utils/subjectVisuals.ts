import {
  Atom,
  BookOpen,
  Calculator,
  Dna,
  FlaskConical,
  Sigma,
  type LucideIcon,
} from 'lucide-react'

export interface SubjectVisual {
  Icon: LucideIcon
  thumb: string
  media: string
  imageUrl: string
  imageAlt: string
}

const TOPIC_VISUALS: Record<string, Partial<SubjectVisual>> = {
  'algebra-basics': {
    imageUrl: '/subject-visuals/user/algebra-1600.jpg',
    imageAlt: 'Algebra study artwork',
  },
  geometry: {
    imageUrl: '/subject-visuals/user/geometry-1600.jpg',
    imageAlt: 'Geometry study artwork',
  },
  statistics: {
    imageUrl: '/subject-visuals/user/algebra-1600.jpg',
    imageAlt: 'Mathematics study artwork',
  },
}

const SUBJECT_VISUALS: Record<string, SubjectVisual> = {
  math: {
    Icon: Calculator,
    thumb: 'linear-gradient(135deg, #ece8ff, #e3dcff)',
    media: 'linear-gradient(135deg, #1e1b3f, #2a2560)',
    imageUrl: '/subject-visuals/user/algebra-1600.jpg',
    imageAlt: 'Mathematics study artwork',
  },
  physics: {
    Icon: Atom,
    thumb: 'linear-gradient(135deg, #e2f1ff, #d6e8ff)',
    media: 'linear-gradient(135deg, #102946, #193a63)',
    imageUrl: '/subject-visuals/user/physics.png',
    imageAlt: 'Physics study artwork',
  },
  chemistry: {
    Icon: FlaskConical,
    thumb: 'linear-gradient(135deg, #ffe9da, #ffe0c7)',
    media: 'linear-gradient(135deg, #40210e, #633213)',
    imageUrl: '/subject-visuals/user/chemistry.png',
    imageAlt: 'Chemistry study artwork',
  },
  biology: {
    Icon: Dna,
    thumb: 'linear-gradient(135deg, #e2f7ef, #d5f0e6)',
    media: 'linear-gradient(135deg, #123628, #1f563f)',
    imageUrl: '/subject-visuals/user/biology.png',
    imageAlt: 'Biology study artwork',
  },
  history: {
    Icon: BookOpen,
    thumb: 'linear-gradient(135deg, #f7efe3, #eadbc6)',
    media: 'linear-gradient(135deg, #4a2d18, #6b4322)',
    imageUrl: '/subject-visuals/user/history-1600.jpg',
    imageAlt: 'History study artwork',
  },
  geometry: {
    Icon: Sigma,
    thumb: 'linear-gradient(135deg, #ece8ff, #e3dcff)',
    media: 'linear-gradient(135deg, #21194a, #42308e)',
    imageUrl: '/subject-visuals/user/geometry-1600.jpg',
    imageAlt: 'Geometry study artwork',
  },
  default: {
    Icon: Sigma,
    thumb: 'linear-gradient(135deg, #ece8ff, #e3dcff)',
    media: 'linear-gradient(135deg, #1c1a35, #2c2855)',
    imageUrl: '/subject-visuals/user/algebra-1600.jpg',
    imageAlt: 'Study artwork',
  },
}

const normalize = (value?: string) => (value || '').toLowerCase().trim()

const resolveSubjectKey = (subjectId?: string) => {
  const normalized = normalize(subjectId)
  if (!normalized) return 'default'
  if (SUBJECT_VISUALS[normalized]) return normalized

  if (normalized.includes('math') || normalized.includes('matem')) return 'math'
  if (normalized.includes('phys') || normalized.includes('fiz')) return 'physics'
  if (normalized.includes('chem') || normalized.includes('kim')) return 'chemistry'
  if (normalized.includes('bio')) return 'biology'
  if (normalized.includes('hist') || normalized.includes('tarix')) return 'history'
  if (normalized.includes('geometry') || normalized.includes('geometri')) return 'geometry'

  return 'default'
}

export const getSubjectVisual = (subjectId?: string): SubjectVisual => {
  return SUBJECT_VISUALS[resolveSubjectKey(subjectId)]
}

export const getLearningVisual = (subjectId?: string, topicId?: string): SubjectVisual => {
  const subjectVisual = getSubjectVisual(subjectId)
  const normalizedTopic = normalize(topicId)
  const topicVisual = normalizedTopic ? TOPIC_VISUALS[normalizedTopic] : null

  if (!topicVisual) return subjectVisual

  return {
    ...subjectVisual,
    ...topicVisual,
  }
}

