import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, id, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label
            htmlFor={id}
            className="block font-mono text-xs uppercase tracking-widest font-black text-black mb-2"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'w-full h-12 rounded-none border-2 border-black bg-white px-3 font-mono text-sm tracking-widest placeholder:font-mono placeholder:text-xs placeholder:uppercase placeholder:tracking-widest placeholder:text-black/30 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-black focus-visible:shadow-[4px_4px_0_0_#ffd400] transition-all',
            className,
          )}
          {...props}
        />
      </div>
    )
  },
)

Input.displayName = 'Input'
