import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { CustomerAccountRoute, RequireAuth, RequireRole, roleHome } from './RouteGuards'
import { useAuth } from './AuthProvider'

vi.mock('./AuthProvider', () => ({ useAuth: vi.fn() }))
function Location() { const location = useLocation(); return <p data-testid="location">{location.pathname}</p> }
function renderGuard(path: string, auth: { status: string; user: unknown; hasRole: (...roles: string[]) => boolean }, guard: React.ReactNode) {
  vi.mocked(useAuth).mockReturnValue(auth as never)
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/login" element={<h1>Login page</h1>} /><Route path="/" element={<h1>Home page</h1>} /><Route element={guard}><Route path="/protected" element={<h1>Protected page</h1>} /></Route><Route element={<CustomerAccountRoute />}><Route path="/account" element={<h1>Customer account</h1>} /></Route><Route element={<RequireRole roles={['admin']} />}><Route path="/admin" element={<h1>Admin page</h1>} /></Route><Route element={<RequireRole roles={['manager','admin']} />}><Route path="/manager" element={<h1>Manager page</h1>} /></Route><Route element={<RequireRole roles={['staff','manager','admin']} />}><Route path="/staff" element={<h1>Staff page</h1>} /></Route></Routes><Location /></MemoryRouter>)
}
const customer = { id: 'c-1', roles: ['customer'] }
const staff = { id: 's-1', roles: ['staff'] }
const manager = { id: 'm-1', roles: ['manager'] }
const admin = { id: 'a-1', roles: ['admin'] }
const auth = (user: unknown, status = 'authenticated', roles: string[] = []) => ({ status, user, hasRole: (...wanted: string[]) => wanted.some(role => roles.includes(role)) })

describe('Route guards and role redirects', () => {
  beforeEach(() => vi.clearAllMocks())
  it('sends unauthenticated users to login when a protected route is visited', () => {
    renderGuard('/protected', auth(null, 'anonymous'), <RequireAuth />)
    expect(screen.getByRole('heading', { name: 'Login page' })).toBeInTheDocument()
  })
  it('allows authenticated users through RequireAuth', () => {
    renderGuard('/protected', auth(customer), <RequireAuth />)
    expect(screen.getByRole('heading', { name: 'Protected page' })).toBeInTheDocument()
  })
  it('redirects a customer away from /admin', () => {
    renderGuard('/admin', auth(customer, 'authenticated', customer.roles), <RequireRole roles={['admin']} />)
    expect(screen.getByRole('heading', { name: 'Home page' })).toBeInTheDocument()
  })
  it('does not allow staff into manager or admin pages', () => {
    renderGuard('/manager', auth(staff, 'authenticated', staff.roles), <RequireRole roles={['manager','admin']} />)
    expect(screen.getByRole('heading', { name: 'Home page' })).toBeInTheDocument()
  })
  it('allows staff to access staff pages', () => {
    renderGuard('/staff', auth(staff, 'authenticated', staff.roles), <RequireRole roles={['staff','manager','admin']} />)
    expect(screen.getByRole('heading', { name: 'Staff page' })).toBeInTheDocument()
  })
  it('redirects users from /account to the home page matching their role', () => {
    renderGuard('/account', auth(staff, 'authenticated', staff.roles), <RequireAuth />)
    expect(screen.getByTestId('location')).toHaveTextContent('/staff')
  })
  it.each([[admin, '/admin'], [manager, '/manager'], [staff, '/staff'], [customer, '/account']])('maps role to the correct home route', (user, path) => {
    expect(roleHome(user.roles)).toBe(path)
  })
  it('redirects an unauthenticated account visit to login', () => {
    renderGuard('/account', auth(null, 'anonymous'), <RequireAuth />)
    expect(screen.getByRole('heading', { name: 'Login page' })).toBeInTheDocument()
  })
})
