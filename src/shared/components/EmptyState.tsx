import type { ReactNode } from 'react'
import { cn } from '../utils/cn'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon = 'database', title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-8 sm:py-16 px-4 sm:px-6 text-center bg-white border-2 border-black brutal-shadow -rotate-1 max-w-lg mx-auto w-full', className)}>
      <span className="material-symbols-outlined text-5xl sm:text-6xl text-black mb-3 sm:mb-4">
        {icon}
      </span>
      <h3 className="font-headline text-lg sm:text-xl font-black uppercase tracking-tight text-black mb-2 break-words px-2">{title}</h3>
      {description && (
        <p className="font-mono text-[11px] sm:text-xs uppercase tracking-widest text-black/70 max-w-md mb-4 sm:mb-6 leading-relaxed break-words px-2">{description}</p>
      )}
      {action && <div className="rotate-1 w-full sm:w-auto flex justify-center">{action}</div>}
    </div>
  )
}
