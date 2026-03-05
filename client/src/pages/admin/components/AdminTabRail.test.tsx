import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AdminTabRail } from './AdminTabRail'
import type { AdminTab } from '../types'

describe('AdminTabRail', () => {
  it('renders tabs and changes selection', () => {
    const onChange = vi.fn()
    const tabs: Array<{ id: AdminTab; label: string }> = [
      { id: 'overview', label: 'Overview' },
      { id: 'users', label: 'Users' },
    ]

    render(
      <AdminTabRail
        tabs={tabs}
        active="overview"
        onChange={onChange}
        ariaLabel="Admin tabs"
      />,
    )

    fireEvent.click(screen.getByRole('tab', { name: 'Users' }))
    expect(onChange).toHaveBeenCalled()
  })

  it('keeps active aria state when hovering active tab', () => {
    const onChange = vi.fn()
    const tabs: Array<{ id: AdminTab; label: string }> = [
      { id: 'overview', label: 'Overview' },
      { id: 'users', label: 'Users' },
      { id: 'content', label: 'Content' },
    ]

    render(
      <AdminTabRail
        tabs={tabs}
        active="users"
        onChange={onChange}
        ariaLabel="Admin tabs"
      />,
    )

    const activeTab = screen.getByRole('tab', { name: 'Users' })
    fireEvent.mouseEnter(activeTab)
    expect(activeTab.getAttribute('aria-selected')).toBe('true')
    fireEvent.mouseLeave(activeTab)
    expect(activeTab.getAttribute('aria-selected')).toBe('true')
    expect(onChange).not.toHaveBeenCalled()
  })
})
