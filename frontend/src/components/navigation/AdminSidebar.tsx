import BackOfficeSidebar, { type BackOfficeLink } from './BackOfficeSidebar'

const operations: BackOfficeLink[] = [
  { icon: 'dashboard', label: 'Dashboard', path: '/admin' },
  { icon: 'tables', label: 'Live Tables', path: '/admin/tables' },
  { icon: 'orders', label: 'Orders', path: '/admin/orders' },
  { icon: 'products', label: 'Products', path: '/admin/products' },
]
const management: BackOfficeLink[] = [
  { icon: 'users', label: 'Users', path: '/admin/users' },
  { icon: 'staff', label: 'Staff', path: '/admin/staff' },
  { icon: 'branches', label: 'Branches', path: '/admin/branches' },
  { icon: 'tables', label: 'Physical Tables', path: '/admin/physical-tables' },
]

export default function AdminSidebar({ onLogout }: { onLogout: () => void }) {
  return <BackOfficeSidebar title="Admin Panel" sections={[{ title: 'Operations', links: operations }, { title: 'Management', links: management }]} onLogout={onLogout} />
}
