import { forwardRef, type TextareaHTMLAttributes, useId } from 'react'
import styles from './Input.module.css'
import { cn } from '../../utils'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hideLabel?: boolean
  helperText?: string
  errorMessage?: string
  error?: boolean
  fieldClassName?: string
  labelClassName?: string
  helperClassName?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
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
  const textareaId = id ?? `textarea-${generatedId}`
  const helperId = helperText ? `${textareaId}-helper` : undefined
  const errorId = errorMessage ? `${textareaId}-error` : undefined
  const describedBy = [rest['aria-describedby'], errorId, helperId].filter(Boolean).join(' ') || undefined
  const isInvalid = error || Boolean(errorMessage) || rest['aria-invalid'] === true

  const control = (
    <textarea
      ref={ref}
      id={textareaId}
      className={cn(styles.textarea, (error || errorMessage) && styles.inputError, className)}
      aria-describedby={describedBy}
      aria-invalid={isInvalid || undefined}
      {...rest}
    />
  )

  if (!label) return control

  return (
    <div className={cn(styles.field, fieldClassName)}>
      <label htmlFor={textareaId} className={cn(styles.label, hideLabel && styles.labelHidden, labelClassName)}>
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
