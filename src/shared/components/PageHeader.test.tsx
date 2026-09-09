import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PageHeader } from './PageHeader'

describe('PageHeader', () => {
  it('should render title', () => {
    render(<PageHeader title="Datasets" />)
    expect(screen.getByText('Datasets')).toBeInTheDocument()
  })

  it('should render subtitle when provided', () => {
    render(<PageHeader title="Training" subtitle="Manage your training runs" />)
    expect(screen.getByText('Manage your training runs')).toBeInTheDocument()
  })

  it('should not render subtitle when not provided', () => {
    render(<PageHeader title="Training" />)
    expect(screen.queryByText('Manage your training runs')).not.toBeInTheDocument()
  })

  it('should render accent word with brutal highlight', () => {
    render(<PageHeader title="Model" accent="Comparison" />)
    expect(screen.getByText('Model')).toBeInTheDocument()
    const accentEl = screen.getByText('Comparison')
    expect(accentEl.className).toContain('bg-[#ffd400]')
    expect(accentEl.className).toContain('border-2')
  })

  it('should render action element when provided', () => {
    render(<PageHeader title="Datasets" action={<button>Upload</button>} />)
    expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument()
  })
})
