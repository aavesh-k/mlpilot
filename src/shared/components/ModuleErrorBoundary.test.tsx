import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import type { ReactNode } from 'react'
import { ModuleErrorBoundary } from './ModuleErrorBoundary'

vi.spyOn(console, 'error').mockImplementation(() => {})

function ThrowError({ message }: { message: string }): ReactNode {
  throw new Error(message)
}

describe('ModuleErrorBoundary', () => {
  it('should render children when no error', () => {
    render(
      <ModuleErrorBoundary>
        <p>Safe content</p>
      </ModuleErrorBoundary>,
    )
    expect(screen.getByText('Safe content')).toBeInTheDocument()
  })

  it('should catch error and show error state', () => {
    render(
      <ModuleErrorBoundary>
        <ThrowError message="Oops!" />
      </ModuleErrorBoundary>,
    )
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Oops!')).toBeInTheDocument()
  })

  it('should reset state on retry and re-catch if error persists', async () => {
    const user = userEvent.setup()
    render(
      <ModuleErrorBoundary>
        <ThrowError message="Fail" />
      </ModuleErrorBoundary>,
    )
    expect(screen.getByText('Fail')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /retry/i }))
    expect(screen.getByText('Fail')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })
})
