import { useEffect, useMemo, useState } from 'react'
import { Btn } from '@/components/ui'
import { productsApi } from '@/services/productsApi'
import {
  adminApi,
  type BranchManagement,
  type Dashboard,
  type InventoryItem,
  type OrderSummary,
  type ProductManagement,
  type StaffMember,
  type UserSummary,
} from '@/services/managementApi'
import { InventoryTable, OrdersTable, ProductIdentity, StatusBadge, UsersTable, type ProductMediaMap } from '@/features/StaffPages'
import type { ProductCategory } from '@/types'

const errorText = (error: unknown) => typeof error === 'object' && error && 'message' in error ? String(error.message) : 'Unable to complete that request.'
const input = 'w-full border border-[#D2D2D7] rounded-xl bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0071E3]'
const money = (value: number) => new Intl.NumberFormat('en-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(value)
const shortDate = (value: string | null) => value ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' }).format(new Date(value)) : '-'

export function AdminDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { adminApi.dashboard().then(setData).catch(error => setError(errorText(error))) }, [])
  if (error) return <Notice text={error} error />
  if (!data) return <Loading />
  const network = [
    { label: 'Total Branches', value: data.activeBranches, sub: 'active locations', color: 'text-violet-600' },
    { label: 'Total Staff', value: data.activeStaff, sub: 'active accounts', color: 'text-blue-600' },
    { label: 'Today Reservations', value: data.reservationsToday, sub: 'all branches', color: 'text-indigo-600' },
    { label: 'Total Sales Today', value: money(data.salesToday), sub: 'all branches', color: 'text-emerald-600' },
  ]
  const operations = [
    { label: 'Available Tables', value: data.availableTables, sub: `of ${data.totalTables} total`, color: 'text-green-600' },
    { label: 'Unavailable Tables', value: data.unavailableTables, sub: 'operational status', color: 'text-gray-600' },
    { label: 'Active Sessions', value: data.activeSessions, sub: 'playing now', color: 'text-red-600' },
    { label: 'Orders', value: data.orders, sub: 'database orders', color: 'text-amber-600' },
  ]
  return (
    <div className="p-4 sm:p-6">
      <div className="mb-8"><h1 className="text-2xl font-bold text-[#1D1D1F]">Admin Dashboard</h1><p className="mt-0.5 text-sm text-[#6E6E73]">{new Intl.DateTimeFormat('en-GB', { dateStyle: 'full' }).format(new Date())}</p></div>
      <DashboardSection title="Network Overview" cards={network} />
      <DashboardSection title="Live Operations" cards={operations} />
    </div>
  )
}

function DashboardSection({ title, cards }: { title: string; cards: Array<{ label: string; value: string | number; sub: string; color: string }> }) {
  return <section className="mb-8"><h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#6E6E73]">{title}</h2><div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">{cards.map(card => <article key={card.label} className="rounded-2xl border border-[#D2D2D7] bg-white p-4 sm:p-5"><div className={`mb-1 text-2xl font-bold ${card.color}`}>{card.value}</div><div className="text-sm font-medium text-[#1D1D1F]">{card.label}</div><div className="mt-0.5 text-xs text-[#6E6E73]">{card.sub}</div></article>)}</div></section>
}

export function AdminOrdersPage() {
  const [items, setItems] = useState<OrderSummary[]>([])
  const [tab, setTab] = useState('All')
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { adminApi.orders().then(setItems).catch(error => setError(errorText(error))) }, [])
  const tabs = useMemo(() => ['All', ...Array.from(new Set(items.map(item => item.status)))], [items])
  const filtered = tab === 'All' ? items : items.filter(item => item.status === tab)
  return <div className="p-4 sm:p-6"><h1 className="mb-6 text-2xl font-bold text-[#1D1D1F]">Order Management</h1><div className="mb-6 flex flex-wrap gap-2">{tabs.map(value => <button key={value} type="button" onClick={() => setTab(value)} className={`rounded-xl px-4 py-2 text-sm font-medium capitalize ${tab === value ? 'bg-[#1D1D1F] text-white' : 'bg-[#F5F5F7] text-[#6E6E73] hover:bg-gray-200'}`}>{value.replace(/_/g, ' ')}</button>)}</div>{error ? <Notice text={error} error /> : <OrdersTable items={filtered} empty="No orders match this status." />}</div>
}

