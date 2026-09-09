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
    <div className={cn('flex flex-col items-center justify-center py-16 px-6 text-center bg-red-50 border-2 border-red-500 brutal-shadow max-w-lg mx-auto', className)}>
      <span className="material-symbols-outlined text-6xl text-red-600 mb-4">error</span>
      <h3 className="font-headline text-xl font-black uppercase tracking-tight text-black mb-2">{title}</h3>
      {message && (
        <p className="font-mono text-xs uppercase tracking-widest text-black/70 max-w-md mb-6 leading-relaxed">{message}</p>
      )}
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Retry →
        </Button>
      )}
    </div>
  )
}
