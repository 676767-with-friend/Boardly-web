// src/components/Stars.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Stars from './Stars'

describe('Stars Component Test Suite', () => {
  it('renders rating score and review count correctly[cite: 10]', () => {
    render(<Stars r={4.5} n={120} />)
    
    expect(screen.getByText('4.5 (120)')).toBeInTheDocument()
  })
})