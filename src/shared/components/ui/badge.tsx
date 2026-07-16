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
        variant === 'default' && 'bg-surface-variant text-primary',
        variant === 'success' && 'bg-green-200 text-green-900',
        variant === 'warning' && 'bg-yellow-200 text-yellow-900',
        variant === 'danger' && 'bg-secondary text-white',
        variant === 'info' && 'bg-tertiary text-white',
        className,
      )}
      {...props}
    />
  )
}
