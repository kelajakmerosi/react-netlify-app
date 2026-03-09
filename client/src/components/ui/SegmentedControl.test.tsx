import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SegmentedControl } from './SegmentedControl'

describe('SegmentedControl', () => {
  it('renders tabs and calls onChange', () => {
    const onChange = vi.fn()

    render(
      <SegmentedControl
        options={[
          { id: 'one', label: 'One' },
          { id: 'two', label: 'Two' },
        ]}
        value="one"
        onChange={onChange}
        ariaLabel="Segmented"
      />,
    )

    const tabTwo = screen.getByRole('tab', { name: 'Two' })
    fireEvent.click(tabTwo)

    expect(onChange).toHaveBeenCalledWith('two')
  })

  it('supports keyboard navigation and skips disabled options', () => {
    const onChange = vi.fn()

    render(
      <SegmentedControl
        options={[
          { id: 'one', label: 'One' },
          { id: 'two', label: 'Two', disabled: true },
          { id: 'three', label: 'Three' },
        ]}
        value="one"
        onChange={onChange}
        ariaLabel="Keyboard segmented"
      />,
    )

    const tabOne = screen.getByRole('tab', { name: 'One' })
    const tabThree = screen.getByRole('tab', { name: 'Three' })

    tabOne.focus()
    fireEvent.keyDown(tabOne, { key: 'ArrowRight' })
    expect(onChange).toHaveBeenLastCalledWith('three')
    expect(document.activeElement).toBe(tabThree)

    fireEvent.keyDown(tabThree, { key: 'Home' })
    expect(onChange).toHaveBeenLastCalledWith('one')
    expect(document.activeElement).toBe(tabOne)
  })

  it('matches snapshot', () => {
    const { container } = render(
      <SegmentedControl
        options={[
          { id: 'alpha', label: 'Alpha' },
          { id: 'beta', label: 'Beta', disabled: true },
        ]}
        value="alpha"
        onChange={() => {}}
        ariaLabel="Snapshot segmented"
      />,
    )

    expect(container).toMatchSnapshot()
  })
})
