import BackOfficeSidebar, { type BackOfficeLink } from './BackOfficeSidebar'

const operations: BackOfficeLink[] = [
  { icon: 'dashboard', label: 'Dashboard', path: '/manager' },
  { icon: 'tables', label: 'Live Tables', path: '/manager/tables' },
  { icon: 'checkin', label: 'Check-In', path: '/manager/check-in' },
  { icon: 'orders', label: 'Orders', path: '/manager/orders' },
  { icon: 'products', label: 'Products', path: '/manager/products' },
  { icon: 'users', label: 'Users', path: '/manager/users' },
]

const management: BackOfficeLink[] = [
  { icon: 'tables', label: 'Physical Tables', path: '/manager/physical-tables' },
]

export default function ManagerSidebar({ onLogout }: { onLogout: () => void }) {
  return (
    <BackOfficeSidebar
      title="Manager Portal"
      sections={[
        { title: 'Operations', links: operations },
        { title: 'Management', links: management },
      ]}
      onLogout={onLogout}
    />
  )
}
