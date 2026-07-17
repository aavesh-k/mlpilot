import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ErrorState } from './ErrorState'

describe('ErrorState', () => {
  it('should render default title when none provided', () => {
    render(<ErrorState />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('should render custom title and message', () => {
    render(<ErrorState title="Upload failed" message="File size exceeds limit." />)
    expect(screen.getByText('Upload failed')).toBeInTheDocument()
    expect(screen.getByText('File size exceeds limit.')).toBeInTheDocument()
  })

  it('should render retry button and call onRetry when clicked', async () => {
    const onRetry = vi.fn()
    const user = userEvent.setup()
    render(<ErrorState title="Error" onRetry={onRetry} />)
    const button = screen.getByRole('button', { name: /retry/i })
    expect(button).toBeInTheDocument()
    await user.click(button)
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('should not render message or button when not provided', () => {
    render(<ErrorState title="Error" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByText('Retry')).not.toBeInTheDocument()
  })
})
