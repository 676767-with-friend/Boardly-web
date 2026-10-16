// src/layouts/CustomerLayout.test.tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CustomerLayout from '../layouts/CustomerLayout'
import { useAuth } from '@/auth/AuthProvider'
import { useCart } from '@/commerce/CartProvider'

vi.mock('@/auth/AuthProvider', () => ({ useAuth: vi.fn() }))
vi.mock('@/commerce/CartProvider', () => ({ useCart: vi.fn() }))
vi.mock('@/components/navigation/CustomerNav', () => ({
  default: () => <div data-testid="customer-nav">Customer Nav</div>,
}))

describe('CustomerLayout Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useCart).mockReturnValue({ cart: { itemCount: 2 } } as any)
  })

  it('renders customer nav and outlet for standard customers[cite: 1]', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { roles: ['customer'] } } as any)

    render(
      <MemoryRouter initialEntries={['/shop']}>
        <Routes>
          <Route element={<CustomerLayout />}>
            <Route path="/shop" element={<div>Shop Page Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByTestId('customer-nav')).toBeInTheDocument()
    expect(screen.getByText('Shop Page Content')).toBeInTheDocument()
  })

  it('redirects admin away from /account to /admin[cite: 1]', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { roles: ['admin'] } } as any)

    render(
      <MemoryRouter initialEntries={['/account']}>
        <Routes>
          <Route element={<CustomerLayout />}>
            <Route path="/account" element={<div>Account Content</div>} />
          </Route>
          <Route path="/admin" element={<div>Admin Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.queryByText('Account Content')).not.toBeInTheDocument()
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
  })

  it('redirects staff away from /account to /staff[cite: 1]', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { roles: ['staff'] } } as any)

    render(
      <MemoryRouter initialEntries={['/account']}>
        <Routes>
          <Route element={<CustomerLayout />}>
            <Route path="/account" element={<div>Account Content</div>} />
          </Route>
          <Route path="/staff" element={<div>Staff Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.queryByText('Account Content')).not.toBeInTheDocument()
    expect(screen.getByText('Staff Dashboard')).toBeInTheDocument()
  })
})