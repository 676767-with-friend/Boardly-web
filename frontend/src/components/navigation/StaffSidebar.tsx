import BackOfficeSidebar, { type BackOfficeLink } from './BackOfficeSidebar'

const links: BackOfficeLink[] = [
  { icon: 'dashboard', label: 'Dashboard', path: '/staff' },
  { icon: 'tables', label: 'Live Tables', path: '/staff/tables' },
  { icon: 'checkin', label: 'Check-In', path: '/staff/check-in' },
  { icon: 'orders', label: 'Orders', path: '/staff/orders' },
  { icon: 'products', label: 'Products', path: '/staff/products' },
  { icon: 'users', label: 'Users', path: '/staff/users' },
]

export default function StaffSidebar({ onLogout }: { onLogout: () => void }) {
  return <BackOfficeSidebar title="Staff Dashboard" sections={[{ links }]} onLogout={onLogout} />
}
