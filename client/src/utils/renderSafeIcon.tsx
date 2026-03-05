import { isValidElement, type ReactNode } from 'react'
import { BookOpen } from 'lucide-react'

export const renderSafeIcon = (icon: ReactNode) => {
  if (isValidElement(icon)) return icon
  if (typeof icon === 'string' || typeof icon === 'number') return icon
  return <BookOpen size={22} strokeWidth={2.35} />
}

