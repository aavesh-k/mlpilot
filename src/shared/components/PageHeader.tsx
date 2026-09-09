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
    <section className={cn('mb-10 flex flex-col gap-4 md:flex-row md:items-start md:justify-between', className)}>
      <div>
        <div className="inline-flex items-center gap-2 bg-white border-2 border-black brutal-shadow-sm px-3 py-1 -rotate-1 mb-3">
          <span className="font-mono text-[10px] uppercase tracking-widest font-black text-black">// PIPELINE</span>
        </div>
        <h1 className="font-headline text-4xl sm:text-5xl font-black uppercase leading-none tracking-tight text-black">
          {accent ? (
            <>
              {title} <span className="bg-[#ffd400] border-2 border-black px-2 brutal-shadow-sm inline-block -rotate-1">{accent}</span>
            </>
          ) : (
            title
          )}
        </h1>
        {subtitle && (
          <p className="font-mono text-xs uppercase tracking-widest text-black/70 mt-3 max-w-2xl leading-relaxed">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </section>
  )
}
