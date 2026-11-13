// src/components/navigation/CustomerNav.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
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

  it('navigates from the brand, top links, account, and cart controls', () => {
    function CurrentPath() {
      return <output data-testid="path">{useLocation().pathname}</output>
    }
    render(
      <MemoryRouter initialEntries={['/shop']}>
        <CustomerNav cartCount={2} userMode="staff" />
        <Routes>
          <Route path="*" element={<CurrentPath />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByText('Visit Store'))
    expect(screen.getByTestId('path')).toHaveTextContent('/stores')
    fireEvent.click(screen.getByText('Boardly'))
    expect(screen.getByTestId('path')).toHaveTextContent('/')
    fireEvent.click(screen.getByText('Reserve a Table'))
    expect(screen.getByTestId('path')).toHaveTextContent('/reserve')

    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons.find(button => button.querySelector('svg path[d^="M16 7"]'))!)
    expect(screen.getByTestId('path')).toHaveTextContent('/account')
    fireEvent.click(screen.getByText('2'))
    expect(screen.getByTestId('path')).toHaveTextContent('/cart')
    fireEvent.click(buttons.find(button => button.querySelector('svg path[d^="M21 21"]'))!)
    expect(screen.getByTestId('path')).toHaveTextContent('/shop')
  })

  it('opens the guest account page and closes the mobile menu after navigation', () => {
    function CurrentPath() {
      return <output data-testid="path">{useLocation().pathname}</output>
    }
    render(
      <MemoryRouter initialEntries={['/']}>
        <CustomerNav cartCount={0} userMode="guest" />
        <Routes>
          <Route path="*" element={<CurrentPath />} />
        </Routes>
      </MemoryRouter>,
    )

    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons.find(button => button.querySelector('svg path[d^="M16 7"]'))!)
    expect(screen.getByTestId('path')).toHaveTextContent('/login')

    fireEvent.click(buttons[buttons.length - 1])
    fireEvent.click(screen.getAllByText('Shop')[1])
    expect(screen.getByTestId('path')).toHaveTextContent('/shop')
    expect(screen.getAllByText('Shop')).toHaveLength(1)
  })
})
