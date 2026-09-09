import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-mono font-black uppercase tracking-widest transition-all cursor-pointer border-2 border-black rounded-none btn-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
          variant === 'primary' && 'bg-black text-white brutal-shadow hover:bg-black/90 active:shadow-none',
          variant === 'secondary' && 'bg-[#ffd400] text-black brutal-shadow hover:bg-[#ffe066] active:shadow-none',
          variant === 'ghost' && 'bg-white text-black brutal-shadow hover:bg-[#ffd400] active:shadow-none',
          variant === 'danger' && 'bg-[#ff0000] text-white border-black brutal-shadow hover:bg-red-700 active:shadow-none',
          size === 'sm' && 'text-xs px-3 py-1.5 h-8',
          size === 'md' && 'text-sm px-6 py-3 h-9',
          size === 'lg' && 'text-base px-8 py-4 h-12',
          className,
        )}
        {...props}
      />
    )
  },
)

Button.displayName = 'Button'
