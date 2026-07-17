import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { LoadingSpinner, Skeleton, SkeletonTable, SkeletonCard } from './LoadingSpinner'

describe('LoadingSpinner', () => {
  it('should render a spinning element', () => {
    const { container } = render(<LoadingSpinner />)
    const spinner = container.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })
})

describe('Skeleton', () => {
  it('should render with animate-pulse class', () => {
    const { container } = render(<Skeleton className="w-10 h-10" />)
    const el = container.querySelector('.animate-pulse')
    expect(el).toBeInTheDocument()
  })
})

describe('SkeletonTable', () => {
  it('should render correct number of rows', () => {
    const { container } = render(<SkeletonTable rows={3} cols={4} />)
    const rows = container.querySelectorAll('.flex.gap-4')
    expect(rows).toHaveLength(3)
  })

  it('should render correct number of columns per row', () => {
    const { container } = render(<SkeletonTable rows={1} cols={5} />)
    const row = container.querySelector('.flex.gap-4')
    expect(row?.children).toHaveLength(5)
  })

  it('should use default rows and cols when not specified', () => {
    const { container } = render(<SkeletonTable />)
    const rows = container.querySelectorAll('.flex.gap-4')
    expect(rows).toHaveLength(5)
    const firstRow = rows[0]
    expect(firstRow?.children).toHaveLength(4)
  })
})

describe('SkeletonCard', () => {
  it('should render skeleton with neo-shadow class', () => {
    const { container } = render(<SkeletonCard />)
    const card = container.querySelector('.neo-shadow')
    expect(card).toBeInTheDocument()
    const skeletons = card?.querySelectorAll('.animate-pulse')
    expect(skeletons?.length).toBe(3)
  })
})
