import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Button } from './Button'

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: ReactNode
  label: string
}

export function IconButton({ icon, label, ...rest }: IconButtonProps) {
  return (
    <Button variant="icon" aria-label={label} title={label} {...rest}>
      {icon}
    </Button>
  )
}
