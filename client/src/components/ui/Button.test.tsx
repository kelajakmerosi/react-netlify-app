import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renders primary variant and fires click handler', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Save</Button>)

    const button = screen.getByRole('button', { name: 'Save' })
    fireEvent.click(button)

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(button.className).toContain('btnPrimary')
  })

  it('renders nav active state', () => {
    render(
      <Button variant="nav" active>
        Dashboard
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Dashboard' })
    expect(button.className).toContain('btnNav')
    expect(button.className).toContain('btnNavActive')
  })

  it('matches snapshot for key variants', () => {
    const { container } = render(
      <div>
        <Button variant="primary">Primary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
        <Button variant="icon" aria-label="icon button">+</Button>
      </div>,
    )

    expect(container).toMatchSnapshot()
  })
})