export function UserManagementPage() {
  const [items, setItems] = useState<UserSummary[]>([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const load = () => adminApi.users(search).then(setItems).catch(error => setError(errorText(error)))
  useEffect(() => { void load() }, [])
  const changeStatus = async (item: UserSummary) => {
    setSaving(item.id)
    setError(null)
    try {
      const updated = await adminApi.updateUserStatus(item.id, item.status === 'active' ? 'inactive' : 'active')
      setItems(current => current.map(user => user.id === updated.id ? updated : user))
    } catch (error) {
      setError(errorText(error))
    } finally {
      setSaving(null)
    }
  }
  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between"><h1 className="text-2xl font-bold text-[#1D1D1F]">Users</h1><span className="text-sm text-[#6E6E73]">{items.length} accounts</span></div>
      {error && <Notice text={error} error />}
      <SearchField value={search} onChange={setSearch} onSearch={load} placeholder="Search name, email, phone..." />
      <UsersTable items={items} actions={item => <Btn variant={item.status === 'active' ? 'ghost' : 'secondary'} disabled={saving === item.id} onClick={() => void changeStatus(item)} className={`whitespace-nowrap px-3 py-1.5 text-xs ${item.status === 'active' ? 'text-red-500 hover:bg-red-50' : ''}`}>{saving === item.id ? 'Saving...' : item.status === 'active' ? 'Deactivate' : 'Activate'}</Btn>} />
    </div>
  )
}

export function StaffManagementPage() {
  const [items, setItems] = useState<StaffMember[]>([])
  const [branches, setBranches] = useState<BranchManagement[]>([])
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<StaffMember | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const load = () => Promise.all([adminApi.staff(), adminApi.branches()]).then(([staff, branchList]) => { setItems(staff); setBranches(branchList) }).catch(error => setError(errorText(error)))
  useEffect(() => { void load() }, [])
  const filtered = items.filter(item => !search || item.name.toLowerCase().includes(search.toLowerCase()) || item.email.toLowerCase().includes(search.toLowerCase()))
  return (
    <div className="p-4 sm:p-6">
      <PageHeader title="Staff Management" action="Add Staff" onAction={() => setEditing(null)} />
      {error && <Notice text={error} error />}
      <SearchField value={search} onChange={setSearch} placeholder="Search staff name or email..." />
      <TableFrame><table className="w-full min-w-[850px] text-sm"><thead className="border-b border-[#D2D2D7] bg-[#F5F5F7]"><tr>{['Staff Member', 'Role', 'Email', 'Phone', 'Assigned Branches', 'Status', 'Last Login', 'Actions'].map(label => <TableHead key={label}>{label}</TableHead>)}</tr></thead><tbody>{filtered.length === 0 ? <EmptyRow columns={8}>No matching staff accounts.</EmptyRow> : filtered.map(item => <tr key={item.id} className="border-b border-[#D2D2D7] last:border-0 hover:bg-[#F5F5F7]"><td className="px-4 py-3"><div className="flex items-center gap-2.5"><Avatar name={item.name} tone="violet" /><span className="whitespace-nowrap font-medium text-[#1D1D1F]">{item.name}</span></div></td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.roles?.includes('manager') ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{item.roles?.includes('manager') ? 'Manager' : 'Staff'}</span></td><td className="px-4 py-3 text-[#6E6E73]">{item.email}</td><td className="whitespace-nowrap px-4 py-3 text-[#6E6E73]">{item.phone || '-'}</td><td className="px-4 py-3"><div className="flex flex-wrap gap-1">{item.branchNames.map(branch => <span key={branch} className="rounded-full border border-[#D2D2D7] bg-[#F5F5F7] px-2.5 py-1 text-xs font-medium">{branch}</span>)}</div></td><td className="px-4 py-3"><StatusBadge status={item.status} /></td><td className="whitespace-nowrap px-4 py-3 text-[#6E6E73]">{shortDate(item.lastLoginAt)}</td><td className="px-4 py-3"><Btn variant="secondary" onClick={() => setEditing(item)} className="px-3 py-1.5 text-xs">Edit</Btn></td></tr>)}</tbody></table></TableFrame>
      {editing !== undefined && <StaffEditor item={editing} branches={branches} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); void load() }} onError={setError} />}
    </div>
  )
}

