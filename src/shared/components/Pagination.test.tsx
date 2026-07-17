import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Pagination } from './Pagination'

describe('Pagination', () => {
  it('should render null when total pages is 1 or less', () => {
    const { container } = render(
      <Pagination page={1} perPage={20} total={10} onPageChange={vi.fn()} />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('should render page info and buttons', () => {
    render(<Pagination page={1} perPage={20} total={50} onPageChange={vi.fn()} />)
    expect(screen.getByText(/Page 1 of 3 \(50 total\)/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
  })

  it('should disable previous button on first page', () => {
    render(<Pagination page={1} perPage={20} total={50} onPageChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled()
  })

  it('should disable next button on last page', () => {
    render(<Pagination page={3} perPage={20} total={50} onPageChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /previous/i })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  })

  it('should call onPageChange with next page when next clicked', async () => {
    const onPageChange = vi.fn()
    const user = userEvent.setup()
    render(<Pagination page={1} perPage={20} total={50} onPageChange={onPageChange} />)
    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('should call onPageChange with previous page when previous clicked', async () => {
    const onPageChange = vi.fn()
    const user = userEvent.setup()
    render(<Pagination page={2} perPage={20} total={50} onPageChange={onPageChange} />)
    await user.click(screen.getByRole('button', { name: /previous/i }))
    expect(onPageChange).toHaveBeenCalledWith(1)
  })
})
