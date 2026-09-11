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
          'inline-flex items-center justify-center font-mono font-black uppercase tracking-widest transition-all cursor-pointer border-2 border-black rounded-none btn-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap',
          variant === 'primary' && 'bg-black text-white brutal-shadow hover:bg-black/90 active:shadow-none',
          variant === 'secondary' && 'bg-[#ffd400] text-black brutal-shadow hover:bg-[#ffe066] active:shadow-none',
          variant === 'ghost' && 'bg-white text-black brutal-shadow hover:bg-[#ffd400] active:shadow-none',
          variant === 'danger' && 'bg-[#ff0000] text-white border-black brutal-shadow hover:bg-red-700 active:shadow-none',
          size === 'sm' && 'text-xs px-3 py-2 min-h-[36px] sm:min-h-[32px] h-auto',
          size === 'md' && 'text-xs sm:text-sm px-4 sm:px-6 py-2.5 sm:py-3 min-h-[44px] h-auto',
          size === 'lg' && 'text-sm sm:text-base px-6 sm:px-8 py-3 sm:py-4 min-h-[48px] h-auto w-full sm:w-auto justify-center',
          className,
        )}
        {...props}
      />
    )
  },
)

Button.displayName = 'Button'
