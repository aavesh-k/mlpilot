import { useMemo } from 'react'
import { cn } from '../utils/cn'
import { Button } from './ui/button'

interface PaginationProps {
  page: number
  perPage: number
  total: number
  onPageChange: (page: number) => void
  className?: string
}

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  if (current <= 4) {
    return [1, 2, 3, 4, 5, '...', total]
  }

  if (current >= total - 3) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  }

  return [1, '...', current - 1, current, current + 1, '...', total]
}

export function Pagination({ page, perPage, total, onPageChange, className }: PaginationProps) {
  const totalPages = Math.ceil(total / perPage)
  const pages = useMemo(() => getPageNumbers(page, totalPages), [page, totalPages])

  if (totalPages <= 1) return null

  return (
    <div className={cn('flex items-center justify-between pt-6', className)}>
      <p className="text-sm text-on-surface-variant">
        Page {page} of {totalPages} ({total} total)
      </p>
      <div className="flex gap-1 items-center">
        <Button
          variant="ghost"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-1 text-on-surface-variant select-none">
              ...
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onPageChange(p)}
              className={p === page ? '' : 'min-w-[36px]'}
            >
              {p}
            </Button>
          )
        )}
        <Button
          variant="ghost"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
