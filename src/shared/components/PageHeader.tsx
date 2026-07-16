import type { ReactNode } from 'react'
import { cn } from '../utils/cn'

interface PageHeaderProps {
  title: string
  subtitle?: string
  accent?: string
  action?: ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, accent, action, className }: PageHeaderProps) {
  return (
    <section className={cn('mb-12 flex items-start justify-between', className)}>
      <div>
        <h1 className="font-headline text-5xl md:text-7xl font-black uppercase leading-none mb-4 tracking-tighter">
          {accent ? (
            <>
              {title} <span className="text-secondary">{accent}</span>
            </>
          ) : (
            title
          )}
        </h1>
        {subtitle && (
          <p className="text-xl text-on-surface-variant font-medium">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0 ml-4">{action}</div>}
    </section>
  )
}
