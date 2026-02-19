import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from '../../styles/components.module.css'
import { cn } from '../../utils'

type Variant = 'primary' | 'ghost' | 'danger'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  Variant
  size?:     Size
  fullWidth?: boolean
  children:  ReactNode
}

const variantMap: Record<Variant, string> = {
  primary: styles.btnPrimary,
  ghost:   styles.btnGhost,
  danger:  styles.btnDanger,
}

const sizeMap: Record<Size, string> = {
  sm: styles.btnSm,
  md: '',
  lg: styles.btnLg,
}

export function Button({
  variant   = 'primary',
  size      = 'md',
  fullWidth = false,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        styles.btn,
        variantMap[variant],
        sizeMap[size],
        fullWidth && styles.btnFull,
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
