import { type HTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'font-mono text-[10px] font-black uppercase tracking-widest px-2 py-1 border-2 border-black inline-flex items-center rounded-none',
        variant === 'default' && 'bg-white text-black',
        variant === 'success' && 'bg-[#c8ff00] text-black',
        variant === 'warning' && 'bg-[#ffd400] text-black',
        variant === 'danger' && 'bg-[#ff0000] text-white',
        variant === 'info' && 'bg-[#e0f7ff] text-black',
        className,
      )}
      {...props}
    />
  )
}
