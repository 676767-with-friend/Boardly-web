import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'

function AuthLoading() {
  return <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center text-sm text-[#6E6E73]">Loading your Boardly account...</div>
}

export function roleHome(roles: string[]) {
  if (roles.includes('admin')) return '/admin'
  if (roles.includes('manager')) return '/manager'
  if (roles.includes('staff')) return '/staff'
  return '/account'
}

export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <AuthLoading />
  return status === 'authenticated' ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname }} />
}

export function RequireRole({ roles }: { roles: string[] }) {
  const { status, hasRole } = useAuth()
  if (status === 'loading') return <AuthLoading />
  return hasRole(...roles) ? <Outlet /> : <Navigate to="/" replace />
}

export function CustomerAccountRoute() {
  const { status, user } = useAuth()
  if (status === 'loading') return <AuthLoading />
  if (!user) return <Navigate to="/login" replace state={{ from: '/account' }} />
  return user.roles.includes('admin') || user.roles.includes('manager') || user.roles.includes('staff')
    ? <Navigate to={roleHome(user.roles)} replace />
    : <Outlet />
}
