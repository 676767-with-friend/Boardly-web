import { Outlet, useNavigate } from 'react-router-dom'
import ManagerSidebar from '@/components/navigation/ManagerSidebar'
import { useAuth } from '@/auth/AuthProvider'

export default function ManagerLayout() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  return (
    <div className="flex min-h-screen flex-col bg-white md:flex-row">
      <ManagerSidebar onLogout={() => { void logout().then(() => navigate('/')) }} />
      <main className="min-w-0 flex-1 overflow-auto md:ml-56">
        <Outlet />
      </main>
    </div>
  )
}
