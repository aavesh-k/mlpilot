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
    <div className={cn('flex flex-col items-center justify-center py-16 px-6 text-center bg-white border-2 border-black brutal-shadow -rotate-1 max-w-lg mx-auto', className)}>
      <span className="material-symbols-outlined text-6xl text-black mb-4">
        {icon}
      </span>
      <h3 className="font-headline text-xl font-black uppercase tracking-tight text-black mb-2">{title}</h3>
      {description && (
        <p className="font-mono text-xs uppercase tracking-widest text-black/70 max-w-md mb-6 leading-relaxed">{description}</p>
      )}
      {action && <div className="rotate-1">{action}</div>}
    </div>
  )
}
