import type { InputHTMLAttributes } from 'react'
import styles from '../../styles/components.module.css'
import { cn } from '../../utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export function Input({ error, className, ...rest }: InputProps) {
  return (
    <input
      className={cn(styles.input, error && styles.inputError, className)}
      {...rest}
    />
  )
}