export function BranchManagementPage() {
  const [items, setItems] = useState<BranchManagement[]>([])
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<BranchManagement | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const load = () => adminApi.branches().then(setItems).catch(error => setError(errorText(error)))
  useEffect(() => { void load() }, [])
  const filtered = items.filter(item => !search || item.name.toLowerCase().includes(search.toLowerCase()) || item.district.toLowerCase().includes(search.toLowerCase()))
  return (
    <div className="p-4 sm:p-6">
      <PageHeader title="Branches" action="Add Branch" onAction={() => setEditing(null)} />
      {error && <Notice text={error} error />}
      <SearchField value={search} onChange={setSearch} placeholder="Search branches..." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filtered.map(item => <article key={item.id} className={`rounded-2xl border border-[#D2D2D7] bg-white p-5 ${item.status !== 'active' ? 'opacity-70' : ''}`}><div className="mb-3 flex items-start justify-between gap-3"><div><div className="mb-0.5 flex items-center gap-2"><h2 className="font-bold text-[#1D1D1F]">{item.name}</h2><StatusBadge status={item.status} /></div><div className="font-mono text-xs text-[#6E6E73]">{item.code}</div></div><Btn variant="secondary" onClick={() => setEditing(item)} className="px-3 py-1.5 text-xs">Edit</Btn></div><div className="space-y-1 text-sm text-[#6E6E73]"><div>{item.address}, {item.district}</div><div>{item.phone || 'No phone listed'}</div><div>{item.allowReservations ? 'Reservations enabled' : 'Reservations disabled'}</div></div><div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#D2D2D7] pt-3"><Stat label="Tables" value={item.tableCount} /><Stat label="Staff" value={item.staffCount} /><Stat label="Today" value={item.reservationsToday} /></div></article>)}
      </div>
      {editing !== undefined && <BranchEditor item={editing} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); void load() }} onError={setError} />}
    </div>
  )
}

