import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Badge } from './badge'

describe('Badge', () => {
  it('should render text', () => {
    render(<Badge>Active</Badge>)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('should apply default variant class', () => {
    render(<Badge>Default</Badge>)
    expect(screen.getByText('Default').className).toContain('bg-surface-variant')
  })

  it('should apply success variant class', () => {
    render(<Badge variant="success">Done</Badge>)
    expect(screen.getByText('Done').className).toContain('bg-green-200')
  })

  it('should apply danger variant', () => {
    render(<Badge variant="danger">Failed</Badge>)
    expect(screen.getByText('Failed').className).toContain('bg-secondary')
  })

  it('should apply warning variant', () => {
    render(<Badge variant="warning">Pending</Badge>)
    expect(screen.getByText('Pending').className).toContain('bg-yellow-200')
  })

  it('should apply info variant', () => {
    render(<Badge variant="info">Info</Badge>)
    expect(screen.getByText('Info').className).toContain('bg-tertiary')
  })
})
