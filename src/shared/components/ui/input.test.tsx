import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Input } from './input'

describe('Input', () => {
  it('should render input element', () => {
    render(<Input />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('should render label when provided', () => {
    render(<Input label="Email" id="email" />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('should accept and display value', async () => {
    const user = userEvent.setup()
    render(<Input label="Name" id="name" />)
    const input = screen.getByLabelText('Name')
    await user.type(input, 'John')
    expect(input).toHaveValue('John')
  })

  it('should call onChange when value changes', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Input label="Field" id="field" onChange={onChange} />)
    await user.type(screen.getByLabelText('Field'), 'a')
    expect(onChange).toHaveBeenCalled()
  })
})
