import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Btn } from '@/components/ui'
import { staffApi, type Dashboard, type InventoryItem, type OrderSummary, type StaffBranch, type UserSummary } from '@/services/managementApi'
import { productsApi } from '@/services/productsApi'
import type { Product } from '@/types'

export type ProductMediaMap = Record<string, Pick<Product, 'image' | 'category' | 'price' | 'salePrice'>>

const money = (value: number, currency = 'THB') => new Intl.NumberFormat('en-TH', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
const date = (value: string) => new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' }).format(new Date(value))
const errorText = (error: unknown) => typeof error === 'object' && error && 'message' in error ? String(error.message) : 'Unable to load this information.'

export function StaffDashboardPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { staffApi.dashboard().then(setData).catch(error => setError(errorText(error))) }, [])
  if (error) return <PageNotice text={error} />
  if (!data) return <Loading />
  const cards = [
    { label: 'Available Tables', value: data.availableTables, sub: `of ${data.totalTables} total`, color: 'text-green-600' },
    { label: 'Active Sessions', value: data.activeSessions, sub: 'playing now', color: 'text-blue-600' },
    { label: "Today's Reservations", value: data.reservationsToday, sub: 'database confirmed', color: 'text-violet-600' },
    { label: 'Pickup Orders', value: data.orders, sub: 'assigned branch', color: 'text-amber-600' },
  ]
  return (
    <div className="max-w-none p-4 sm:p-6">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div><h1 className="text-2xl font-bold text-[#1D1D1F]">Dashboard</h1><p className="mt-0.5 text-sm text-[#6E6E73]">{new Intl.DateTimeFormat('en-GB', { dateStyle: 'full' }).format(new Date())}</p></div>
        <div className="rounded-xl border border-[#D2D2D7] bg-[#F5F5F7] px-4 py-2"><div className="text-xs text-[#6E6E73]">Assigned Branch</div><div className="text-sm font-semibold text-[#1D1D1F]">{data.branchName}</div></div>
      </div>
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {cards.map(card => <article key={card.label} className="rounded-2xl border border-[#D2D2D7] bg-white p-4 sm:p-5"><div className={`mb-1 text-2xl font-bold ${card.color}`}>{card.value}</div><div className="text-sm font-medium text-[#1D1D1F]">{card.label}</div><div className="mt-0.5 text-xs text-[#6E6E73]">{card.sub}</div></article>)}
      </div>
      <section className="rounded-2xl border border-[#D2D2D7] bg-white p-5">
        <h2 className="mb-4 font-bold text-[#1D1D1F]">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-3"><QuickAction label="View Live Tables" detail="Manage sessions and walk-ins" onClick={() => navigate('/staff/tables')} /><QuickAction label="Reservation Check-In" detail="Start a reserved session" onClick={() => navigate('/staff/check-in')} /><QuickAction label="Pickup Orders" detail="Review assigned orders" onClick={() => navigate('/staff/orders')} /></div>
      </section>
    </div>
  )
}

