import type { CSSProperties } from 'react'
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
  return (
    <div className={cn(styles.root, className)} role="tablist" aria-label={ariaLabel} style={style}>
      {options.map((option) => {
        const active = option.id === value
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={option.disabled}
            className={cn(styles.item, active && styles.itemActive)}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
