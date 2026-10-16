// src/features/layouts.test.tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ชี้ไปยังไฟล์ Layouts จริงๆ
import ManagerLayout from '@/layouts/ManagerLayout'
import StaffLayout from '@/layouts/StaffLayout'
import AdminLayout from '@/layouts/AdminLayout'
import AuthLayout from '@/layouts/AuthLayout'
import CustomerLayout from '@/layouts/CustomerLayout'

// Mock AuthProvider และ CartProvider เพื่อควบคุมสถานะจำลองในการเทส
vi.mock('@/auth/AuthProvider', () => ({
  useAuth: vi.fn(),
}))

vi.mock('@/commerce/CartProvider', () => ({
  useCart: vi.fn(),
}))

// Mock Sidebar และ Navigation Components เพื่อลดความซับซ้อนในการเรนเดอร์
vi.mock('@/components/navigation/ManagerSidebar', () => ({
  default: ({ onLogout }: { onLogout: () => void }) => (
    <div data-testid="manager-sidebar">
      Manager Sidebar <button onClick={onLogout}>Logout</button>
    </div>
  ),
}))

vi.mock('@/components/navigation/StaffSidebar', () => ({
  default: ({ onLogout }: { onLogout: () => void }) => (
    <div data-testid="staff-sidebar">
      Staff Sidebar <button onClick={onLogout}>Logout</button>
    </div>
  ),
}))

vi.mock('@/components/navigation/AdminSidebar', () => ({
  default: ({ onLogout }: { onLogout: () => void }) => (
    <div data-testid="admin-sidebar">
      Admin Sidebar <button onClick={onLogout}>Logout</button>
    </div>
  ),
}))

vi.mock('@/components/navigation/CustomerNav', () => ({
  default: () => <div data-testid="customer-nav">Customer Nav</div>,
}))

import { useAuth } from '@/auth/AuthProvider'
import { useCart } from '@/commerce/CartProvider'

describe('Layout Components Test Suite', () => {
  // 1. ทดสอบ ManagerLayout
  it('renders ManagerLayout with sidebar and outlet content', () => {
    vi.mocked(useAuth).mockReturnValue({
      logout: vi.fn().mockResolvedValue(undefined),
      user: { roles: ['manager'] },
    } as any)

    render(
      <MemoryRouter initialEntries={['/manager']}>
        <Routes>
          <Route element={<ManagerLayout />}>
            <Route path="/manager" element={<div>Manager Dashboard Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByTestId('manager-sidebar')).toBeInTheDocument()
    expect(screen.getByText('Manager Dashboard Content')).toBeInTheDocument()
  })

  // 2. ทดสอบ StaffLayout
  it('renders StaffLayout with sidebar and outlet content', () => {
    vi.mocked(useAuth).mockReturnValue({
      logout: vi.fn().mockResolvedValue(undefined),
      user: { roles: ['staff'] },
    } as any)

    render(
      <MemoryRouter initialEntries={['/staff']}>
        <Routes>
          <Route element={<StaffLayout />}>
            <Route path="/staff" element={<div>Staff Dashboard Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByTestId('staff-sidebar')).toBeInTheDocument()
    expect(screen.getByText('Staff Dashboard Content')).toBeInTheDocument()
  })

  // 3. ทดสอบ AdminLayout
  it('renders AdminLayout with sidebar and outlet content', () => {
    vi.mocked(useAuth).mockReturnValue({
      logout: vi.fn().mockResolvedValue(undefined),
      user: { roles: ['admin'] },
    } as any)

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<div>Admin Dashboard Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByTestId('admin-sidebar')).toBeInTheDocument()
    expect(screen.getByText('Admin Dashboard Content')).toBeInTheDocument()
  })

  // 4. ทดสอบ AuthLayout
  it('renders AuthLayout outlet content correctly', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<div>Login Page Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Login Page Content')).toBeInTheDocument()
  })

  // 5. ทดสอบ CustomerLayout และเงื่อนไขการ Redirect ตาม Role
  describe('CustomerLayout & Role Guard Redirection', () => {
    beforeEach(() => {
      vi.mocked(useCart).mockReturnValue({
        cart: { itemCount: 2 },
      } as any)
    })

    it('renders customer nav and outlet for normal customers', () => {
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

    it('redirects admin away from /account to /admin', () => {
      vi.mocked(useAuth).mockReturnValue({ user: { roles: ['admin'] } } as any)

      render(
        <MemoryRouter initialEntries={['/account']}>
          <Routes>
            <Route element={<CustomerLayout />}>
              <Route path="/account" element={<div>Customer Account Page</div>} />
            </Route>
            <Route path="/admin" element={<div>Admin Dashboard Page</div>} />
          </Routes>
        </MemoryRouter>
      )

      expect(screen.queryByText('Customer Account Page')).not.toBeInTheDocument()
      expect(screen.getByText('Admin Dashboard Page')).toBeInTheDocument()
    })

    it('redirects staff away from /account to /staff', () => {
      vi.mocked(useAuth).mockReturnValue({ user: { roles: ['staff'] } } as any)

      render(
        <MemoryRouter initialEntries={['/account']}>
          <Routes>
            <Route element={<CustomerLayout />}>
              <Route path="/account" element={<div>Customer Account Page</div>} />
            </Route>
            <Route path="/staff" element={<div>Staff Dashboard Page</div>} />
          </Routes>
        </MemoryRouter>
      )

      expect(screen.queryByText('Customer Account Page')).not.toBeInTheDocument()
      expect(screen.getByText('Staff Dashboard Page')).toBeInTheDocument()
    })
  })
})