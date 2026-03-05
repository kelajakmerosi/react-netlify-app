import { forwardRef, type InputHTMLAttributes, useId } from 'react'
import styles from './Input.module.css'
import { cn } from '../../utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hideLabel?: boolean
  helperText?: string
  errorMessage?: string
  error?: boolean
  fieldClassName?: string
  labelClassName?: string
  helperClassName?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    hideLabel = false,
    helperText,
    errorMessage,
    error,
    className,
    fieldClassName,
    labelClassName,
    helperClassName,
    id,
    ...rest
  },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? `input-${generatedId}`
  const helperId = helperText ? `${inputId}-helper` : undefined
  const errorId = errorMessage ? `${inputId}-error` : undefined
  const describedBy = [rest['aria-describedby'], errorId, helperId].filter(Boolean).join(' ') || undefined
  const isInvalid = error || Boolean(errorMessage) || rest['aria-invalid'] === true

  const control = (
    <input
      ref={ref}
      id={inputId}
      className={cn(styles.input, (error || errorMessage) && styles.inputError, className)}
      aria-describedby={describedBy}
      aria-invalid={isInvalid || undefined}
      {...rest}
    />
  )

  if (!label) return control

  return (
    <div className={cn(styles.field, fieldClassName)}>
      <label htmlFor={inputId} className={cn(styles.label, hideLabel && styles.labelHidden, labelClassName)}>
        {label}
      </label>
      {control}
      {errorMessage ? (
        <p id={errorId} className={cn(styles.message, styles.errorText, helperClassName)}>
          {errorMessage}
        </p>
      ) : helperText ? (
        <p id={helperId} className={cn(styles.message, helperClassName)}>
          {helperText}
        </p>
      ) : null}
    </div>
  )
})
