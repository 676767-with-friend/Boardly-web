// src/auth/CustomerAccess.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LoginPage, RegisterPage } from '@/features/AuthPages'
import CustomerLayout from '@/layouts/CustomerLayout'
import { useAuth } from '@/auth/AuthProvider'
import { useCart } from '@/commerce/CartProvider'

// Mock Hooks
vi.mock('@/auth/AuthProvider', () => ({
  useAuth: vi.fn(),
}))

vi.mock('@/commerce/CartProvider', () => ({
  useCart: vi.fn(),
}))

// Mock RouteGuards
vi.mock('@/auth/RouteGuards', () => ({
  roleHome: (roles: string[]) => {
    if (roles.includes('admin')) return '/admin'
    if (roles.includes('staff')) return '/staff'
    return '/'
  },
}))

describe('Customer Access & Auth Test Suite', () => {
  const mockLogin = vi.fn()
  const mockRegister = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useCart).mockReturnValue({
      cart: { itemCount: 2, items: [], subtotal: 1000 },
      loading: false,
      error: null,
      reload: vi.fn(),
      addItem: vi.fn(),
      updateItem: vi.fn(),
      removeItem: vi.fn(),
      clearCart: vi.fn(),
    })
  })

  // ----------------------------------------------------------------
  // 1. Customer Login & Navigation Tests
  // ----------------------------------------------------------------
  describe('LoginPage for Customer', () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        login: mockLogin,
        register: mockRegister,
        logout: vi.fn(),
        refreshUser: vi.fn(),
        user: null,
        loading: false,
      })
    })

    it('shows error if email or password is empty', async () => {
      render(
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      )

      const submitBtn = screen.getByRole('button', { name: /sign in/i })
      fireEvent.click(submitBtn)

      expect(await screen.findByRole('alert')).toHaveTextContent('Enter your email and password.')
      expect(mockLogin).not.toHaveBeenCalled()
    })

    it('logs in successfully as Customer and navigates to home', async () => {
      mockLogin.mockResolvedValueOnce({
        id: 'c1',
        email: 'customer@test.com',
        roles: ['customer'],
      })

      render(
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<div>Home Page</div>} />
          </Routes>
        </MemoryRouter>
      )

      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'customer@test.com' } })
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123456' } })
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('customer@test.com', 'password123456', false)
      })
      expect(await screen.findByText('Home Page')).toBeInTheDocument()
    })
  })

  // ----------------------------------------------------------------
  // 2. Customer Registration Tests
  // ----------------------------------------------------------------
  describe('RegisterPage Validation', () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        login: mockLogin,
        register: mockRegister,
        logout: vi.fn(),
        refreshUser: vi.fn(),
        user: null,
        loading: false,
      })
    })

    it('validates password length and match', async () => {
      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } })
      fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } })
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@test.com' } })
      
      // Password น้อยกว่า 12 ตัว
      fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'short' } })
      fireEvent.change(screen.getByLabelText(/confirm/i), { target: { value: 'short' } })

      fireEvent.click(screen.getByRole('button', { name: /create account/i }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Password must be at least 12 characters.')
      expect(mockRegister).not.toHaveBeenCalled()
    })

    it('requires consent checkbox before registering', async () => {
      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      )

      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } })
      fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } })
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@test.com' } })
      fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'password123456' } })
      fireEvent.change(screen.getByLabelText(/confirm/i), { target: { value: 'password123456' } })

      // ยังไม่ได้ติ๊กยอมรับเงื่อนไข
      fireEvent.click(screen.getByRole('button', { name: /create account/i }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Please accept the terms and privacy policy.')
      expect(mockRegister).not.toHaveBeenCalled()
    })
  })

  // ----------------------------------------------------------------
  // 3. CustomerLayout Route Guard Access Tests
  // ----------------------------------------------------------------
  describe('CustomerLayout Access Control', () => {
    it('allows normal customer to view account page', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'c1', roles: ['customer'] },
        login: mockLogin,
        register: mockRegister,
        logout: vi.fn(),
        refreshUser: vi.fn(),
        loading: false,
      })

      render(
        <MemoryRouter initialEntries={['/account']}>
          <Routes>
            <Route element={<CustomerLayout />}>
              <Route path="/account" element={<div>Customer Account Page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      )

      expect(screen.getByText('Customer Account Page')).toBeInTheDocument()
    })

    it('redirects admin away to /admin when trying to access /account', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'a1', roles: ['admin'] },
        login: mockLogin,
        register: mockRegister,
        logout: vi.fn(),
        refreshUser: vi.fn(),
        loading: false,
      })

      render(
        <MemoryRouter initialEntries={['/account']}>
          <Routes>
            <Route element={<CustomerLayout />}>
              <Route path="/account" element={<div>Customer Account Page</div>} />
            </Route>
            <Route path="/admin" element={<div>Admin Dashboard</div>} />
          </Routes>
        </MemoryRouter>
      )

      expect(screen.queryByText('Customer Account Page')).not.toBeInTheDocument()
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
    })

    it('redirects staff away to /staff when trying to access /account', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 's1', roles: ['staff'] },
        login: mockLogin,
        register: mockRegister,
        logout: vi.fn(),
        refreshUser: vi.fn(),
        loading: false,
      })

      render(
        <MemoryRouter initialEntries={['/account']}>
          <Routes>
            <Route element={<CustomerLayout />}>
              <Route path="/account" element={<div>Customer Account Page</div>} />
            </Route>
            <Route path="/staff" element={<div>Staff Dashboard</div>} />
          </Routes>
        </MemoryRouter>
      )

      expect(screen.queryByText('Customer Account Page')).not.toBeInTheDocument()
      expect(screen.getByText('Staff Dashboard')).toBeInTheDocument()
    })
  })
})