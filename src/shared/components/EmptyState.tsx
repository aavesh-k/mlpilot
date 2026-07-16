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
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      <span className="material-symbols-outlined text-7xl text-on-surface-variant opacity-40 mb-4 group-hover:scale-105 transition-transform">
        {icon}
      </span>
      <h3 className="font-headline text-xl font-black uppercase mb-2">{title}</h3>
      {description && (
        <p className="text-on-surface-variant text-sm max-w-md mb-6">{description}</p>
      )}
      {action}
    </div>
  )
}