export function AdminProductsPage() {
  const [items, setItems] = useState<ProductManagement[]>([])
  const [media, setMedia] = useState<ProductMediaMap>({})
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [branches, setBranches] = useState<BranchManagement[]>([])
  const [branchId, setBranchId] = useState('')
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [editing, setEditing] = useState<ProductManagement | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const load = () => Promise.all([adminApi.products(), productsApi.categories(), adminApi.branches(), productsApi.list({ size: 100 })]).then(([products, cats, branchList, publicProducts]) => {
    setItems(products)
    setCategories(cats)
    setBranches(branchList)
    setBranchId(current => current || branchList[0]?.id || '')
    setMedia(Object.fromEntries(publicProducts.content.map(product => [product.id, { image: product.image, category: product.category, price: product.price, salePrice: product.salePrice }])))
  }).catch(error => setError(errorText(error)))
  useEffect(() => { void load() }, [])
  useEffect(() => { if (branchId) adminApi.inventory(branchId).then(setInventory).catch(error => setError(errorText(error))) }, [branchId])
  const summary = { active: items.filter(item => item.active).length, low: items.filter(item => item.stock > 0 && item.stock <= 3).length, out: items.filter(item => item.stock === 0).length }
  return (
    <div className="p-4 sm:p-6">
      <PageHeader title="Products & Inventory" action="Add Product" onAction={() => setEditing(null)} />
      {error && <Notice text={error} error />}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4"><SummaryCard label="Total Products" value={items.length} /><SummaryCard label="Active" value={summary.active} color="text-green-600" /><SummaryCard label="Low Stock" value={summary.low} color="text-orange-600" /><SummaryCard label="Out of Stock" value={summary.out} color="text-red-600" /></div>
      <TableFrame><table className="w-full min-w-[780px] text-sm"><thead className="border-b border-[#D2D2D7] bg-[#F5F5F7]"><tr>{['Product', 'Category', 'Price', 'Stock', 'Status', 'Actions'].map(label => <TableHead key={label}>{label}</TableHead>)}</tr></thead><tbody>{items.map(item => <tr key={item.id} className="border-b border-[#D2D2D7] last:border-0 hover:bg-[#F5F5F7]"><td className="px-4 py-3"><ProductIdentity name={item.name} image={media[item.id]?.image} /></td><td className="px-4 py-3 text-[#6E6E73]">{item.categoryName}</td><td className="px-4 py-3 font-semibold">{money(item.salePrice ?? item.basePrice)}</td><td className={`px-4 py-3 font-medium ${item.stock === 0 ? 'text-red-600' : item.stock <= 3 ? 'text-orange-600' : ''}`}>{item.stock}</td><td className="px-4 py-3"><StatusBadge status={item.active ? 'active' : 'inactive'} /></td><td className="px-4 py-3"><Btn variant="secondary" onClick={() => setEditing(item)} className="px-3 py-1.5 text-xs">Edit</Btn></td></tr>)}</tbody></table></TableFrame>
      <section className="mt-8"><div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-lg font-bold text-[#1D1D1F]">Branch Inventory</h2><p className="mt-1 text-sm text-[#6E6E73]">Stock records and movements for the selected branch.</p></div><select value={branchId} onChange={event => setBranchId(event.target.value)} className={`${input} sm:max-w-xs`}>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></div><InventoryManager items={inventory} products={items} media={media} branchId={branchId} onSaved={() => { if (branchId) adminApi.inventory(branchId).then(setInventory) }} onError={setError} /></section>
      {editing !== undefined && <ProductEditor item={editing} categories={categories} image={editing ? media[editing.id]?.image : null} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); void load() }} onError={setError} />}
    </div>
  )
}

function StaffEditor({ item, branches, onClose, onSaved, onError }: { item: StaffMember | null; branches: BranchManagement[]; onClose: () => void; onSaved: () => void; onError: (error: string) => void }) {
  const [form, setForm] = useState({ firstName: item?.name.split(' ')[0] ?? '', lastName: item?.name.split(' ').slice(1).join(' ') ?? '', displayName: item?.name ?? '', email: item?.email ?? '', phone: item?.phone ?? '', password: '', role: item?.roles?.includes('manager') ? 'manager' : 'staff', status: item?.status ?? 'active', branchIds: item?.branchIds ?? [], primaryBranchId: item?.branchIds[0] ?? '' })
  const [saving, setSaving] = useState(false)
  const toggle = (id: string) => setForm(current => ({ ...current, branchIds: current.branchIds.includes(id) ? current.branchIds.filter(value => value !== id) : [...current.branchIds, id] }))
  const save = async () => {
    if (!form.branchIds.includes(form.primaryBranchId)) return onError('Choose a primary branch from the assigned branches.')
    setSaving(true)
    try {
      const body = item ? { firstName: form.firstName, lastName: form.lastName, displayName: form.displayName || null, phone: form.phone || null, role: form.role, status: form.status, branchIds: form.branchIds, primaryBranchId: form.primaryBranchId } : { ...form }
      item ? await adminApi.updateStaff(item.id, body) : await adminApi.createStaff(body)
      onSaved()
    } catch (error) { onError(errorText(error)) } finally { setSaving(false) }
  }
  return <Modal title={item ? 'Edit Staff' : 'Add Staff'} onClose={onClose}><div className="grid grid-cols-2 gap-3"><Field label="First name"><input className={input} value={form.firstName} onChange={event => setForm({ ...form, firstName: event.target.value })} /></Field><Field label="Last name"><input className={input} value={form.lastName} onChange={event => setForm({ ...form, lastName: event.target.value })} /></Field></div><Field label="Role"><select className={input} value={form.role} onChange={event => setForm({ ...form, role: event.target.value })}><option value="staff">Staff (Floor & Customer Operations)</option><option value="manager">Manager (Staff Operations + Physical Tables)</option></select></Field>{!item && <><Field label="Email"><input type="email" className={input} value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></Field><Field label="Temporary password"><input type="password" className={input} value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} /></Field></>}<Field label="Phone"><input className={input} value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} /></Field><Field label="Status"><select className={input} value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option></select></Field><div><p className="mb-2 text-sm font-medium">Assigned branches</p><div className="space-y-2 rounded-xl bg-[#F5F5F7] p-3">{branches.map(branch => <label key={branch.id} className="flex gap-2 text-sm"><input type="checkbox" checked={form.branchIds.includes(branch.id)} onChange={() => toggle(branch.id)} />{branch.name}</label>)}</div></div><Field label="Primary branch"><select className={input} value={form.primaryBranchId} onChange={event => setForm({ ...form, primaryBranchId: event.target.value })}><option value="">Select primary branch</option>{branches.filter(branch => form.branchIds.includes(branch.id)).map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></Field><Actions onClose={onClose} onSave={save} saving={saving} /></Modal>
}

