import { cn } from '../utils/cn'

interface LoadingSpinnerProps {
  className?: string
}

export function LoadingSpinner({ className }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 gap-4', className)}>
      <div className="w-9 h-9 bg-black flex items-center justify-center shadow-[3px_3px_0_0_#fff] border-2 border-black">
        <span className="text-[#ffd400] font-black text-xl leading-none">M</span>
      </div>
      <div className="w-48 h-3 bg-white border-2 border-black brutal-shadow overflow-hidden">
        <div className="h-full bg-[#ffd400] w-2/3 animate-pulse" />
      </div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-black/60">loading mlpilot...</p>
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-white border-2 border-black brutal-shadow-sm', className)} />
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className={cn('h-6', c === 0 ? 'w-1/3' : c === cols - 1 ? 'w-1/6' : 'w-1/4')}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-white border-2 border-black p-6 brutal-shadow space-y-4">
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  )
}
