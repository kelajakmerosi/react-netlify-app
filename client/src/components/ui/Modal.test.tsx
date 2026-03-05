import { fireEvent, render, screen } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

describe('Modal', () => {
  it('renders when open and closes on overlay click', () => {
    const onClose = vi.fn()

    render(
      <Modal open title="Confirm action" onClose={onClose}>
        <p>Body</p>
      </Modal>,
    )

    expect(screen.getByRole('dialog')).toBeTruthy()

    const overlay = screen.getByRole('dialog').parentElement
    if (!overlay) throw new Error('Overlay not found')
    fireEvent.mouseDown(overlay)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape when dismissible', () => {
    const onClose = vi.fn()

    render(
      <Modal open title="Keyboard close" onClose={onClose}>
        <p>Body</p>
      </Modal>,
    )

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not close on Escape when not dismissible', () => {
    const onClose = vi.fn()

    render(
      <Modal open title="Locked modal" dismissible={false} onClose={onClose}>
        <p>Body</p>
      </Modal>,
    )

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(0)
  })

  it('traps keyboard focus within dialog', () => {
    render(
      <Modal open title="Focus trap" onClose={() => {}}>
        <button type="button">First action</button>
        <button type="button">Second action</button>
      </Modal>,
    )

    const first = screen.getByRole('button', { name: 'First action' })
    const second = screen.getByRole('button', { name: 'Second action' })

    first.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(second)
  })

  it('passes a11y check', async () => {
    const { container } = render(
      <Modal open title="A11y modal" onClose={() => {}}>
        <p>Accessible body</p>
      </Modal>,
    )

    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})
