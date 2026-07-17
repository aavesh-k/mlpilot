import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Card, CardHeader, CardTitle, CardContent } from './card'

describe('Card', () => {
  it('should render children', () => {
    render(<Card><p>Content</p></Card>)
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('should have neo-shadow class', () => {
    const { container } = render(<Card />)
    expect(container.firstChild).toHaveClass('neo-shadow')
  })
})

describe('CardHeader', () => {
  it('should render children', () => {
    render(<CardHeader><h2>Header</h2></CardHeader>)
    expect(screen.getByText('Header')).toBeInTheDocument()
  })
})

describe('CardTitle', () => {
  it('should render title text', () => {
    render(<CardTitle>My Title</CardTitle>)
    expect(screen.getByText('My Title')).toBeInTheDocument()
  })
})

describe('CardContent', () => {
  it('should render children', () => {
    render(<CardContent><p>Body</p></CardContent>)
    expect(screen.getByText('Body')).toBeInTheDocument()
  })
})
