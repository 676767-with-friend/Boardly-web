import { Outlet } from 'react-router-dom'
import StaffSidebar from '@/components/navigation/StaffSidebar'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'

export default function StaffLayout() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  return (
    <div className="flex min-h-screen flex-col bg-white md:flex-row">
      <StaffSidebar onLogout={() => { void logout().then(() => navigate('/')) }} />
      <main className="min-w-0 flex-1 overflow-auto md:ml-56">
        <Outlet />
      </main>
    </div>
  )
}
