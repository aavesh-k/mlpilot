import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Button } from './button'

describe('Button', () => {
  it('should render children text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('should call onClick when clicked', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(<Button onClick={onClick}>Submit</Button>)
    await user.click(screen.getByRole('button', { name: /submit/i }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('should apply variant class', () => {
    const { container } = render(<Button variant="secondary">Cancel</Button>)
    const button = container.querySelector('button')
    expect(button?.className).toContain('neo-shadow')
  })

  it('should support disabled state', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button', { name: /disabled/i })).toBeDisabled()
  })
})
