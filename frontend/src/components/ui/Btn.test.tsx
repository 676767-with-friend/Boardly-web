// src/components/Btn.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Btn from './Btn'

describe('Btn Component Test Suite', () => {
  it('renders button children and handles click event[cite: 13]', () => {
    const handleClick = vi.fn()
    render(<Btn onClick={handleClick}>Click Me</Btn>)

    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toBeInTheDocument()

    fireEvent.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('renders as disabled when disabled prop is true[cite: 13]', () => {
    render(<Btn disabled>Disabled Btn</Btn>)
    
    const button = screen.getByRole('button', { name: /disabled btn/i })
    expect(button).toBeDisabled()
  })
})