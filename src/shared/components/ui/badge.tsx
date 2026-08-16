import { type HTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'font-headline text-[10px] font-black uppercase px-2 py-1 border-2 border-primary inline-block',
        variant === 'default' && 'bg-surface-variant text-on-surface-variant',
        variant === 'success' && 'bg-success text-on-success',
        variant === 'warning' && 'bg-warning-container text-on-warning-container',
        variant === 'danger' && 'bg-error-container text-on-error-container',
        variant === 'info' && 'bg-info-container text-on-info-container',
        className,
      )}
      {...props}
    />
  )
}
