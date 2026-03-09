import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Tabs } from './index'

function TabsHarness() {
  const [active, setActive] = useState('video')
  return (
    <Tabs
      tabs={[
        { id: 'video', label: 'Video' },
        { id: 'quiz', label: 'Quiz' },
        { id: 'notes', label: 'Notes' },
      ]}
      active={active}
      onChange={setActive}
    />
  )
}

describe('Tabs', () => {
  it('moves selection and focus with keyboard arrows', () => {
    render(<TabsHarness />)

    const videoTab = screen.getByRole('tab', { name: 'Video' })
    const quizTab = screen.getByRole('tab', { name: 'Quiz' })
    const notesTab = screen.getByRole('tab', { name: 'Notes' })

    videoTab.focus()
    fireEvent.keyDown(videoTab, { key: 'ArrowRight' })
    expect(quizTab.getAttribute('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(quizTab)

    fireEvent.keyDown(quizTab, { key: 'End' })
    expect(notesTab.getAttribute('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(notesTab)

    fireEvent.keyDown(notesTab, { key: 'Home' })
    expect(videoTab.getAttribute('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(videoTab)
  })
})
