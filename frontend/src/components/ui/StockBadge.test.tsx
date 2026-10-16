// src/components/StockBadge.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import StockBadge from './StockBadge'

describe('StockBadge Component Test Suite', () => {
  it('renders "Out of Stock" when stock is 0[cite: 11]', () => {
    render(<StockBadge s={0} />)
    expect(screen.getByText('Out of Stock')).toBeInTheDocument()
  })

  it('renders low stock warning when stock is between 1 and 3[cite: 11]', () => {
    render(<StockBadge s={2} />)
    expect(screen.getByText('Only 2 left')).toBeInTheDocument()
  })

  it('renders "In Stock" when stock is greater than 3[cite: 11]', () => {
    render(<StockBadge s={10} />)
    expect(screen.getByText('In Stock')).toBeInTheDocument()
  })
})