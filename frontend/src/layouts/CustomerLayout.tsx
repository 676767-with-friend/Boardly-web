import { Navigate, Outlet, useLocation } from 'react-router-dom'
import CustomerNav from '@/components/navigation/CustomerNav'
import { useAuth } from '@/auth/AuthProvider'
import { useCart } from '@/commerce/CartProvider'

export default function CustomerLayout() {
  const { cart } = useCart()
  const cartCount = cart.itemCount
  const { user } = useAuth()
  const location = useLocation()
  const userMode: 'guest' | 'customer' | 'staff' | 'admin' = user?.roles.includes('admin') ? 'admin' : user?.roles.includes('staff') ? 'staff' : user ? 'customer' : 'guest'
  if (location.pathname.startsWith('/account') && userMode === 'admin') return <Navigate to="/admin" replace />
  if (location.pathname.startsWith('/account') && userMode === 'staff') return <Navigate to="/staff" replace />
  return (
    <div className="min-h-screen bg-white">
      <CustomerNav cartCount={cartCount} userMode={userMode} />
      <main className="pt-14">
        <Outlet />
      </main>
    </div>
  )
}
