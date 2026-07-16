import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { EmptyState } from './EmptyState'
import { Button } from './ui/button'

describe('EmptyState', () => {
  it('should render title and description', () => {
    render(<EmptyState title="No datasets" description="Upload a file to get started." />)
    expect(screen.getByText('No datasets')).toBeInTheDocument()
    expect(screen.getByText('Upload a file to get started.')).toBeInTheDocument()
  })

  it('should render action button when provided', () => {
    render(
      <EmptyState
        title="Empty"
        action={<Button>Upload</Button>}
      />,
    )
    expect(screen.getByText('Upload')).toBeInTheDocument()
  })
})