function BranchEditor({ item, onClose, onSaved, onError }: { item: BranchManagement | null; onClose: () => void; onSaved: () => void; onError: (error: string) => void }) {
  const [form, setForm] = useState({ code: item?.code ?? '', name: item?.name ?? '', address: item?.address ?? '', district: item?.district ?? '', province: item?.province ?? '', postalCode: item?.postalCode ?? '', phone: item?.phone ?? '', status: item?.status ?? 'active', allowReservations: item?.allowReservations ?? true })
  const [saving, setSaving] = useState(false)
  const save = async () => { setSaving(true); try { item ? await adminApi.updateBranch(item.id, form) : await adminApi.createBranch(form); onSaved() } catch (error) { onError(errorText(error)) } finally { setSaving(false) } }
  return <Modal title={item ? 'Edit Branch' : 'Add Branch'} onClose={onClose}>{[['Branch Code', 'code'], ['Branch Name', 'name'], ['Address', 'address'], ['District', 'district'], ['Province', 'province'], ['Postal Code', 'postalCode'], ['Phone', 'phone']].map(([label, key]) => <Field key={key} label={label}><input className={input} value={String(form[key as keyof typeof form])} onChange={event => setForm({ ...form, [key]: event.target.value })} /></Field>)}<div className="grid grid-cols-2 gap-3"><Field label="Status"><select className={input} value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field><Field label="Reservations"><select className={input} value={form.allowReservations ? 'yes' : 'no'} onChange={event => setForm({ ...form, allowReservations: event.target.value === 'yes' })}><option value="yes">Allowed</option><option value="no">Disabled</option></select></Field></div><Actions onClose={onClose} onSave={save} saving={saving} /></Modal>
}

