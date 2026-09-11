import { cn } from '../utils/cn'
import { Button } from './ui/button'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-8 sm:py-16 px-4 sm:px-6 text-center bg-red-50 border-2 border-red-500 brutal-shadow max-w-lg mx-auto w-full', className)}>
      <span className="material-symbols-outlined text-5xl sm:text-6xl text-red-600 mb-3 sm:mb-4">error</span>
      <h3 className="font-headline text-lg sm:text-xl font-black uppercase tracking-tight text-black mb-2 break-words px-2">{title}</h3>
      {message && (
        <p className="font-mono text-[11px] sm:text-xs uppercase tracking-widest text-black/70 max-w-md mb-4 sm:mb-6 leading-relaxed break-words px-2">{message}</p>
      )}
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} className="w-full sm:w-auto">
          Retry →
        </Button>
      )}
    </div>
  )
}
