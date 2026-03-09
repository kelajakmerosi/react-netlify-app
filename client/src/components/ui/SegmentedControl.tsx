import { useRef, type CSSProperties, type KeyboardEvent } from 'react'
import { cn } from '../../utils'
import styles from './SegmentedControl.module.css'

interface SegmentedOption<T extends string | number> {
  id: T
  label: string
  disabled?: boolean
}

interface SegmentedControlProps<T extends string | number> {
  options: Array<SegmentedOption<T>>
  value: T
  onChange: (next: T) => void
  ariaLabel: string
  className?: string
  style?: CSSProperties
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
  style,
}: SegmentedControlProps<T>) {
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const enabledOptions = options.filter((option) => !option.disabled)

  const focusById = (id: T) => {
    const node = tabRefs.current[String(id)]
    node?.focus()
  }

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentId: T) => {
    if (!enabledOptions.length) return

    const currentIndex = enabledOptions.findIndex((option) => option.id === currentId)
    if (currentIndex < 0) return

    let nextIndex = currentIndex

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % enabledOptions.length
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + enabledOptions.length) % enabledOptions.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = enabledOptions.length - 1
    } else {
      return
    }

    event.preventDefault()
    const nextId = enabledOptions[nextIndex]?.id
    if (nextId === undefined) return

    onChange(nextId)
    focusById(nextId)
  }

  return (
    <div className={cn(styles.root, className)} role="tablist" aria-label={ariaLabel} style={style}>
      {options.map((option) => {
        const active = option.id === value
        const optionKey = String(option.id)
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            disabled={option.disabled}
            className={cn(styles.item, active && styles.itemActive)}
            onClick={() => onChange(option.id)}
            onKeyDown={(event) => onTabKeyDown(event, option.id)}
            ref={(node) => {
              tabRefs.current[optionKey] = node
            }}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
