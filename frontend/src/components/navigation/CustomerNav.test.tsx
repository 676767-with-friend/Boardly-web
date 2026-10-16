// src/components/navigation/CustomerNav.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import CustomerNav from './CustomerNav'

vi.mock('@/components/navigation/NotificationBell', () => ({
  default: () => <div data-testid="notification-bell">NotificationBell</div>,
}))

describe('CustomerNav Component Test Suite', () => {
  it('renders brand name and navigation links correctly[cite: 3]', () => {
    render(
      <MemoryRouter>
        <CustomerNav cartCount={0} userMode="guest" />
      </MemoryRouter>
    )

    expect(screen.getByText('Boardly')).toBeInTheDocument()
    expect(screen.getByText('Shop')).toBeInTheDocument()
    expect(screen.getByText('Reserve a Table')).toBeInTheDocument()
    expect(screen.getByText('Visit Store')).toBeInTheDocument()
  })

  it('displays notification bell and cart badge count when userMode is customer[cite: 3]', () => {
    render(
      <MemoryRouter>
        <CustomerNav cartCount={3} userMode="customer" />
      </MemoryRouter>
    )

    expect(screen.getByTestId('notification-bell')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('toggles mobile menu dropdown on hamburger click[cite: 3]', () => {
    render(
      <MemoryRouter>
        <CustomerNav cartCount={0} userMode="guest" />
      </MemoryRouter>
    )

    const buttons = screen.getAllByRole('button')
    const mobileMenuButton = buttons[buttons.length - 1]
    
    fireEvent.click(mobileMenuButton)
    expect(screen.getAllByText('Shop').length).toBeGreaterThan(1)
  })
})