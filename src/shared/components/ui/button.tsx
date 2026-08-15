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
          'font-headline font-bold uppercase transition-all cursor-pointer border-2 border-primary',
          variant === 'primary' && 'bg-primary text-background neo-shadow hover:bg-primary-container hover:text-primary active:translate-x-1 active:translate-y-1 active:shadow-none',
          variant === 'secondary' && 'bg-background text-primary neo-shadow hover:bg-primary-container',
          variant === 'ghost' && 'bg-transparent text-primary hover:bg-primary-container border-transparent',
          variant === 'danger' && 'bg-red-600 text-white border-red-600 neo-shadow hover:bg-red-700 hover:border-red-700',
          size === 'sm' && 'text-xs px-3 py-1',
          size === 'md' && 'text-sm px-6 py-3',
          size === 'lg' && 'text-lg px-8 py-4',
          className,
        )}
        {...props}
      />
    )
  },
)

Button.displayName = 'Button'
