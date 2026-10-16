// src/components/BranchSearchDropdown.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import BranchSearchDropdown from './BranchSearchDropdown'

const mockBranches = [
  { id: 'b1', name: 'Siam Branch', district: 'Pathum Wan', status: 'active', hours: '10:00 - 20:00' },
  { id: 'b2', name: 'Silom Branch', district: 'Bang Rak', status: 'inactive' },
]

describe('BranchSearchDropdown Component Test Suite', () => {
  it('renders placeholder when no branch is selected[cite: 12]', () => {
    render(
      <BranchSearchDropdown 
        value={null} 
        onChange={vi.fn()} 
        placeholder="Select a branch" 
        branches={mockBranches} 
      />
    )

    expect(screen.getByText('Select a branch')).toBeInTheDocument()
  })

  it('opens dropdown and displays branch options on click[cite: 12]', () => {
    render(
      <BranchSearchDropdown 
        value={null} 
        onChange={vi.fn()} 
        branches={mockBranches} 
      />
    )

    const selectButton = screen.getByRole('button')
    fireEvent.click(selectButton)

    expect(screen.getByText('Siam Branch')).toBeInTheDocument()
    expect(screen.getByText('Silom Branch')).toBeInTheDocument()
  })

  it('triggers onChange when a branch option is clicked[cite: 12]', () => {
    const handleChange = vi.fn()
    render(
      <BranchSearchDropdown 
        value={null} 
        onChange={handleChange} 
        branches={mockBranches} 
      />
    )

    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Siam Branch'))

    expect(handleChange).toHaveBeenCalledWith('b1')
  })
})