function QuickAction({ label, detail, onClick }: { label: string; detail: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-xl border border-[#D2D2D7] bg-[#F5F5F7] p-4 text-left transition-colors hover:border-[#0071E3] hover:bg-blue-50"><span className="block text-sm font-semibold text-[#1D1D1F]">{label}</span><span className="mt-1 block text-xs text-[#6E6E73]">{detail}</span></button>
}

export function StaffOrdersPage() {
  const [items, setItems] = useState<OrderSummary[]>([])
  const [tab, setTab] = useState('All')
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { staffApi.orders().then(setItems).catch(error => setError(errorText(error))) }, [])
  const statuses = useMemo(() => ['All', ...Array.from(new Set(items.map(item => item.status)))], [items])
  const filtered = tab === 'All' ? items : items.filter(item => item.status === tab)
  return <div className="p-4 sm:p-6"><div className="mb-6"><h1 className="text-2xl font-bold text-[#1D1D1F]">Order Management</h1><p className="mt-1 text-sm text-[#6E6E73]">Pickup orders are limited to your assigned branches.</p></div><FilterTabs values={statuses} value={tab} onChange={setTab} />{error ? <PageNotice text={error} /> : <OrdersTable items={filtered} empty="No pickup orders match this status." />}</div>
}

export function StaffProductsPage() {
  const [branches, setBranches] = useState<StaffBranch[]>([])
  const [branchId, setBranchId] = useState('')
  const [items, setItems] = useState<InventoryItem[]>([])
  const [media, setMedia] = useState<ProductMediaMap>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [adjusting, setAdjusting] = useState<InventoryItem | null>(null)
  useEffect(() => {
    Promise.all([staffApi.branches(), productsApi.list({ size: 100 })]).then(([assigned, productPage]) => {
      setBranches(assigned)
      setBranchId(assigned[0]?.id ?? '')
      setMedia(Object.fromEntries(productPage.content.map(product => [product.id, { image: product.image, category: product.category, price: product.price, salePrice: product.salePrice }])))
    }).catch(error => { setError(errorText(error)); setLoading(false) })
  }, [])
  useEffect(() => { if (!branchId) return; setLoading(true); setError(null); staffApi.products(branchId).then(setItems).catch(error => setError(errorText(error))).finally(() => setLoading(false)) }, [branchId])
  const inStock = items.filter(item => item.availableQuantity > item.lowStockThreshold).length
  const lowStock = items.filter(item => item.availableQuantity > 0 && item.availableQuantity <= item.lowStockThreshold).length
  const outOfStock = items.filter(item => item.availableQuantity === 0).length
  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-bold text-[#1D1D1F]">Product Management</h1><p className="mt-1 text-sm text-[#6E6E73]">Update physical stock at your assigned branch.</p></div>{branches.length > 1 && <select value={branchId} onChange={event => setBranchId(event.target.value)} className="rounded-xl border border-[#D2D2D7] bg-white px-3 py-2.5 text-sm">{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>}</div>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4"><SummaryCard label="Total Products" value={items.length} /><SummaryCard label="In Stock" value={inStock} color="text-green-600" /><SummaryCard label="Low Stock" value={lowStock} color="text-orange-600" /><SummaryCard label="Out of Stock" value={outOfStock} color="text-red-600" /></div>
      {error ? <PageNotice text={error} /> : loading ? <Loading /> : <InventoryTable items={items} media={media} action={setAdjusting} />}
      {adjusting && <StockAdjustmentModal item={adjusting} onClose={() => setAdjusting(null)} onSaved={async () => { setAdjusting(null); setItems(await staffApi.products(branchId)) }} onError={setError} />}
    </div>
  )
}

export function StaffUsersPage() {
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<UserSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const load = () => staffApi.users(search).then(setItems).catch(error => setError(errorText(error)))
  useEffect(() => { void load() }, [])
  return <div className="p-4 sm:p-6"><div className="mb-6 flex items-center justify-between"><h1 className="text-2xl font-bold text-[#1D1D1F]">Users</h1><span className="text-sm text-[#6E6E73]">{items.length} accounts</span></div><SearchBar value={search} onChange={setSearch} onSearch={load} placeholder="Search name, email, phone..." />{error ? <PageNotice text={error} /> : <UsersTable items={items} />}</div>
}

export function OrdersTable({ items, empty }: { items: OrderSummary[]; empty: string }) {
  return <TableFrame><table className="w-full min-w-[760px] text-sm"><thead className="border-b border-[#D2D2D7] bg-[#F5F5F7]"><tr>{['Order ID', 'Customer', 'Date', 'Items', 'Total', 'Method', 'Status'].map(label => <TableHead key={label}>{label}</TableHead>)}</tr></thead><tbody>{items.length === 0 ? <EmptyRow columns={7}>{empty}</EmptyRow> : items.map(item => <tr key={item.orderNumber} className="border-b border-[#D2D2D7] last:border-0 hover:bg-[#F5F5F7]"><td className="px-4 py-3.5 font-mono font-semibold text-[#0071E3]">#{item.orderNumber}</td><td className="px-4 py-3.5 font-medium text-[#1D1D1F]">{item.customerName}</td><td className="px-4 py-3.5 text-[#6E6E73]">{date(item.placedAt)}</td><td className="px-4 py-3.5 text-[#6E6E73]">{item.itemCount}</td><td className="px-4 py-3.5 font-semibold">{money(item.totalAmount, item.currency)}</td><td className="px-4 py-3.5 text-[#6E6E73]">{item.fulfillmentMethod}</td><td className="px-4 py-3.5"><StatusBadge status={item.status} /></td></tr>)}</tbody></table></TableFrame>
}

export function InventoryTable({ items, media = {}, action }: { items: InventoryItem[]; media?: ProductMediaMap; action?: (item: InventoryItem) => void }) {
  const columns = action ? 6 : 5
  return <TableFrame><table className="w-full min-w-[650px] text-sm"><thead className="border-b border-[#D2D2D7] bg-[#F5F5F7]"><tr>{['Product', 'On Hand', 'Reserved', 'Available', 'Status', ...(action ? ['Action'] : [])].map(label => <TableHead key={label}>{label}</TableHead>)}</tr></thead><tbody>{items.length === 0 ? <EmptyRow columns={columns}>No inventory records for this branch.</EmptyRow> : items.map(item => <tr key={item.productId} className="border-b border-[#D2D2D7] last:border-0 hover:bg-[#F5F5F7]"><td className="px-4 py-3"><ProductIdentity name={item.productName} image={media[item.productId]?.image} subtitle={media[item.productId]?.category} /></td><td className="px-4 py-3">{item.quantityOnHand}</td><td className="px-4 py-3">{item.reservedQuantity}</td><td className="px-4 py-3 font-semibold">{item.availableQuantity}</td><td className="px-4 py-3"><StockBadge item={item} /></td>{action && <td className="px-4 py-3"><Btn variant="secondary" onClick={() => action(item)} className="px-3 py-1.5 text-xs">Adjust</Btn></td>}</tr>)}</tbody></table></TableFrame>
}

function StockAdjustmentModal({ item, onClose, onSaved, onError }: { item: InventoryItem; onClose: () => void; onSaved: () => Promise<void>; onError: (error: string) => void }) {
  const [delta, setDelta] = useState(0)
  const [saving, setSaving] = useState(false)
  const save = async () => { if (delta === 0) return; setSaving(true); try { await staffApi.adjustInventory(item.productId, { branchId: item.branchId, quantityDelta: delta }); await onSaved() } catch (error) { onError(errorText(error)); setSaving(false) } }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"><section className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"><h2 className="text-lg font-bold">Adjust Stock</h2><p className="mt-1 text-sm text-[#6E6E73]">{item.productName} at {item.branchName}</p><label className="mt-5 block text-sm font-medium">Quantity change<input autoFocus type="number" value={delta} onChange={event => setDelta(Number(event.target.value))} className="mt-1.5 w-full rounded-xl border border-[#D2D2D7] px-3 py-2.5" /></label><p className="mt-2 text-xs text-[#6E6E73]">New on-hand quantity: {item.quantityOnHand + delta}</p><div className="mt-6 flex gap-3"><Btn variant="secondary" onClick={onClose} className="flex-1">Cancel</Btn><Btn variant="primary" disabled={saving || delta === 0 || item.quantityOnHand + delta < item.reservedQuantity} onClick={() => void save()} className="flex-1">{saving ? 'Saving...' : 'Save'}</Btn></div></section></div>
}

export function UsersTable({ items, actions }: { items: UserSummary[]; actions?: (item: UserSummary) => React.ReactNode }) {
  return <TableFrame><table className="w-full min-w-[900px] text-sm"><thead className="border-b border-[#D2D2D7] bg-[#F5F5F7]"><tr>{['User', 'Email', 'Phone', 'Status', 'Orders', 'Reservations', 'Visits', 'Last Activity', ...(actions ? ['Actions'] : [])].map(label => <TableHead key={label}>{label}</TableHead>)}</tr></thead><tbody>{items.length === 0 ? <EmptyRow columns={actions ? 9 : 8}>No matching customer records.</EmptyRow> : items.map(item => <tr key={item.id} className="border-b border-[#D2D2D7] last:border-0 hover:bg-[#F5F5F7]"><td className="px-4 py-3"><div className="flex items-center gap-2.5"><Avatar name={item.name} /><span className="whitespace-nowrap font-medium text-[#1D1D1F]">{item.name}</span></div></td><td className="px-4 py-3 text-[#6E6E73]">{item.email}</td><td className="whitespace-nowrap px-4 py-3 text-[#6E6E73]">{item.phone || '-'}</td><td className="px-4 py-3"><StatusBadge status={item.status} /></td><td className="px-4 py-3 text-center font-medium">{item.orderCount}</td><td className="px-4 py-3 text-center font-medium">{item.reservationCount}</td><td className="px-4 py-3 text-center font-medium">{item.completedVisits}</td><td className="whitespace-nowrap px-4 py-3 text-[#6E6E73]">{item.lastActivity ? date(item.lastActivity) : '-'}</td>{actions && <td className="px-4 py-3">{actions(item)}</td>}</tr>)}</tbody></table></TableFrame>
}

export function ProductIdentity({ name, image, subtitle }: { name: string; image?: string | null; subtitle?: string }) {
  return <div className="flex items-center gap-3"><div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#F5F5F7] text-xs font-bold text-[#6E6E73]">{image ? <img src={image} alt="" className="h-full w-full object-cover" /> : name.slice(0, 2).toUpperCase()}</div><div><div className="font-medium text-[#1D1D1F]">{name}</div>{subtitle && <div className="mt-0.5 text-xs text-[#6E6E73]">{subtitle}</div>}</div></div>
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase()
  const style = normalized.includes('complete') || normalized === 'active' || normalized.includes('ready') ? 'bg-green-100 text-green-700' : normalized.includes('cancel') || normalized === 'inactive' || normalized === 'suspended' ? 'bg-gray-100 text-gray-500' : normalized.includes('pending') || normalized.includes('process') ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium capitalize ${style}`}>{status.replace(/_/g, ' ')}</span>
}

function StockBadge({ item }: { item: InventoryItem }) {
  if (item.availableQuantity === 0) return <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">Out of Stock</span>
  if (item.availableQuantity <= item.lowStockThreshold) return <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-600">Low Stock</span>
  return <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">In Stock</span>
}

function FilterTabs({ values, value, onChange }: { values: string[]; value: string; onChange: (value: string) => void }) {
  return <div className="mb-6 flex flex-wrap gap-2">{values.map(item => <button key={item} type="button" onClick={() => onChange(item)} className={`rounded-xl px-4 py-2 text-sm font-medium capitalize transition-colors ${value === item ? 'bg-[#1D1D1F] text-white' : 'bg-[#F5F5F7] text-[#6E6E73] hover:bg-gray-200'}`}>{item.replace(/_/g, ' ')}</button>)}</div>
}

function SearchBar({ value, onChange, onSearch, placeholder }: { value: string; onChange: (value: string) => void; onSearch: () => void; placeholder: string }) {
  return <div className="relative mb-5 max-w-sm"><SearchIcon /><input value={value} onChange={event => onChange(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') onSearch() }} placeholder={placeholder} className="w-full rounded-xl border border-[#D2D2D7] py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#0071E3]" /></div>
}

function SearchIcon() { return <svg aria-hidden="true" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E6E73]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg> }
function SummaryCard({ label, value, color = 'text-[#1D1D1F]' }: { label: string; value: number; color?: string }) { return <div className="rounded-2xl border border-[#D2D2D7] bg-white p-4"><div className={`text-2xl font-bold ${color}`}>{value}</div><div className="mt-0.5 text-sm text-[#6E6E73]">{label}</div></div> }
function Avatar({ name }: { name: string }) { return <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#0071E3]/10 text-xs font-bold text-[#0071E3]">{name.trim().charAt(0).toUpperCase()}</div> }
function TableFrame({ children }: { children: React.ReactNode }) { return <div className="overflow-x-auto rounded-2xl border border-[#D2D2D7] bg-white">{children}</div> }
function TableHead({ children }: { children: React.ReactNode }) { return <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6E6E73]">{children}</th> }
function EmptyRow({ columns, children }: { columns: number; children: React.ReactNode }) { return <tr><td colSpan={columns} className="py-12 text-center text-[#6E6E73]">{children}</td></tr> }
function Loading() { return <div className="p-12 text-center text-[#6E6E73]">Loading database-backed information...</div> }
function PageNotice({ text }: { text: string }) { return <div className="m-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{text}</div> }