function ProductEditor({ item, categories, image, onClose, onSaved, onError }: { item: ProductManagement | null; categories: ProductCategory[]; image?: string | null; onClose: () => void; onSaved: () => void; onError: (error: string) => void }) {
  const [form, setForm] = useState({ sku: item?.sku ?? `BRD-${Date.now().toString(36).toUpperCase()}`, name: item?.name ?? '', categoryId: item?.categoryId ?? categories[0]?.id ?? '', basePrice: item?.basePrice ?? 0, salePrice: item?.salePrice ?? null as number | null, minPlayers: item?.minPlayers ?? 1, maxPlayers: item?.maxPlayers ?? 4, minPlayTimeMinutes: item?.minPlayTimeMinutes ?? null as number | null, maxPlayTimeMinutes: item?.maxPlayTimeMinutes ?? null as number | null, minAge: item?.minAge ?? null as number | null, difficulty: item?.difficulty ?? 'easy', description: item?.description ?? '', active: item?.active ?? true })
  const [saving, setSaving] = useState(false)
  const save = async () => { setSaving(true); try { item ? await adminApi.updateProduct(item.id, form) : await adminApi.createProduct(form); onSaved() } catch (error) { onError(errorText(error)) } finally { setSaving(false) } }
  type NumericField = 'basePrice' | 'salePrice' | 'minPlayers' | 'maxPlayers' | 'minPlayTimeMinutes' | 'maxPlayTimeMinutes' | 'minAge'
  const number = (key: NumericField, nullable = false) => <input type="number" className={input} value={form[key] ?? ''} onChange={event => setForm({ ...form, [key]: event.target.value === '' && nullable ? null : Number(event.target.value) })} />
  return <Modal title={item ? 'Edit Product' : 'Add Product'} onClose={onClose}>{item && <div className="flex items-center gap-3 border-b border-[#D2D2D7] pb-4"><ProductIdentity name={item.name} image={image} subtitle={item.categoryName} /></div>}<Field label="Name"><input className={input} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></Field><Field label="Category"><select className={input} value={form.categoryId} onChange={event => setForm({ ...form, categoryId: event.target.value })}>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field><div className="grid grid-cols-2 gap-3"><Field label="Price">{number('basePrice')}</Field><Field label="Sale Price">{number('salePrice', true)}</Field><Field label="Min Players">{number('minPlayers')}</Field><Field label="Max Players">{number('maxPlayers')}</Field><Field label="Difficulty"><select className={input} value={form.difficulty} onChange={event => setForm({ ...form, difficulty: event.target.value })}>{['easy', 'medium', 'advanced', 'expert'].map(value => <option key={value}>{value}</option>)}</select></Field><Field label="Minimum Age">{number('minAge', true)}</Field></div><Field label="Description"><textarea className={`${input} min-h-24`} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></Field><label className="flex gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={event => setForm({ ...form, active: event.target.checked })} />Active product</label><Actions onClose={onClose} onSave={save} saving={saving} /></Modal>
}

