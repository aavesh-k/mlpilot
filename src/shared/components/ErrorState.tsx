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
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      <span className="material-symbols-outlined text-7xl text-secondary opacity-60 mb-4">error</span>
      <h3 className="font-headline text-xl font-black uppercase mb-2">{title}</h3>
      {message && (
        <p className="text-on-surface-variant text-sm max-w-md mb-6">{message}</p>
      )}
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  )
}
