import { SUBJECT_NAMES } from '../../../constants'
import type { SubjectVisual } from '../../../utils/subjectVisuals'
import { getSubjectVisual } from '../../../utils/subjectVisuals'

export interface SubjectPreset {
  id: string
  icon: string
  color: string
  visual: SubjectVisual
}

const PRESET_CONFIG: Array<{ id: string; icon: string; color: string }> = [
  { id: 'math', icon: 'calculator', color: '#3f68f7' },
  { id: 'physics', icon: 'zap', color: '#0c95d8' },
  { id: 'biology', icon: 'dna', color: '#10936a' },
  { id: 'chemistry', icon: 'flaskconical', color: '#e58411' },
  { id: 'history', icon: 'bookopen', color: '#9a6a3a' },
  { id: 'geometry', icon: 'sigma', color: '#6e59f5' },
]

export const SUBJECT_PRESETS: SubjectPreset[] = PRESET_CONFIG.map((preset) => ({
  ...preset,
  visual: getSubjectVisual(preset.id),
}))

export const resolveSubjectPresetId = (icon = '', color = ''): string | null => {
  const normalizedIcon = icon.trim().toLowerCase()
  const normalizedColor = color.trim().toLowerCase()
  const byIcon = SUBJECT_PRESETS.find((preset) => preset.icon === normalizedIcon)
  if (byIcon) return byIcon.id
  const byColor = SUBJECT_PRESETS.find((preset) => preset.color.toLowerCase() === normalizedColor)
  return byColor?.id ?? null
}

export const getSubjectPresetTitle = (presetId: string, lang: keyof typeof SUBJECT_NAMES): string => (
  SUBJECT_NAMES[lang]?.[presetId] ?? presetId
)