function InventoryManager({ items, products, media, branchId, onSaved, onError }: { items: InventoryItem[]; products: ProductManagement[]; media: ProductMediaMap; branchId: string; onSaved: () => void; onError: (error: string) => void }) {
  const [adjusting, setAdjusting] = useState<InventoryItem | null>(null)
  const [adding, setAdding] = useState(false)
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState(0)
  const [threshold, setThreshold] = useState(3)
  const [delta, setDelta] = useState(0)
  const [saving, setSaving] = useState(false)
  const available = products.filter(product => !items.some(item => item.productId === product.id))
  const adjust = async () => { if (!adjusting || delta === 0) return; setSaving(true); try { await adminApi.adjustInventory(adjusting.productId, { branchId, quantityDelta: delta }); setAdjusting(null); setDelta(0); onSaved() } catch (error) { onError(errorText(error)) } finally { setSaving(false) } }
  const add = async () => { if (!productId) return; setSaving(true); try { await adminApi.addInventory({ branchId, productId, quantityOnHand: quantity, lowStockThreshold: threshold }); setAdding(false); setProductId(''); setQuantity(0); onSaved() } catch (error) { onError(errorText(error)) } finally { setSaving(false) } }
  return <><div className="mb-3 flex justify-end"><Btn variant="primary" disabled={available.length === 0} onClick={() => setAdding(true)} className="px-4 py-2 text-sm">+ Add Catalog Product</Btn></div><InventoryTable items={items} media={media} action={setAdjusting} />{adjusting && <Modal title="Adjust Stock" onClose={() => setAdjusting(null)}><ProductIdentity name={adjusting.productName} image={media[adjusting.productId]?.image} /><Field label="Quantity change"><input autoFocus type="number" className={input} value={delta} onChange={event => setDelta(Number(event.target.value))} /></Field><p className="text-xs text-[#6E6E73]">New on-hand quantity: {adjusting.quantityOnHand + delta}</p><Actions onClose={() => setAdjusting(null)} onSave={adjust} saving={saving} /></Modal>}{adding && <Modal title="Add Catalog Product" onClose={() => setAdding(false)}><Field label="Product"><select className={input} value={productId} onChange={event => setProductId(event.target.value)}><option value="">Choose a product</option>{available.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select></Field><div className="grid grid-cols-2 gap-3"><Field label="Opening quantity"><input type="number" min={0} className={input} value={quantity} onChange={event => setQuantity(Number(event.target.value))} /></Field><Field label="Low-stock threshold"><input type="number" min={0} className={input} value={threshold} onChange={event => setThreshold(Number(event.target.value))} /></Field></div><Actions onClose={() => setAdding(false)} onSave={add} saving={saving} /></Modal>}</>
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/30 p-4 backdrop-blur-sm"><section className="my-8 w-full max-w-lg rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-[#D2D2D7] px-6 py-5"><h2 className="text-lg font-bold text-[#1D1D1F]">{title}</h2><button type="button" onClick={onClose} className="text-xl text-[#6E6E73]" aria-label="Close">×</button></div><div className="max-h-[75vh] space-y-3 overflow-y-auto p-6">{children}</div></section></div> }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-medium text-[#1D1D1F]"><span className="mb-1 block text-xs">{label}</span>{children}</label> }
function Actions({ onClose, onSave, saving }: { onClose: () => void; onSave: () => void; saving: boolean }) { return <div className="flex gap-3 pt-3"><Btn variant="secondary" onClick={onClose} className="flex-1 py-2.5">Cancel</Btn><Btn variant="primary" disabled={saving} onClick={() => void onSave()} className="flex-1 py-2.5">{saving ? 'Saving...' : 'Save'}</Btn></div> }
function PageHeader({ title, action, onAction }: { title: string; action: string; onAction: () => void }) { return <div className="mb-6 flex items-center justify-between gap-4"><h1 className="text-2xl font-bold text-[#1D1D1F]">{title}</h1><Btn variant="primary" onClick={onAction} className="px-5 py-2.5 text-sm">+ {action}</Btn></div> }
function SearchField({ value, onChange, onSearch, placeholder }: { value: string; onChange: (value: string) => void; onSearch?: () => void; placeholder: string }) { return <div className="relative mb-5 max-w-sm"><svg aria-hidden="true" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E6E73]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg><input value={value} onChange={event => onChange(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') onSearch?.() }} placeholder={placeholder} className="w-full rounded-xl border border-[#D2D2D7] py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#0071E3]" /></div> }
function TableFrame({ children }: { children: React.ReactNode }) { return <div className="overflow-x-auto rounded-2xl border border-[#D2D2D7] bg-white">{children}</div> }
function TableHead({ children }: { children: React.ReactNode }) { return <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6E6E73]">{children}</th> }
function EmptyRow({ columns, children }: { columns: number; children: React.ReactNode }) { return <tr><td colSpan={columns} className="py-12 text-center text-[#6E6E73]">{children}</td></tr> }
function Avatar({ name, tone = 'blue' }: { name: string; tone?: 'blue' | 'violet' }) { return <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${tone === 'violet' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>{name.charAt(0).toUpperCase()}</div> }
function SummaryCard({ label, value, color = 'text-[#1D1D1F]' }: { label: string; value: number; color?: string }) { return <article className="rounded-2xl border border-[#D2D2D7] bg-white p-4"><div className={`text-2xl font-bold ${color}`}>{value}</div><div className="mt-0.5 text-sm text-[#6E6E73]">{label}</div></article> }
function Stat({ label, value }: { label: string; value: number }) { return <div className="text-center"><p className="text-lg font-bold text-[#1D1D1F]">{value}</p><p className="text-xs text-[#6E6E73]">{label}</p></div> }
function Loading() { return <div className="p-12 text-center text-[#6E6E73]">Loading database-backed information...</div> }
function Notice({ text, error = false }: { text: string; error?: boolean }) { return <div className={`mb-5 rounded-xl p-4 text-sm ${error ? 'border border-red-200 bg-red-50 text-red-700' : 'border border-green-200 bg-green-50 text-green-700'}`}>{text}</div> }
