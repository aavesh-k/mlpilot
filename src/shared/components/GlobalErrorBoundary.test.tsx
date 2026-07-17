import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import type { ReactNode } from 'react'
import { GlobalErrorBoundary } from './GlobalErrorBoundary'

vi.spyOn(console, 'error').mockImplementation(() => {})

function ThrowError(): ReactNode {
  throw new Error('Fatal crash')
}

describe('GlobalErrorBoundary', () => {
  it('should render children when no error', () => {
    render(
      <GlobalErrorBoundary>
        <p>App content</p>
      </GlobalErrorBoundary>,
    )
    expect(screen.getByText('App content')).toBeInTheDocument()
  })

  it('should catch error and show critical error page', () => {
    render(
      <GlobalErrorBoundary>
        <ThrowError />
      </GlobalErrorBoundary>,
    )
    expect(screen.getByText('Critical Error')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong. Please reload the page to continue.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument()
  })

  it('should show error details expandable section', () => {
    render(
      <GlobalErrorBoundary>
        <ThrowError />
      </GlobalErrorBoundary>,
    )
    expect(screen.getByText('Error Details')).toBeInTheDocument()
    expect(screen.getByText('Fatal crash')).toBeInTheDocument()
  })
})
