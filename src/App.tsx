import { useState } from 'react'
import imgWingspan from '@/imports/Wingspan.jpg'
import imgCatan from '@/imports/Catan.jpg'
import imgTicketToRide from '@/imports/Ticket_the_ride.jpg'
import imgCodenames from '@/imports/Codename.jpg'
import imgPandemic from '@/imports/Pandemic.jpg'
import imgAzul from '@/imports/Azul.jpg'
import imgGloomhaven from '@/imports/Gloomhaven.jpg'
import imgDixit from '@/imports/Dixit.jpg'

// ===================== TYPES =====================

type Page =
  | 'home' | 'shop' | 'product' | 'cart' | 'checkout' | 'order-confirm'
  | 'reserve' | 'reserve-confirm' | 'login' | 'register' | 'account'
  | 'my-orders' | 'my-reservations' | 'visit-store'
  | 'staff-dashboard' | 'staff-tables' | 'staff-checkin' | 'staff-orders' | 'staff-products' | 'staff-users'
  | 'admin-dashboard' | 'admin-tables' | 'admin-checkin' | 'admin-orders' | 'admin-products'
  | 'admin-users' | 'admin-staff' | 'admin-branches'

type UserMode = 'guest' | 'customer' | 'staff' | 'admin'

interface Product {
  id: string; name: string; category: string; price: number
  players: string; playTime: string; age: string
  difficulty: 'Easy' | 'Medium' | 'Advanced' | 'Expert'
  rating: number; reviewCount: number; stock: number
  image: string; description: string
  isNew?: boolean; salePrice?: number
}

interface CartItem { product: Product; quantity: number }

interface TableData {
  id: string; zone: string; capacity: string
  minPlayers: number; maxPlayers: number
  status: 'available' | 'reserved' | 'occupied' | 'unavailable'
  features: string[]
  client?: string; players?: number; checkIn?: string; elapsed?: string; fee?: number
}

interface ReservationFlow {
  step: number; branchId: string | null; date: string; time: string; duration: number; players: number; tableId: string | null
}

interface Branch {
  id: string; name: string; address: string; district: string; hours: string
  tables: number; staff: number; reservationsToday: number; status: 'active' | 'inactive'
  phone: string; code: string
}

interface StaffMember {
  id: string; name: string; email: string; phone: string; branch: string; status: 'Active' | 'Inactive'; lastLogin: string
}

// ===================== DATA =====================

const PRODUCTS: Product[] = [
  { id: 'wingspan', name: 'Wingspan', category: 'Strategy', price: 1890, players: '1–5', playTime: '40–70 min', age: '10+', difficulty: 'Medium', rating: 4.8, reviewCount: 342, stock: 12, image: imgWingspan, description: 'A competitive, card-driven, engine-building board game. You are bird enthusiasts seeking to discover and attract the best birds to your network of wildlife preserves. Each bird extends a powerful chain of actions in one of your three habitats.' },
  { id: 'catan', name: 'Catan', category: 'Strategy', price: 1490, players: '3–4', playTime: '60–120 min', age: '10+', difficulty: 'Easy', rating: 4.6, reviewCount: 891, stock: 8, image: imgCatan, description: 'The classic island trading game. Build settlements, cities, and roads while trading resources with your rivals. The first player to reach 10 victory points wins the game.' },
  { id: 'ticket-to-ride', name: 'Ticket to Ride', category: 'Family', price: 1290, players: '2–5', playTime: '30–60 min', age: '8+', difficulty: 'Easy', rating: 4.7, reviewCount: 654, stock: 5, image: imgTicketToRide, description: 'A cross-country train adventure game. Players collect train cards to claim railway routes across a map, earning points for routes and connecting cities throughout North America.' },
  { id: 'codenames', name: 'Codenames', category: 'Party', price: 690, players: '2–8', playTime: '15–30 min', age: '10+', difficulty: 'Easy', rating: 4.5, reviewCount: 1203, stock: 20, image: imgCodenames, description: 'Two rival spymasters know the secret identities of 25 agents. Their teammates must make contact with all agents using one-word clues.' },
  { id: 'pandemic', name: 'Pandemic', category: 'Cooperative', price: 1190, players: '2–4', playTime: '45–75 min', age: '8+', difficulty: 'Medium', rating: 4.6, reviewCount: 478, stock: 3, image: imgPandemic, description: 'Work together as a team of disease-fighting specialists to treat outbreaks and find cures for four deadly viruses that threaten to wipe out humanity.' },
  { id: 'azul', name: 'Azul', category: 'Abstract', price: 990, players: '2–4', playTime: '30–45 min', age: '8+', difficulty: 'Easy', rating: 4.7, reviewCount: 562, stock: 7, image: imgAzul, description: 'Draft beautiful azulejo tiles to decorate your wall. Score points for completing patterns while denying your opponents the pieces they need.', isNew: true },
  { id: 'gloomhaven', name: 'Gloomhaven', category: 'Adventure', price: 4890, players: '1–4', playTime: '60–120+ min', age: '14+', difficulty: 'Expert', rating: 4.9, reviewCount: 289, stock: 2, image: imgGloomhaven, description: 'A massive dungeon-crawl adventure with a branching narrative that changes based on your decisions. 95+ scenarios of tactical combat await.' },
  { id: 'dixit', name: 'Dixit', category: 'Party', price: 890, players: '3–6', playTime: '30 min', age: '8+', difficulty: 'Easy', rating: 4.4, reviewCount: 445, stock: 15, image: imgDixit, description: 'A beautifully illustrated storytelling game. Use dreamlike images to inspire clever clues that fool some but not all of your fellow players.', isNew: true },
]

const TABLES: TableData[] = [
  { id: 'A1', zone: 'Window', capacity: '2–4', minPlayers: 2, maxPlayers: 4, status: 'available', features: ['Near Window', 'Natural Light'] },
  { id: 'A2', zone: 'Window', capacity: '2–4', minPlayers: 2, maxPlayers: 4, status: 'reserved', features: ['Near Window', 'Natural Light'] },
  { id: 'A3', zone: 'Window', capacity: '2–4', minPlayers: 2, maxPlayers: 4, status: 'available', features: ['Near Window', 'Power Outlet'] },
  { id: 'B1', zone: 'Main', capacity: '4–6', minPlayers: 4, maxPlayers: 6, status: 'occupied', features: ['Power Outlet', 'Central Location'], client: 'Napat S.', players: 4, checkIn: '14:02', elapsed: '02:34', fee: 140 },
  { id: 'B2', zone: 'Main', capacity: '4–6', minPlayers: 4, maxPlayers: 6, status: 'available', features: ['Power Outlet', 'Central Location'] },
  { id: 'B3', zone: 'Main', capacity: '4–6', minPlayers: 4, maxPlayers: 6, status: 'available', features: ['Central Location'] },
  { id: 'B4', zone: 'Main', capacity: '4–6', minPlayers: 4, maxPlayers: 6, status: 'available', features: ['Near Window', 'Power Outlet'] },
  { id: 'C1', zone: 'Corner', capacity: '6–8', minPlayers: 6, maxPlayers: 8, status: 'available', features: ['Private Corner', 'Large Table', 'Whiteboard'] },
  { id: 'C2', zone: 'Corner', capacity: '6–8', minPlayers: 6, maxPlayers: 8, status: 'unavailable', features: ['Private Corner', 'Large Table'] },
  { id: 'C3', zone: 'Corner', capacity: '6–8', minPlayers: 6, maxPlayers: 8, status: 'occupied', features: ['Private Corner', 'Large Table'], client: 'Supaporn T.', players: 6, checkIn: '13:30', elapsed: '03:06', fee: 240 },
]

const TIME_SLOTS = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00']
const DISABLED_TIMES = ['12:00', '13:00']

const BRANCHES: Branch[] = [
  { id: 'central', name: 'Central Branch', address: '123 Ekkamai Road', district: 'Watthana, Bangkok', hours: '10:00–22:00', tables: 10, staff: 5, reservationsToday: 12, status: 'active', phone: '02-111-2222', code: 'BG-CTR' },
  { id: 'silom', name: 'Silom Branch', address: '45 Silom Road', district: 'Bang Rak, Bangkok', hours: '11:00–22:00', tables: 8, staff: 3, reservationsToday: 8, status: 'active', phone: '02-333-4444', code: 'BG-SLM' },
  { id: 'siam', name: 'Siam Branch', address: '22 Rama I Road', district: 'Pathum Wan, Bangkok', hours: '10:00–21:00', tables: 12, staff: 6, reservationsToday: 15, status: 'active', phone: '02-555-6666', code: 'BG-SIM' },
  { id: 'onnut', name: 'On Nut Branch', address: '88 Sukhumvit 77', district: 'Prawet, Bangkok', hours: '12:00–22:00', tables: 6, staff: 2, reservationsToday: 0, status: 'inactive', phone: '02-777-8888', code: 'BG-ONN' },
]

const STAFF_LIST: StaffMember[] = [
  { id: 'st1', name: 'Wanchai P.', email: 'wanchai@boardly.com', phone: '081-111-2222', branch: 'Central Branch', status: 'Active', lastLogin: '15 Aug 2026' },
  { id: 'st2', name: 'Supaporn T.', email: 'supaporn@boardly.com', phone: '082-222-3333', branch: 'Central Branch', status: 'Active', lastLogin: '15 Aug 2026' },
  { id: 'st3', name: 'Kittipong S.', email: 'kittipong@boardly.com', phone: '083-333-4444', branch: 'Silom Branch', status: 'Active', lastLogin: '14 Aug 2026' },
  { id: 'st4', name: 'Malee R.', email: 'malee@boardly.com', phone: '084-444-5555', branch: 'Siam Branch', status: 'Active', lastLogin: '15 Aug 2026' },
  { id: 'st5', name: 'Chaiwat N.', email: 'chaiwat@boardly.com', phone: '085-555-6666', branch: 'Silom Branch', status: 'Inactive', lastLogin: '1 Aug 2026' },
]

// ===================== HELPERS =====================

const fmt = (n: number) => `฿${n.toLocaleString()}`

function Stars({ r, n }: { r: number; n: number }) {
  return (
    <span className="flex items-center gap-1">
      {[1,2,3,4,5].map(i => (
        <svg key={i} className={`w-3.5 h-3.5 ${i <= Math.round(r) ? 'text-amber-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="text-xs text-[#6E6E73]">{r} ({n})</span>
    </span>
  )
}

function DiffBadge({ d }: { d: string }) {
  const colors: Record<string, string> = {
    Easy: 'bg-green-100 text-green-700', Medium: 'bg-amber-100 text-amber-700',
    Advanced: 'bg-orange-100 text-orange-700', Expert: 'bg-red-100 text-red-700',
  }
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[d] ?? 'bg-gray-100 text-gray-600'}`}>{d}</span>
}

function StockBadge({ s }: { s: number }) {
  if (s === 0) return <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Out of Stock</span>
  if (s <= 3) return <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">Only {s} left</span>
  return <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">In Stock</span>
}

// ===================== SHARED UI =====================

function Btn({ children, variant = 'primary', onClick, className = '', disabled = false }: {
  children: React.ReactNode; variant?: 'primary'|'secondary'|'ghost'|'danger'
  onClick?: () => void; className?: string; disabled?: boolean
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 rounded-xl select-none'
  const variants = {
    primary: 'bg-[#0071E3] text-white hover:bg-[#0077ED] active:bg-[#006FD6] disabled:bg-gray-300 disabled:text-gray-400',
    secondary: 'bg-[#F5F5F7] text-[#1D1D1F] hover:bg-gray-200 active:bg-gray-300',
    ghost: 'bg-transparent text-[#0071E3] hover:bg-blue-50',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  }
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  )
}

function ProductCard({ product, onView, onAddToCart }: {
  product: Product; onView: () => void; onAddToCart: () => void
}) {
  const [liked, setLiked] = useState(false)
  return (
    <div className="group bg-white rounded-2xl border border-[#D2D2D7] overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      <div className="relative overflow-hidden bg-[#F5F5F7] aspect-square cursor-pointer" onClick={onView}>
        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        {product.isNew && <span className="absolute top-3 left-3 bg-[#0071E3] text-white text-xs font-semibold px-2.5 py-1 rounded-full">New</span>}
        <button
          onClick={e => { e.stopPropagation(); setLiked(l => !l) }}
          className="absolute top-3 right-3 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <svg className={`w-4 h-4 ${liked ? 'text-red-500 fill-red-500' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>
      <div className="p-4">
        <div className="text-xs text-[#6E6E73] mb-1">{product.category}</div>
        <div className="font-semibold text-[#1D1D1F] mb-1 cursor-pointer hover:text-[#0071E3] transition-colors" onClick={onView}>{product.name}</div>
        <Stars r={product.rating} n={product.reviewCount} />
        <div className="flex items-center gap-3 mt-2 text-xs text-[#6E6E73]">
          <span>{product.players} players</span>
          <span>·</span>
          <span>{product.playTime}</span>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div>
            {product.salePrice
              ? <><span className="font-bold text-[#1D1D1F]">{fmt(product.salePrice)}</span> <span className="text-sm text-[#6E6E73] line-through">{fmt(product.price)}</span></>
              : <span className="font-bold text-[#1D1D1F]">{fmt(product.price)}</span>}
          </div>
          <Btn variant="primary" onClick={onAddToCart} className="text-sm px-4 py-2" disabled={product.stock === 0}>
            Add to Cart
          </Btn>
        </div>
      </div>
    </div>
  )
}

// ===================== BRANCH SEARCH DROPDOWN =====================

function BranchSearchDropdown({ value, onChange, placeholder = 'Search or select a branch...', onlyActive = false }: {
  value: string | null; onChange: (id: string) => void; placeholder?: string; onlyActive?: boolean
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const options = BRANCHES.filter(b => (!onlyActive || b.status === 'active') && (b.name.toLowerCase().includes(query.toLowerCase()) || b.district.toLowerCase().includes(query.toLowerCase())))
  const selected = BRANCHES.find(b => b.id === value)

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between border border-[#D2D2D7] rounded-xl px-4 py-3 text-sm bg-white outline-none focus:border-[#0071E3] transition-colors text-left">
        {selected ? (
          <div>
            <div className="font-medium text-[#1D1D1F]">{selected.name}</div>
            <div className="text-xs text-[#6E6E73]">{selected.district}</div>
          </div>
        ) : (
          <span className="text-[#6E6E73]">{placeholder}</span>
        )}
        <svg className={`w-4 h-4 text-[#6E6E73] flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-[#D2D2D7] rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-[#D2D2D7]">
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search branch..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#D2D2D7] outline-none focus:border-[#0071E3]" />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {options.length === 0 ? (
              <div className="px-4 py-3 text-sm text-[#6E6E73]">No branches found</div>
            ) : options.map(b => (
              <button key={b.id} type="button" onClick={() => { onChange(b.id); setOpen(false); setQuery('') }}
                className={`w-full text-left px-4 py-3 hover:bg-[#F5F5F7] transition-colors border-b border-[#D2D2D7]/50 last:border-0 ${value === b.id ? 'bg-blue-50' : ''}`}>
                <div className="font-medium text-[#1D1D1F] text-sm">{b.name}</div>
                <div className="text-xs text-[#6E6E73] mt-0.5">{b.district} · {b.hours}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ===================== ADMIN SIDEBAR =====================

function AdminSidebar({ page, navigate, onLogout }: { page: Page; navigate: (p: Page) => void; onLogout: () => void }) {
  const sections = [
    {
      title: 'Operations',
      links: [
        { icon: '◈', label: 'Dashboard', page: 'admin-dashboard' as Page },
        { icon: '⊞', label: 'Live Tables', page: 'admin-tables' as Page },
        { icon: '✓', label: 'Check-In', page: 'admin-checkin' as Page },
        { icon: '📦', label: 'Orders', page: 'admin-orders' as Page },
        { icon: '🎲', label: 'Products', page: 'admin-products' as Page },
      ],
    },
    {
      title: 'Management',
      links: [
        { icon: '👥', label: 'Users', page: 'admin-users' as Page },
        { icon: '🏷️', label: 'Staff', page: 'admin-staff' as Page },
        { icon: '🏢', label: 'Branches', page: 'admin-branches' as Page },
      ],
    },
  ]
  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-[#1D1D1F] text-white flex flex-col z-40">
      <div className="px-5 py-5 border-b border-white/10">
        <div className="font-bold text-base flex items-center gap-2"><span>♟</span> <span>Boardly</span></div>
        <div className="text-xs text-white/40 mt-0.5">Admin Panel</div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {sections.map(s => (
          <div key={s.title}>
            <div className="text-[10px] font-semibold text-white/30 uppercase tracking-widest px-3 mb-1">{s.title}</div>
            <div className="space-y-1">
              {s.links.map(l => (
                <button key={l.page} onClick={() => navigate(l.page)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${page === l.page ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                  <span>{l.icon}</span><span>{l.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="px-3 pb-5">
        <button onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors">
          <span>→</span><span>Logout</span>
        </button>
      </div>
    </aside>
  )
}

// ===================== CUSTOMER NAV =====================

function Nav({ page, cartCount, navigate, userMode }: {
  page: Page; cartCount: number; navigate: (p: Page) => void; userMode: UserMode
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const navLinks = [
    { label: 'Shop', page: 'shop' as Page },
    { label: 'Reserve a Table', page: 'reserve' as Page },
    { label: 'Visit Store', page: 'visit-store' as Page },
  ]
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#D2D2D7]/60">
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-14">
        <button onClick={() => navigate('home')} className="font-bold text-lg text-[#1D1D1F] tracking-tight flex items-center gap-2">
          <span className="text-2xl">♟</span>
          <span>Boardly</span>
        </button>
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map(l => (
            <button key={l.page} onClick={() => navigate(l.page)}
              className={`text-sm font-medium transition-colors ${page === l.page ? 'text-[#0071E3]' : 'text-[#1D1D1F] hover:text-[#0071E3]'}`}>
              {l.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('shop')} className="p-2 rounded-xl hover:bg-[#F5F5F7] transition-colors">
            <svg className="w-5 h-5 text-[#1D1D1F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button onClick={() => navigate(userMode === 'guest' ? 'login' : 'account')} className="p-2 rounded-xl hover:bg-[#F5F5F7] transition-colors">
            <svg className="w-5 h-5 text-[#1D1D1F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>
          <button onClick={() => navigate('cart')} className="relative p-2 rounded-xl hover:bg-[#F5F5F7] transition-colors">
            <svg className="w-5 h-5 text-[#1D1D1F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#0071E3] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
          <button onClick={() => setMenuOpen(m => !m)} className="md:hidden p-2 rounded-xl hover:bg-[#F5F5F7] transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
            </svg>
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="md:hidden border-t border-[#D2D2D7]/60 bg-white px-6 py-4 space-y-3">
          {navLinks.map(l => (
            <button key={l.page} onClick={() => { navigate(l.page); setMenuOpen(false) }}
              className="block w-full text-left text-sm font-medium text-[#1D1D1F] py-2">
              {l.label}
            </button>
          ))}
        </div>
      )}
    </nav>
  )
}

// ===================== STAFF SIDEBAR =====================

function StaffSidebar({ page, navigate, onLogout }: { page: Page; navigate: (p: Page) => void; onLogout: () => void }) {
  const links = [
    { icon: '◈', label: 'Dashboard', page: 'staff-dashboard' as Page },
    { icon: '⊞', label: 'Live Tables', page: 'staff-tables' as Page },
    { icon: '✓', label: 'Check-In', page: 'staff-checkin' as Page },
    { icon: '📦', label: 'Orders', page: 'staff-orders' as Page },
    { icon: '🎲', label: 'Products', page: 'staff-products' as Page },
    { icon: '👥', label: 'Users', page: 'staff-users' as Page },
  ]
  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-[#1D1D1F] text-white flex flex-col z-40">
      <div className="px-5 py-5 border-b border-white/10">
        <div className="font-bold text-base flex items-center gap-2">
          <span>♟</span> <span>Boardly</span>
        </div>
        <div className="text-xs text-white/40 mt-0.5">Staff Dashboard</div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {links.map(l => (
          <button key={l.page} onClick={() => navigate(l.page)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${page === l.page ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
            <span>{l.icon}</span>
            <span>{l.label}</span>
          </button>
        ))}
      </nav>
      <div className="px-3 pb-5">
        <button onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors">
          <span>→</span> <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}

// ===================== HOME PAGE =====================

function HomePage({ navigate, onAddToCart }: { navigate: (p: Page) => void; onAddToCart: (p: Product) => void }) {
  const categories = [
    { name: 'Strategy', emoji: '♟', color: 'bg-violet-50 border-violet-200' },
    { name: 'Party', emoji: '🎉', color: 'bg-pink-50 border-pink-200' },
    { name: 'Family', emoji: '👨‍👩‍👧', color: 'bg-amber-50 border-amber-200' },
    { name: 'Cooperative', emoji: '🤝', color: 'bg-teal-50 border-teal-200' },
    { name: 'Card Games', emoji: '🃏', color: 'bg-blue-50 border-blue-200' },
    { name: 'Abstract', emoji: '⬡', color: 'bg-indigo-50 border-indigo-200' },
    { name: 'Adventure', emoji: '⚔️', color: 'bg-orange-50 border-orange-200' },
    { name: 'Expert', emoji: '🧠', color: 'bg-red-50 border-red-200' },
  ]
  const featured = PRODUCTS.slice(0, 4)

  return (
    <div>
      {/* Hero */}
      <section className="relative h-[92vh] min-h-[600px] flex items-center overflow-hidden bg-[#F5F5F7]">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=1600&h=900&fit=crop&auto=format"
            alt="People enjoying board games"
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/60 to-transparent" />
        </div>
        <div className="relative max-w-6xl mx-auto px-6 w-full">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 bg-[#0071E3]/10 text-[#0071E3] text-sm font-medium px-4 py-2 rounded-full mb-6">
              <span className="w-2 h-2 bg-[#0071E3] rounded-full animate-pulse" />
              New arrivals every week
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-[#1D1D1F] leading-tight tracking-tight mb-5">
              Find your next<br />favorite game.
            </h1>
            <p className="text-lg text-[#6E6E73] mb-8 leading-relaxed">
              Discover strategy games, party games, family games, and more — or reserve a table and play with friends at our store.
            </p>
            <div className="flex flex-wrap gap-3">
              <Btn variant="primary" onClick={() => navigate('shop')} className="px-7 py-3 text-base">
                Shop Board Games
              </Btn>
              <Btn variant="secondary" onClick={() => navigate('reserve')} className="px-7 py-3 text-base">
                Reserve a Table
              </Btn>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 max-w-6xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-[#1D1D1F] mb-2">What do you feel like playing?</h2>
        <p className="text-[#6E6E73] mb-10">Browse games by type and find your perfect match.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {categories.map(c => (
            <button key={c.name} onClick={() => navigate('shop')}
              className={`${c.color} border rounded-2xl p-5 flex items-center gap-3 hover:-translate-y-0.5 hover:shadow-md transition-all text-left`}>
              <span className="text-2xl">{c.emoji}</span>
              <span className="font-semibold text-[#1D1D1F]">{c.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Popular Games */}
      <section className="py-20 bg-[#F5F5F7]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold text-[#1D1D1F]">Popular right now</h2>
              <p className="text-[#6E6E73] mt-1">Bestselling games our customers love</p>
            </div>
            <Btn variant="ghost" onClick={() => navigate('shop')} className="px-4 py-2 text-sm hidden sm:flex">
              View all →
            </Btn>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featured.map(p => (
              <ProductCard key={p.id} product={p} onView={() => navigate('product')} onAddToCart={() => onAddToCart(p)} />
            ))}
          </div>
        </div>
      </section>

      {/* Reserve CTA */}
      <section className="py-24 max-w-6xl mx-auto px-6">
        <div className="relative bg-[#1D1D1F] rounded-3xl overflow-hidden p-12 flex flex-col md:flex-row items-center gap-10">
          <img src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=400&fit=crop&auto=format"
            alt="Board game café" className="absolute inset-0 w-full h-full object-cover opacity-25" />
          <div className="relative flex-1">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Play at our store.</h2>
            <p className="text-white/70 text-lg">Reserve a table and enjoy a premium board game session with your friends. 15+ tables, 500+ games available.</p>
          </div>
          <div className="relative flex flex-col gap-3">
            <Btn variant="primary" onClick={() => navigate('reserve')} className="px-8 py-3 text-base whitespace-nowrap">
              Reserve a Table
            </Btn>
            <Btn variant="ghost" onClick={() => navigate('visit-store')} className="px-8 py-3 text-base text-white hover:bg-white/10 whitespace-nowrap">
              Visit Store Info
            </Btn>
          </div>
        </div>
      </section>

      {/* More Games */}
      <section className="py-20 bg-[#F5F5F7]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-end justify-between mb-10">
            <h2 className="text-3xl font-bold text-[#1D1D1F]">New arrivals</h2>
            <Btn variant="ghost" onClick={() => navigate('shop')} className="px-4 py-2 text-sm hidden sm:flex">View all →</Btn>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PRODUCTS.slice(4).map(p => (
              <ProductCard key={p.id} product={p} onView={() => navigate('product')} onAddToCart={() => onAddToCart(p)} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#D2D2D7] py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="font-bold text-lg flex items-center gap-2"><span>♟</span> Boardly</div>
            <p className="text-sm text-[#6E6E73]">© 2026 Boardly Board Game Store. Bangkok, Thailand.</p>
            <div className="flex gap-6 text-sm text-[#6E6E73]">
              <button className="hover:text-[#1D1D1F] transition-colors">Privacy</button>
              <button className="hover:text-[#1D1D1F] transition-colors">Terms</button>
              <button className="hover:text-[#1D1D1F] transition-colors">Contact</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ===================== SHOP PAGE =====================

function ShopPage({ navigate, onAddToCart }: { navigate: (p: Page) => void; onAddToCart: (p: Product) => void }) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [sort, setSort] = useState('Featured')
  const [difficulty, setDifficulty] = useState<string | null>(null)
  const [priceMax, setPriceMax] = useState(5000)
  const categories = ['Strategy', 'Party', 'Family', 'Cooperative', 'Abstract', 'Adventure']
  const difficulties = ['Easy', 'Medium', 'Advanced', 'Expert']

  let filtered = PRODUCTS
  if (activeCategory) filtered = filtered.filter(p => p.category === activeCategory)
  if (difficulty) filtered = filtered.filter(p => p.difficulty === difficulty)
  filtered = filtered.filter(p => p.price <= priceMax)
  if (sort === 'Price: Low to High') filtered = [...filtered].sort((a, b) => a.price - b.price)
  if (sort === 'Price: High to Low') filtered = [...filtered].sort((a, b) => b.price - a.price)
  if (sort === 'Best Rated') filtered = [...filtered].sort((a, b) => b.rating - a.rating)

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 flex gap-8">
      {/* Sidebar */}
      <aside className="hidden md:block w-56 flex-shrink-0">
        <div className="sticky top-20 space-y-8">
          <div>
            <h3 className="font-semibold text-[#1D1D1F] mb-3 text-sm uppercase tracking-wide">Category</h3>
            <div className="space-y-2">
              <button onClick={() => setActiveCategory(null)}
                className={`block w-full text-left text-sm py-1.5 px-3 rounded-lg transition-colors ${!activeCategory ? 'bg-[#0071E3]/10 text-[#0071E3] font-medium' : 'text-[#6E6E73] hover:text-[#1D1D1F]'}`}>
                All Games
              </button>
              {categories.map(c => (
                <button key={c} onClick={() => setActiveCategory(c === activeCategory ? null : c)}
                  className={`block w-full text-left text-sm py-1.5 px-3 rounded-lg transition-colors ${activeCategory === c ? 'bg-[#0071E3]/10 text-[#0071E3] font-medium' : 'text-[#6E6E73] hover:text-[#1D1D1F]'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-[#1D1D1F] mb-3 text-sm uppercase tracking-wide">Difficulty</h3>
            <div className="space-y-2">
              {difficulties.map(d => (
                <button key={d} onClick={() => setDifficulty(d === difficulty ? null : d)}
                  className={`block w-full text-left text-sm py-1.5 px-3 rounded-lg transition-colors ${difficulty === d ? 'bg-[#0071E3]/10 text-[#0071E3] font-medium' : 'text-[#6E6E73] hover:text-[#1D1D1F]'}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-[#1D1D1F] mb-3 text-sm uppercase tracking-wide">
              Price up to {fmt(priceMax)}
            </h3>
            <input type="range" min={500} max={5000} step={100} value={priceMax}
              onChange={e => setPriceMax(Number(e.target.value))}
              className="w-full accent-[#0071E3]" />
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#1D1D1F]">Board Games <span className="text-[#6E6E73] font-normal text-lg">({filtered.length})</span></h1>
          <select value={sort} onChange={e => setSort(e.target.value)}
            className="text-sm border border-[#D2D2D7] rounded-xl px-4 py-2 bg-white text-[#1D1D1F] outline-none focus:border-[#0071E3]">
            {['Featured', 'Price: Low to High', 'Price: High to Low', 'Best Rated', 'Newest'].map(s => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-24 text-[#6E6E73]">
            <div className="text-5xl mb-4">🎲</div>
            <div className="font-medium">No games match your filters</div>
            <Btn variant="ghost" onClick={() => { setActiveCategory(null); setDifficulty(null); setPriceMax(5000) }} className="mt-4 px-4 py-2 text-sm">Clear filters</Btn>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(p => (
              <ProductCard key={p.id} product={p} onView={() => navigate('product')} onAddToCart={() => onAddToCart(p)} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

// ===================== PRODUCT PAGE =====================

function ProductPage({ navigate, onAddToCart }: { navigate: (p: Page) => void; onAddToCart: (p: Product) => void }) {
  const product = PRODUCTS[0]
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [activeTab, setActiveTab] = useState('about')

  const handleAdd = () => {
    onAddToCart(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#6E6E73] mb-8">
        <button onClick={() => navigate('home')} className="hover:text-[#0071E3]">Home</button>
        <span>/</span>
        <button onClick={() => navigate('shop')} className="hover:text-[#0071E3]">Shop</button>
        <span>/</span>
        <span className="text-[#1D1D1F]">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="aspect-square rounded-3xl overflow-hidden bg-[#F5F5F7]">
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {PRODUCTS.slice(0, 4).map((p, i) => (
              <div key={i} className={`aspect-square rounded-xl overflow-hidden bg-[#F5F5F7] cursor-pointer border-2 transition-colors ${i === 0 ? 'border-[#0071E3]' : 'border-transparent'}`}>
                <img src={p.image} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div>
          <span className="text-sm text-[#6E6E73]">{product.category}</span>
          <h1 className="text-3xl font-bold text-[#1D1D1F] mt-1 mb-2">{product.name}</h1>
          <Stars r={product.rating} n={product.reviewCount} />

          <div className="mt-4 flex items-center gap-3">
            <span className="text-3xl font-bold text-[#1D1D1F]">{fmt(product.price)}</span>
            <StockBadge s={product.stock} />
          </div>

          {/* Game Info Grid */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            {[
              { label: 'Players', value: product.players },
              { label: 'Play Time', value: product.playTime },
              { label: 'Age', value: product.age },
              { label: 'Difficulty', value: product.difficulty },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[#F5F5F7] rounded-xl p-3">
                <div className="text-xs text-[#6E6E73] mb-0.5">{label}</div>
                <div className="font-semibold text-[#1D1D1F] text-sm">{value}</div>
              </div>
            ))}
          </div>

          {/* Qty & Add */}
          <div className="mt-8 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-[#D2D2D7] rounded-xl overflow-hidden">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} className="px-4 py-3 hover:bg-[#F5F5F7] transition-colors text-lg">−</button>
                <span className="px-4 font-semibold text-[#1D1D1F]">{qty}</span>
                <button onClick={() => setQty(q => q + 1)} className="px-4 py-3 hover:bg-[#F5F5F7] transition-colors text-lg">+</button>
              </div>
            </div>
            <Btn variant="primary" onClick={handleAdd} className="w-full py-3.5 text-base">
              {added ? '✓ Added to Cart' : 'Add to Cart'}
            </Btn>
            <Btn variant="secondary" onClick={() => navigate('cart')} className="w-full py-3.5 text-base">
              View Cart
            </Btn>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#D2D2D7] mb-8">
        <div className="flex gap-8">
          {['about', 'details', 'reviews'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`pb-3 text-sm font-medium capitalize transition-colors border-b-2 ${activeTab === t ? 'border-[#0071E3] text-[#0071E3]' : 'border-transparent text-[#6E6E73] hover:text-[#1D1D1F]'}`}>
              {t === 'about' ? 'About This Game' : t === 'details' ? 'Game Details' : 'Reviews'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'about' && (
        <div className="max-w-2xl">
          <p className="text-[#1D1D1F] leading-relaxed">{product.description}</p>
          <p className="text-[#6E6E73] mt-4 leading-relaxed">Wingspan has won the prestigious Kennerspiel des Jahres award and multiple other board game awards. It is widely regarded as one of the best games of the decade.</p>
        </div>
      )}
      {activeTab === 'details' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl">
          {[
            { label: 'Players', value: product.players },
            { label: 'Play Time', value: product.playTime },
            { label: 'Recommended Age', value: product.age },
            { label: 'Difficulty', value: product.difficulty },
            { label: 'Publisher', value: 'Stonemaier Games' },
            { label: 'Designer', value: 'Elizabeth Hargrave' },
            { label: 'Language', value: 'English / Thai' },
            { label: 'SKU', value: 'SG-WING-EN' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#F5F5F7] rounded-xl p-3">
              <div className="text-xs text-[#6E6E73] mb-1">{label}</div>
              <div className="text-sm font-semibold text-[#1D1D1F]">{value}</div>
            </div>
          ))}
        </div>
      )}
      {activeTab === 'reviews' && (
        <div className="max-w-2xl space-y-6">
          {[
            { name: 'Mint P.', date: '12 Aug 2026', rating: 5, text: 'Absolutely beautiful game. The artwork is stunning and the gameplay is engaging. Worth every baht.' },
            { name: 'James W.', date: '8 Aug 2026', rating: 5, text: 'Played this at the store first before buying. The staff helped us learn the rules. Now one of my all-time favorites.' },
            { name: 'Arisa K.', date: '3 Aug 2026', rating: 4, text: 'Great game, slightly complex at first but becomes very intuitive after a few rounds. Highly recommend.' },
          ].map(r => (
            <div key={r.name} className="border border-[#D2D2D7] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-[#1D1D1F]">{r.name}</div>
                <div className="text-xs text-[#6E6E73]">{r.date}</div>
              </div>
              <Stars r={r.rating} n={0} />
              <p className="mt-3 text-sm text-[#1D1D1F] leading-relaxed">{r.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Try Before Buy */}
      <div className="mt-16 bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-200 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-6">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-[#1D1D1F] mb-2">Want to try it before buying?</h3>
          <p className="text-[#6E6E73]">Reserve a table at our store and enjoy a board game session with friends. Wingspan is available to play in-store.</p>
        </div>
        <Btn variant="primary" onClick={() => navigate('reserve')} className="px-7 py-3 whitespace-nowrap">
          Reserve a Table
        </Btn>
      </div>

      {/* You may also like */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-[#1D1D1F] mb-6">You may also like</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {PRODUCTS.slice(1, 5).map(p => (
            <ProductCard key={p.id} product={p} onView={() => navigate('product')} onAddToCart={() => onAddToCart(p)} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ===================== CART PAGE =====================

function CartPage({ cart, navigate, onUpdate, onRemove }: {
  cart: CartItem[]; navigate: (p: Page) => void
  onUpdate: (id: string, qty: number) => void; onRemove: (id: string) => void
}) {
  const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0)
  const shipping = subtotal > 2000 ? 0 : 80

  if (cart.length === 0) return (
    <div className="max-w-6xl mx-auto px-6 py-20 text-center">
      <div className="text-6xl mb-4">🛒</div>
      <h2 className="text-2xl font-bold text-[#1D1D1F] mb-2">Your cart is empty</h2>
      <p className="text-[#6E6E73] mb-8">Discover board games you'll love.</p>
      <Btn variant="primary" onClick={() => navigate('shop')} className="px-8 py-3">Shop Board Games</Btn>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-[#1D1D1F] mb-8">Your Cart</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.map(item => (
            <div key={item.product.id} className="flex gap-4 bg-white border border-[#D2D2D7] rounded-2xl p-4">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#F5F5F7] flex-shrink-0">
                <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[#1D1D1F]">{item.product.name}</div>
                <div className="text-sm text-[#6E6E73] mt-0.5">{item.product.category} · {item.product.players} players</div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center border border-[#D2D2D7] rounded-xl overflow-hidden">
                    <button onClick={() => item.quantity > 1 ? onUpdate(item.product.id, item.quantity - 1) : onRemove(item.product.id)}
                      className="px-3 py-1.5 hover:bg-[#F5F5F7] text-lg transition-colors">−</button>
                    <span className="px-3 text-sm font-semibold">{item.quantity}</span>
                    <button onClick={() => onUpdate(item.product.id, item.quantity + 1)}
                      className="px-3 py-1.5 hover:bg-[#F5F5F7] text-lg transition-colors">+</button>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-[#1D1D1F]">{fmt(item.product.price * item.quantity)}</span>
                    <button onClick={() => onRemove(item.product.id)} className="text-[#6E6E73] hover:text-red-500 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <Btn variant="ghost" onClick={() => navigate('shop')} className="px-4 py-2 text-sm mt-2">
            ← Continue Shopping
          </Btn>
        </div>

        {/* Summary */}
        <div className="bg-[#F5F5F7] rounded-2xl p-6 h-fit">
          <h3 className="font-bold text-[#1D1D1F] text-lg mb-5">Order Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-[#6E6E73]">
              <span>Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} items)</span>
              <span>{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[#6E6E73]">
              <span>Shipping</span>
              <span>{shipping === 0 ? 'Free' : fmt(shipping)}</span>
            </div>
            {shipping === 0 && <div className="text-xs text-green-600 font-medium">Free shipping on orders over ฿2,000</div>}
            <div className="border-t border-[#D2D2D7] pt-3 flex justify-between font-bold text-[#1D1D1F] text-base">
              <span>Total</span>
              <span>{fmt(subtotal + shipping)}</span>
            </div>
          </div>
          <Btn variant="primary" onClick={() => navigate('checkout')} className="w-full py-3.5 text-base mt-6">
            Proceed to Checkout
          </Btn>
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-[#6E6E73]">
            <span>🔒 Secure checkout</span>
            <span>·</span>
            <span>Free returns</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ===================== CHECKOUT PAGE =====================

function CheckoutPage({ cart, navigate }: { cart: CartItem[]; navigate: (p: Page) => void }) {
  const [step, setStep] = useState(1)
  const [delivery, setDelivery] = useState('Standard Delivery')
  const [payment, setPayment] = useState('Credit / Debit Card')
  const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0)
  const shipping = delivery === 'Pick Up at Store' ? 0 : delivery === 'Express Delivery' ? 120 : 80
  const total = subtotal + shipping

  const steps = ['Information', 'Delivery', 'Payment']

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-[#1D1D1F] mb-8">Checkout</h1>

      {/* Progress */}
      <div className="flex items-center gap-0 mb-10">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center">
            <div className={`flex items-center gap-2 ${i < step - 1 ? 'text-[#0071E3]' : i === step - 1 ? 'text-[#1D1D1F]' : 'text-[#6E6E73]'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${i < step - 1 ? 'bg-[#0071E3] border-[#0071E3] text-white' : i === step - 1 ? 'border-[#1D1D1F] text-[#1D1D1F]' : 'border-[#D2D2D7] text-[#6E6E73]'}`}>
                {i < step - 1 ? '✓' : i + 1}
              </div>
              <span className="text-sm font-medium hidden sm:block">{s}</span>
            </div>
            {i < steps.length - 1 && <div className={`h-0.5 w-10 sm:w-16 mx-2 ${i < step - 1 ? 'bg-[#0071E3]' : 'bg-[#D2D2D7]'}`} />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2">
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-[#1D1D1F]">Contact Information</h2>
              <div className="grid grid-cols-2 gap-4">
                {[['First Name', 'Apinya'], ['Last Name', 'Wongsak']].map(([label, placeholder]) => (
                  <div key={label}>
                    <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">{label}</label>
                    <input defaultValue={placeholder} className="w-full border border-[#D2D2D7] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0071E3] transition-colors" />
                  </div>
                ))}
              </div>
              {[['Email', 'apinya@example.com', 'email'], ['Phone', '081-234-5678', 'tel']].map(([label, ph, type]) => (
                <div key={label}>
                  <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">{label}</label>
                  <input type={type} defaultValue={ph} className="w-full border border-[#D2D2D7] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0071E3] transition-colors" />
                </div>
              ))}
              <h2 className="text-lg font-semibold text-[#1D1D1F] pt-2">Shipping Address</h2>
              <div>
                <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">Address</label>
                <input defaultValue="123 Sukhumvit Road" className="w-full border border-[#D2D2D7] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0071E3] transition-colors" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[['District', 'Watthana'], ['Province', 'Bangkok'], ['Postal Code', '10110']].map(([label, val]) => (
                  <div key={label}>
                    <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">{label}</label>
                    <input defaultValue={val} className="w-full border border-[#D2D2D7] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0071E3] transition-colors" />
                  </div>
                ))}
              </div>
              <Btn variant="primary" onClick={() => setStep(2)} className="w-full py-3.5 text-base mt-2">Continue to Delivery</Btn>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-[#1D1D1F]">Delivery Method</h2>
              {[
                { label: 'Standard Delivery', sub: '3-5 business days', price: '฿80' },
                { label: 'Express Delivery', sub: '1-2 business days', price: '฿120' },
                { label: 'Pick Up at Store', sub: 'Ready within 2 hours · Free', price: 'Free' },
              ].map(opt => (
                <button key={opt.label} onClick={() => setDelivery(opt.label)}
                  className={`w-full text-left flex items-center justify-between p-4 rounded-2xl border-2 transition-colors ${delivery === opt.label ? 'border-[#0071E3] bg-blue-50' : 'border-[#D2D2D7] hover:border-gray-400'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${delivery === opt.label ? 'border-[#0071E3]' : 'border-[#D2D2D7]'}`}>
                      {delivery === opt.label && <div className="w-2.5 h-2.5 bg-[#0071E3] rounded-full" />}
                    </div>
                    <div>
                      <div className="font-semibold text-[#1D1D1F] text-sm">{opt.label}</div>
                      <div className="text-xs text-[#6E6E73]">{opt.sub}</div>
                    </div>
                  </div>
                  <span className="font-semibold text-[#1D1D1F] text-sm">{opt.price}</span>
                </button>
              ))}
              {delivery === 'Pick Up at Store' && (
                <div className="bg-[#F5F5F7] rounded-2xl p-4 mt-2">
                  <div className="font-semibold text-[#1D1D1F] mb-1">Boardly Store</div>
                  <div className="text-sm text-[#6E6E73]">123 Ekkamai Road, Watthana, Bangkok 10110</div>
                  <div className="text-sm text-[#6E6E73] mt-1">Mon–Sun 10:00–22:00</div>
                  <div className="text-sm text-green-600 font-medium mt-2">We'll notify you when your order is ready.</div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <Btn variant="secondary" onClick={() => setStep(1)} className="px-6 py-3">Back</Btn>
                <Btn variant="primary" onClick={() => setStep(3)} className="flex-1 py-3">Continue to Payment</Btn>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-[#1D1D1F]">Payment Method</h2>
              {[
                { label: 'Credit / Debit Card', icon: '💳' },
                { label: 'QR Payment (PromptPay)', icon: '📱' },
                { label: 'Bank Transfer', icon: '🏦' },
              ].map(opt => (
                <button key={opt.label} onClick={() => setPayment(opt.label)}
                  className={`w-full text-left flex items-center gap-3 p-4 rounded-2xl border-2 transition-colors ${payment === opt.label ? 'border-[#0071E3] bg-blue-50' : 'border-[#D2D2D7] hover:border-gray-400'}`}>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${payment === opt.label ? 'border-[#0071E3]' : 'border-[#D2D2D7]'}`}>
                    {payment === opt.label && <div className="w-2.5 h-2.5 bg-[#0071E3] rounded-full" />}
                  </div>
                  <span className="text-lg">{opt.icon}</span>
                  <span className="font-semibold text-[#1D1D1F] text-sm">{opt.label}</span>
                </button>
              ))}
              {payment === 'Credit / Debit Card' && (
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">Card Number</label>
                    <input placeholder="1234 5678 9012 3456" className="w-full border border-[#D2D2D7] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0071E3] font-mono" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">Expiry Date</label>
                      <input placeholder="MM / YY" className="w-full border border-[#D2D2D7] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0071E3] font-mono" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">CVV</label>
                      <input placeholder="123" className="w-full border border-[#D2D2D7] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0071E3] font-mono" />
                    </div>
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <Btn variant="secondary" onClick={() => setStep(2)} className="px-6 py-3">Back</Btn>
                <Btn variant="primary" onClick={() => navigate('order-confirm')} className="flex-1 py-3">
                  Place Order · {fmt(total)}
                </Btn>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="bg-[#F5F5F7] rounded-2xl p-5 h-fit">
          <h3 className="font-bold text-[#1D1D1F] mb-4">Order ({cart.reduce((s, i) => s + i.quantity, 0)} items)</h3>
          <div className="space-y-3 mb-4">
            {cart.map(item => (
              <div key={item.product.id} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-white flex-shrink-0">
                  <img src={item.product.image} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#1D1D1F] truncate">{item.product.name}</div>
                  <div className="text-xs text-[#6E6E73]">× {item.quantity}</div>
                </div>
                <div className="text-sm font-semibold">{fmt(item.product.price * item.quantity)}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-[#D2D2D7] pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-[#6E6E73]">
              <span>Subtotal</span><span>{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[#6E6E73]">
              <span>Shipping</span><span>{shipping === 0 ? 'Free' : fmt(shipping)}</span>
            </div>
            <div className="flex justify-between font-bold text-[#1D1D1F] text-base pt-1">
              <span>Total</span><span>{fmt(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ===================== ORDER CONFIRM =====================

function OrderConfirmPage({ navigate }: { navigate: (p: Page) => void }) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-20 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-[#1D1D1F] mb-2">Order Confirmed!</h1>
      <p className="text-[#6E6E73] mb-8">Thank you for your purchase. We'll prepare your games right away.</p>

      <div className="bg-[#F5F5F7] rounded-2xl p-6 text-left mb-8">
        <div className="flex items-center justify-between mb-4">
          <span className="font-semibold text-[#1D1D1F]">Order #BG10248</span>
          <span className="text-xs bg-amber-100 text-amber-700 font-medium px-2.5 py-1 rounded-full">Preparing</span>
        </div>
        <div className="space-y-3 text-sm text-[#6E6E73]">
          <div className="flex justify-between"><span>Wingspan × 1</span><span className="font-medium text-[#1D1D1F]">฿1,890</span></div>
          <div className="flex justify-between"><span>Shipping (Standard)</span><span className="font-medium text-[#1D1D1F]">฿80</span></div>
          <div className="flex justify-between font-bold text-[#1D1D1F] text-base border-t border-[#D2D2D7] pt-3">
            <span>Total</span><span>฿1,970</span>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-[#D2D2D7] text-sm text-[#6E6E73]">
          <div>Estimated delivery: <span className="font-medium text-[#1D1D1F]">18–20 August 2026</span></div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Btn variant="secondary" onClick={() => navigate('my-orders')} className="flex-1 py-3">View My Orders</Btn>
        <Btn variant="primary" onClick={() => navigate('reserve')} className="flex-1 py-3">Want to Play It? Reserve a Table →</Btn>
      </div>
    </div>
  )
}

// ===================== RESERVE PAGE (Multi-step) =====================

function ReservePage({ navigate, initialBranchId }: { navigate: (p: Page) => void; initialBranchId?: string | null }) {
  const [flow, setFlow] = useState<ReservationFlow>({
    step: initialBranchId ? 2 : 1, branchId: initialBranchId ?? null, date: '', time: '', duration: 2, players: 4, tableId: null
  })
  const [hoveredTable, setHoveredTable] = useState<string | null>(null)

  const today = new Date()
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() + i)
    return d
  })

  const stepLabels = ['Branch', 'Date', 'Time', 'Players', 'Table', 'Confirm']
  const selectedBranch = BRANCHES.find(b => b.id === flow.branchId)

  const update = (partial: Partial<ReservationFlow>) => setFlow(f => ({ ...f, ...partial }))
  const next = () => update({ step: flow.step + 1 })
  const back = () => update({ step: flow.step - 1 })

  const selectedTable = TABLES.find(t => t.id === flow.tableId)
  const feePerHour = 60
  const estimatedFee = flow.duration * feePerHour * (flow.players > 4 ? 1.2 : 1)

  const tableStatusConfig = {
    available: { bg: 'bg-green-50', border: 'border-green-400', dot: 'bg-green-500', label: 'Available' },
    reserved: { bg: 'bg-orange-50', border: 'border-orange-400', dot: 'bg-orange-500', label: 'Reserved' },
    occupied: { bg: 'bg-red-50', border: 'border-red-400', dot: 'bg-red-500', label: 'Occupied' },
    unavailable: { bg: 'bg-gray-100', border: 'border-gray-300', dot: 'bg-gray-400', label: 'Unavailable' },
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-[#1D1D1F] mb-2">Reserve a Table</h1>
      <p className="text-[#6E6E73] mb-8">Book your seat for the perfect game night</p>

      {/* Progress */}
      <div className="flex items-center gap-1 mb-10">
        {stepLabels.map((s, i) => (
          <div key={s} className="flex items-center">
            <div className={`flex items-center gap-1.5 text-sm font-medium ${i + 1 < flow.step ? 'text-[#0071E3]' : i + 1 === flow.step ? 'text-[#1D1D1F]' : 'text-[#6E6E73]'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${i + 1 < flow.step ? 'bg-[#0071E3] border-[#0071E3] text-white' : i + 1 === flow.step ? 'border-[#1D1D1F]' : 'border-[#D2D2D7]'}`}>
                {i + 1 < flow.step ? '✓' : i + 1}
              </div>
              <span className="hidden sm:block">{s}</span>
            </div>
            {i < stepLabels.length - 1 && <div className={`h-0.5 w-6 sm:w-10 mx-1 ${i + 1 < flow.step ? 'bg-[#0071E3]' : 'bg-[#D2D2D7]'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Branch */}
      {flow.step === 1 && (
        <div className="max-w-md">
          <h2 className="text-xl font-bold text-[#1D1D1F] mb-1">Which branch do you want to visit?</h2>
          <p className="text-[#6E6E73] mb-6">Choose a Boardly location near you.</p>
          <BranchSearchDropdown value={flow.branchId} onChange={id => update({ branchId: id })} onlyActive />
          {selectedBranch && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <div className="font-semibold text-[#1D1D1F] mb-1">{selectedBranch.name}</div>
              <div className="text-sm text-[#6E6E73] space-y-0.5">
                <div>📍 {selectedBranch.address}, {selectedBranch.district}</div>
                <div>🕐 {selectedBranch.hours}</div>
                <div>🪑 {selectedBranch.tables} tables available</div>
              </div>
            </div>
          )}
          <div className="mt-8">
            <Btn variant="primary" onClick={next} disabled={!flow.branchId} className="px-8 py-3">
              Continue →
            </Btn>
          </div>
        </div>
      )}

      {/* Step 2: Date */}
      {flow.step === 2 && (
        <div>
          <h2 className="text-xl font-bold text-[#1D1D1F] mb-6">When do you want to play?</h2>
          <div className="flex flex-wrap gap-2 mb-6">
            {['Today', 'Tomorrow', 'This Weekend'].map(q => (
              <button key={q} onClick={() => {
                const d = new Date(); if (q === 'Tomorrow') d.setDate(d.getDate() + 1); if (q === 'This Weekend') d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
                update({ date: d.toDateString() })
              }} className={`px-5 py-2 rounded-xl border-2 text-sm font-medium transition-colors ${flow.date === (q === 'Today' ? new Date().toDateString() : q === 'Tomorrow' ? new Date(Date.now() + 86400000).toDateString() : '') ? 'border-[#0071E3] bg-blue-50 text-[#0071E3]' : 'border-[#D2D2D7] text-[#1D1D1F] hover:border-gray-400'}`}>
                {q}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-8">
            {days.map((d, i) => {
              const ds = d.toDateString()
              const isSelected = flow.date === ds
              return (
                <button key={i} onClick={() => update({ date: ds })}
                  className={`flex flex-col items-center py-3 px-2 rounded-xl border-2 transition-colors ${isSelected ? 'border-[#0071E3] bg-blue-50' : 'border-[#D2D2D7] hover:border-gray-400'}`}>
                  <span className="text-xs text-[#6E6E73]">{d.toLocaleDateString('en', { weekday: 'short' })}</span>
                  <span className={`text-lg font-bold mt-0.5 ${isSelected ? 'text-[#0071E3]' : 'text-[#1D1D1F]'}`}>{d.getDate()}</span>
                  <span className="text-xs text-[#6E6E73]">{d.toLocaleDateString('en', { month: 'short' })}</span>
                </button>
              )
            })}
          </div>
          <Btn variant="primary" onClick={next} disabled={!flow.date} className="px-8 py-3">
            Continue →
          </Btn>
        </div>
      )}

      {/* Step 3: Time */}
      {flow.step === 3 && (
        <div>
          <h2 className="text-xl font-bold text-[#1D1D1F] mb-1">Select a time</h2>
          <p className="text-[#6E6E73] mb-6">{flow.date}</p>
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-[#1D1D1F] mb-3">Start Time</h3>
            <div className="grid grid-cols-5 gap-2">
              {TIME_SLOTS.map(t => {
                const disabled = DISABLED_TIMES.includes(t)
                const selected = flow.time === t
                return (
                  <button key={t} onClick={() => !disabled && update({ time: t })} disabled={disabled}
                    className={`py-2.5 rounded-xl text-sm font-medium border-2 transition-colors ${disabled ? 'border-[#D2D2D7] text-[#6E6E73]/50 bg-gray-50 cursor-not-allowed line-through' : selected ? 'border-[#0071E3] bg-blue-50 text-[#0071E3]' : 'border-[#D2D2D7] text-[#1D1D1F] hover:border-gray-400'}`}>
                    {t}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-[#1D1D1F] mb-3">Duration</h3>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4].map(h => (
                <button key={h} onClick={() => update({ duration: h })}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors ${flow.duration === h ? 'border-[#0071E3] bg-blue-50 text-[#0071E3]' : 'border-[#D2D2D7] text-[#1D1D1F] hover:border-gray-400'}`}>
                  {h} hour{h > 1 ? 's' : ''}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <Btn variant="secondary" onClick={back} className="px-6 py-3">Back</Btn>
            <Btn variant="primary" onClick={next} disabled={!flow.time} className="px-8 py-3">Continue →</Btn>
          </div>
        </div>
      )}

      {/* Step 4: Players */}
      {flow.step === 4 && (
        <div>
          <h2 className="text-xl font-bold text-[#1D1D1F] mb-1">How many players?</h2>
          <p className="text-[#6E6E73] mb-10">We'll suggest the best tables based on your group size.</p>
          <div className="flex flex-col items-center py-10">
            <div className="flex items-center gap-6">
              <button onClick={() => update({ players: Math.max(1, flow.players - 1) })}
                className="w-14 h-14 rounded-full border-2 border-[#D2D2D7] flex items-center justify-center text-2xl font-bold text-[#1D1D1F] hover:border-[#0071E3] hover:bg-blue-50 transition-colors">
                −
              </button>
              <div className="text-center">
                <div className="text-7xl font-bold text-[#1D1D1F]">{flow.players}</div>
                <div className="text-[#6E6E73] mt-1 text-sm">players</div>
              </div>
              <button onClick={() => update({ players: Math.min(8, flow.players + 1) })}
                className="w-14 h-14 rounded-full border-2 border-[#D2D2D7] flex items-center justify-center text-2xl font-bold text-[#1D1D1F] hover:border-[#0071E3] hover:bg-blue-50 transition-colors">
                +
              </button>
            </div>
            <div className="mt-8 text-sm text-[#6E6E73]">
              {flow.players <= 4 ? 'Small or medium tables recommended' : flow.players <= 6 ? 'Medium or large tables recommended' : 'Large corner tables recommended'}
            </div>
          </div>
          <div className="flex gap-3">
            <Btn variant="secondary" onClick={back} className="px-6 py-3">Back</Btn>
            <Btn variant="primary" onClick={next} className="px-8 py-3">Choose Your Table →</Btn>
          </div>
        </div>
      )}

      {/* Step 5: Table Selection */}
      {flow.step === 5 && (
        <div>
          <h2 className="text-xl font-bold text-[#1D1D1F] mb-1">Select your table</h2>
          <p className="text-[#6E6E73] mb-6">
            {selectedBranch?.name} · {flow.date} · {flow.time} · {flow.duration}h · {flow.players} players
          </p>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-6 text-xs font-medium">
            {Object.entries(tableStatusConfig).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-full ${v.dot}`} />
                <span className="text-[#6E6E73]">{v.label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-[#6E6E73]">Selected</span>
            </div>
          </div>

          <div className="flex gap-6">
            {/* Floor Plan */}
            <div className="flex-1 bg-[#F5F5F7] rounded-2xl p-6 min-h-[380px]">
              {/* Window */}
              <div className="mb-6">
                <div className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>🪟</span> Window Area <span className="text-[10px] font-normal normal-case">(2–4 players)</span>
                </div>
                <div className="flex gap-3">
                  {TABLES.filter(t => t.zone === 'Window').map(t => {
                    const isSelected = flow.tableId === t.id
                    const isSuggested = t.status === 'available' && flow.players >= t.minPlayers && flow.players <= t.maxPlayers
                    const cfg = isSelected
                      ? { bg: 'bg-blue-50', border: 'border-blue-500 border-2', text: 'text-blue-700', dot: 'bg-blue-500' }
                      : { ...tableStatusConfig[t.status], border: `border ${tableStatusConfig[t.status].border}` }
                    return (
                      <div key={t.id} className="relative">
                        <button
                          onClick={() => t.status === 'available' && update({ tableId: t.id })}
                          onMouseEnter={() => setHoveredTable(t.id)}
                          onMouseLeave={() => setHoveredTable(null)}
                          disabled={t.status !== 'available'}
                          className={`w-20 h-16 rounded-xl ${cfg.border} ${cfg.bg} flex flex-col items-center justify-center gap-1
                            transition-all duration-150
                            ${t.status === 'available' ? 'cursor-pointer hover:scale-105 hover:shadow-md' : 'cursor-not-allowed opacity-70'}
                            ${isSelected ? 'scale-105 shadow-md' : ''}
                            ${isSuggested && !isSelected ? 'ring-2 ring-green-400 ring-offset-1' : ''}`}>
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                            <span className={`text-sm font-bold ${cfg.text}`}>{t.id}</span>
                          </div>
                          <span className={`text-[10px] ${cfg.text} opacity-80`}>{t.capacity}p</span>
                        </button>
                        {hoveredTable === t.id && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 bg-white rounded-xl shadow-xl border border-gray-100 p-3 w-44 text-left pointer-events-none">
                            <div className="font-semibold text-[#1D1D1F] mb-1 text-sm">Table {t.id}</div>
                            <div className="space-y-1 text-xs text-[#6E6E73]">
                              <div>{t.capacity} Players · {t.zone} Area</div>
                              <div className="flex items-center gap-1"><div className={`w-1.5 h-1.5 rounded-full ${tableStatusConfig[t.status].dot}`} /><span>{tableStatusConfig[t.status].label}</span></div>
                              {t.features.map(f => <div key={f}>✓ {f}</div>)}
                            </div>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Main */}
              <div className="mb-6">
                <div className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>🎲</span> Main Area <span className="text-[10px] font-normal normal-case">(4–6 players)</span>
                </div>
                <div className="flex gap-3 flex-wrap">
                  {TABLES.filter(t => t.zone === 'Main').map(t => {
                    const isSelected = flow.tableId === t.id
                    const isSuggested = t.status === 'available' && flow.players >= t.minPlayers && flow.players <= t.maxPlayers
                    const cfg = isSelected
                      ? { bg: 'bg-blue-50', border: 'border-blue-500 border-2', text: 'text-blue-700', dot: 'bg-blue-500' }
                      : { ...tableStatusConfig[t.status], border: `border ${tableStatusConfig[t.status].border}` }
                    return (
                      <div key={t.id} className="relative">
                        <button
                          onClick={() => t.status === 'available' && update({ tableId: t.id })}
                          onMouseEnter={() => setHoveredTable(t.id)}
                          onMouseLeave={() => setHoveredTable(null)}
                          disabled={t.status !== 'available'}
                          className={`w-22 h-16 px-3 rounded-xl ${cfg.border} ${cfg.bg} flex flex-col items-center justify-center gap-1
                            transition-all duration-150
                            ${t.status === 'available' ? 'cursor-pointer hover:scale-105 hover:shadow-md' : 'cursor-not-allowed opacity-70'}
                            ${isSelected ? 'scale-105 shadow-md' : ''}
                            ${isSuggested && !isSelected ? 'ring-2 ring-green-400 ring-offset-1' : ''}`}>
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                            <span className={`text-sm font-bold ${cfg.text}`}>{t.id}</span>
                          </div>
                          <span className={`text-[10px] ${cfg.text} opacity-80`}>{t.capacity}p</span>
                          {t.status === 'occupied' && t.elapsed && <span className={`text-[9px] ${cfg.text} opacity-70`}>{t.elapsed}</span>}
                        </button>
                        {hoveredTable === t.id && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 bg-white rounded-xl shadow-xl border border-gray-100 p-3 w-44 text-left pointer-events-none">
                            <div className="font-semibold text-[#1D1D1F] mb-1 text-sm">Table {t.id}</div>
                            <div className="space-y-1 text-xs text-[#6E6E73]">
                              <div>{t.capacity} Players · {t.zone} Area</div>
                              <div className="flex items-center gap-1"><div className={`w-1.5 h-1.5 rounded-full ${tableStatusConfig[t.status].dot}`} /><span>{tableStatusConfig[t.status].label}</span></div>
                              {t.status === 'occupied' && t.client && <div>👤 {t.client}</div>}
                              {t.features.map(f => <div key={f}>✓ {f}</div>)}
                            </div>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Corner */}
              <div>
                <div className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>🏠</span> Corner Area <span className="text-[10px] font-normal normal-case">(6–8 players)</span>
                </div>
                <div className="flex gap-3">
                  {TABLES.filter(t => t.zone === 'Corner').map(t => {
                    const isSelected = flow.tableId === t.id
                    const isSuggested = t.status === 'available' && flow.players >= t.minPlayers && flow.players <= t.maxPlayers
                    const cfg = isSelected
                      ? { bg: 'bg-blue-50', border: 'border-blue-500 border-2', text: 'text-blue-700', dot: 'bg-blue-500' }
                      : { ...tableStatusConfig[t.status], border: `border ${tableStatusConfig[t.status].border}` }
                    return (
                      <div key={t.id} className="relative">
                        <button
                          onClick={() => t.status === 'available' && update({ tableId: t.id })}
                          onMouseEnter={() => setHoveredTable(t.id)}
                          onMouseLeave={() => setHoveredTable(null)}
                          disabled={t.status !== 'available'}
                          className={`w-24 h-20 rounded-xl ${cfg.border} ${cfg.bg} flex flex-col items-center justify-center gap-1
                            transition-all duration-150
                            ${t.status === 'available' ? 'cursor-pointer hover:scale-105 hover:shadow-md' : 'cursor-not-allowed opacity-70'}
                            ${isSelected ? 'scale-105 shadow-md' : ''}
                            ${isSuggested && !isSelected ? 'ring-2 ring-green-400 ring-offset-1' : ''}`}>
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                            <span className={`text-sm font-bold ${cfg.text}`}>{t.id}</span>
                          </div>
                          <span className={`text-[10px] ${cfg.text} opacity-80`}>{t.capacity}p</span>
                          <span className={`text-[9px] ${cfg.text} opacity-60`}>Large</span>
                        </button>
                        {hoveredTable === t.id && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 bg-white rounded-xl shadow-xl border border-gray-100 p-3 w-44 text-left pointer-events-none">
                            <div className="font-semibold text-[#1D1D1F] mb-1 text-sm">Table {t.id}</div>
                            <div className="space-y-1 text-xs text-[#6E6E73]">
                              <div>{t.capacity} Players · {t.zone} Area</div>
                              <div className="flex items-center gap-1"><div className={`w-1.5 h-1.5 rounded-full ${tableStatusConfig[t.status].dot}`} /><span>{tableStatusConfig[t.status].label}</span></div>
                              {t.features.map(f => <div key={f}>✓ {f}</div>)}
                            </div>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Counter */}
              <div className="mt-8 border-t-4 border-[#D2D2D7] pt-3 text-center text-xs font-semibold text-[#6E6E73] uppercase tracking-widest">
                COUNTER / ENTRANCE
              </div>
            </div>

            {/* Selected Table Info Panel */}
            <div className="w-56 flex-shrink-0 hidden lg:block">
              {flow.tableId && selectedTable ? (
                <div className="bg-white border-2 border-[#0071E3] rounded-2xl p-5">
                  <div className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wider mb-1">Selected</div>
                  <div className="text-2xl font-bold text-[#1D1D1F] mb-1">Table {selectedTable.id}</div>
                  <div className="flex items-center gap-1.5 mb-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-sm text-green-700 font-medium">Available</span>
                  </div>
                  <div className="space-y-2 text-sm text-[#6E6E73] mb-5">
                    <div><span className="text-[#1D1D1F] font-medium">Capacity:</span> {selectedTable.capacity} players</div>
                    <div><span className="text-[#1D1D1F] font-medium">Zone:</span> {selectedTable.zone} Area</div>
                    <div><span className="text-[#1D1D1F] font-medium">Date:</span> {flow.date.split(' ').slice(1).join(' ')}</div>
                    <div><span className="text-[#1D1D1F] font-medium">Time:</span> {flow.time} · {flow.duration}h</div>
                    <div><span className="text-[#1D1D1F] font-medium">Players:</span> {flow.players}</div>
                    <div className="border-t border-[#D2D2D7] pt-2 flex justify-between">
                      <span className="font-semibold text-[#1D1D1F]">Est. Fee</span>
                      <span className="font-bold text-[#0071E3]">{fmt(Math.round(estimatedFee))}</span>
                    </div>
                  </div>
                  <Btn variant="primary" onClick={next} className="w-full py-2.5 text-sm">Select This Table</Btn>
                </div>
              ) : (
                <div className="bg-[#F5F5F7] rounded-2xl p-5 text-center">
                  <div className="text-3xl mb-2">🎯</div>
                  <div className="text-sm font-medium text-[#1D1D1F] mb-1">Choose a table</div>
                  <div className="text-xs text-[#6E6E73]">
                    <span className="text-green-600 font-medium">Suggested</span> tables are highlighted for your group of {flow.players}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Btn variant="secondary" onClick={back} className="px-6 py-3">Back</Btn>
            <Btn variant="primary" onClick={next} disabled={!flow.tableId} className="px-8 py-3">
              {flow.tableId ? `Confirm Table ${flow.tableId} →` : 'Select a Table to Continue'}
            </Btn>
          </div>
        </div>
      )}

      {/* Step 6: Summary / Confirm */}
      {flow.step === 6 && (
        <div className="max-w-md">
          <h2 className="text-xl font-bold text-[#1D1D1F] mb-6">Reservation Summary</h2>
          <div className="bg-white border border-[#D2D2D7] rounded-2xl overflow-hidden mb-6">
            {[
              { label: 'Branch', value: selectedBranch?.name ?? '' },
              { label: 'Date', value: flow.date.split(' ').slice(1).join(' ') },
              { label: 'Time', value: flow.time },
              { label: 'Duration', value: `${flow.duration} Hour${flow.duration > 1 ? 's' : ''}` },
              { label: 'Players', value: `${flow.players} People` },
              { label: 'Table', value: `Table ${flow.tableId} · ${selectedTable?.zone} Area` },
              { label: 'Estimated Fee', value: fmt(Math.round(estimatedFee)) },
            ].map(({ label, value }, i, arr) => (
              <div key={label} className={`flex justify-between px-5 py-4 ${i < arr.length - 1 ? 'border-b border-[#D2D2D7]' : 'bg-blue-50'}`}>
                <span className="text-sm text-[#6E6E73]">{label}</span>
                <span className={`text-sm font-semibold ${i === arr.length - 1 ? 'text-[#0071E3] text-base' : 'text-[#1D1D1F]'}`}>{value}</span>
              </div>
            ))}
          </div>
          <div className="text-xs text-[#6E6E73] mb-6">
            * Fee is estimated. Actual fee is calculated at checkout based on actual play time.
          </div>
          <div className="flex gap-3">
            <Btn variant="secondary" onClick={back} className="px-6 py-3">Back</Btn>
            <Btn variant="primary" onClick={() => navigate('reserve-confirm')} className="flex-1 py-3 text-base">
              Confirm Reservation
            </Btn>
          </div>
        </div>
      )}
    </div>
  )
}

// ===================== RESERVE CONFIRM =====================

function ReserveConfirmPage({ navigate }: { navigate: (p: Page) => void }) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-20 text-center">
      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <span className="text-4xl">🎉</span>
      </div>
      <h1 className="text-3xl font-bold text-[#1D1D1F] mb-2">Your table is reserved!</h1>
      <p className="text-[#6E6E73] mb-8">We'll send you a confirmation and reminder before your session.</p>

      <div className="bg-[#F5F5F7] rounded-2xl p-6 text-left mb-4">
        <div className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wider mb-3">Reservation Details</div>
        <div className="font-mono text-sm text-[#0071E3] font-bold mb-4">RSV-10248</div>
        {[
          { label: 'Branch', value: 'Central Branch' },
          { label: 'Table', value: 'B4 · Main Area' },
          { label: 'Date', value: 'Saturday, 15 August 2026' },
          { label: 'Time', value: '14:00 – 17:00' },
          { label: 'Players', value: '4 People' },
          { label: 'Est. Fee', value: '฿180' },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between py-2 border-b border-[#D2D2D7] last:border-0">
            <span className="text-sm text-[#6E6E73]">{label}</span>
            <span className="text-sm font-semibold text-[#1D1D1F]">{value}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Btn variant="secondary" onClick={() => navigate('my-reservations')} className="flex-1 py-3">View My Reservations</Btn>
        <Btn variant="primary" onClick={() => navigate('shop')} className="flex-1 py-3">Shop Games for Game Night →</Btn>
      </div>
    </div>
  )
}

// ===================== LOGIN PAGE =====================

function LoginPage({ navigate, onLogin, prevPage }: { navigate: (p: Page) => void; onLogin: (mode: UserMode) => void; prevPage: Page }) {
  const [mode, setMode] = useState<'client' | 'staff'>('client')
  const [email, setEmail] = useState('apinya@example.com')
  const [pass, setPass] = useState('••••••••')

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center px-4">
      <button
        onClick={() => navigate(prevPage)}
        className="fixed top-5 left-5 flex items-center gap-1.5 text-sm font-medium text-[#6E6E73] hover:text-[#1D1D1F] transition-colors bg-white border border-[#D2D2D7] rounded-xl px-3 py-2 shadow-sm"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-3xl mb-2">♟</div>
          <h1 className="text-2xl font-bold text-[#1D1D1F]">Boardly</h1>
        </div>

        {/* Toggle */}
        <div className="flex bg-[#F5F5F7] rounded-xl p-1 mb-6">
          {(['client', 'staff'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${mode === m ? 'bg-white text-[#1D1D1F] shadow-sm' : 'text-[#6E6E73]'}`}>
              {m === 'client' ? 'Customer Login' : 'Staff Login'}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border border-[#D2D2D7] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0071E3] transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">Password</label>
            <input type="password" value={pass} onChange={e => setPass(e.target.value)}
              className="w-full border border-[#D2D2D7] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0071E3] transition-colors" />
          </div>
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-[#6E6E73] cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded accent-[#0071E3]" />
              Remember me
            </label>
            <button className="text-[#0071E3] hover:underline">Forgot Password</button>
          </div>
          <Btn variant="primary" onClick={() => {
            if (mode === 'client') {
              onLogin('customer')
            } else {
              // Demo: admin@boardly.com → Admin, anything else → Staff
              const role: UserMode = email.includes('admin') ? 'admin' : 'staff'
              onLogin(role)
            }
          }} className="w-full py-3.5 text-base">
            Sign In
          </Btn>
        </div>

        {mode === 'client' && (
          <div className="mt-5 text-center text-sm text-[#6E6E73]">
            Don't have an account?{' '}
            <button onClick={() => navigate('register')} className="text-[#0071E3] font-medium hover:underline">Create Account</button>
          </div>
        )}
        {mode === 'staff' && (
          <div className="mt-5 text-center text-xs text-[#6E6E73]">
            Staff and Admin accounts are managed by the store administrator.<br />
            <span className="font-medium">Demo: use admin@boardly.com to access Admin.</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ===================== REGISTER PAGE =====================

function RegisterPage({ navigate }: { navigate: (p: Page) => void }) {
  const genres = ['Strategy', 'Party', 'Cooperative', 'Family', 'Card Games', 'Abstract']
  const [selected, setSelected] = useState<string[]>([])
  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">♟</div>
          <h1 className="text-2xl font-bold text-[#1D1D1F]">Create Account</h1>
          <p className="text-sm text-[#6E6E73] mt-1">Join Boardly for a seamless experience</p>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[['First Name', 'Apinya'], ['Last Name', 'W.']].map(([label, ph]) => (
              <div key={label}>
                <label className="block text-xs font-medium text-[#1D1D1F] mb-1">{label}</label>
                <input defaultValue={ph} className="w-full border border-[#D2D2D7] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0071E3]" />
              </div>
            ))}
          </div>
          {[['Display Name', 'Mintmint'], ['Email', 'apinya@example.com'], ['Phone', '081-234-5678']].map(([label, ph]) => (
            <div key={label}>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">{label}</label>
              <input defaultValue={ph} className="w-full border border-[#D2D2D7] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0071E3]" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            {[['Password', ''], ['Confirm', '']].map(([label]) => (
              <div key={label}>
                <label className="block text-xs font-medium text-[#1D1D1F] mb-1">{label}</label>
                <input type="password" className="w-full border border-[#D2D2D7] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0071E3]" />
              </div>
            ))}
          </div>
          <div>
            <div className="text-xs font-medium text-[#1D1D1F] mb-2">Favorite Game Types (optional)</div>
            <div className="flex flex-wrap gap-2">
              {genres.map(g => (
                <button key={g} onClick={() => setSelected(s => s.includes(g) ? s.filter(x => x !== g) : [...s, g])}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selected.includes(g) ? 'border-[#0071E3] bg-blue-50 text-[#0071E3]' : 'border-[#D2D2D7] text-[#6E6E73]'}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-start gap-2 text-xs text-[#6E6E73] cursor-pointer">
            <input type="checkbox" className="mt-0.5 rounded accent-[#0071E3]" />
            <span>I agree to the <button className="text-[#0071E3] hover:underline">Terms & Conditions</button> and <button className="text-[#0071E3] hover:underline">Privacy Policy</button></span>
          </label>
          <Btn variant="primary" onClick={() => navigate('account')} className="w-full py-3 text-sm">Create Account</Btn>
        </div>
        <div className="mt-4 text-center text-sm text-[#6E6E73]">
          Already have an account? <button onClick={() => navigate('login')} className="text-[#0071E3] hover:underline">Sign In</button>
        </div>
      </div>
    </div>
  )
}

// ===================== ACCOUNT PAGE =====================

function AccountPage({ navigate, onLogout }: { navigate: (p: Page) => void; onLogout: () => void }) {
  const quickActions = [
    { icon: '🎲', label: 'Shop Board Games', page: 'shop' as Page },
    { icon: '🪑', label: 'Reserve a Table', page: 'reserve' as Page },
    { icon: '📦', label: 'My Orders', page: 'my-orders' as Page },
    { icon: '📅', label: 'My Reservations', page: 'my-reservations' as Page },
  ]
  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1D1D1F]">Good afternoon, Apinya 👋</h1>
        <p className="text-[#6E6E73] mt-1">Welcome back to Boardly</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {quickActions.map(a => (
          <button key={a.page} onClick={() => navigate(a.page)}
            className="bg-[#F5F5F7] rounded-2xl p-5 flex flex-col items-center gap-3 hover:-translate-y-0.5 hover:shadow-md transition-all">
            <span className="text-3xl">{a.icon}</span>
            <span className="text-sm font-medium text-[#1D1D1F]">{a.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Upcoming Reservation */}
        <div className="bg-white border border-[#D2D2D7] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#1D1D1F]">Upcoming Reservation</h3>
            <button onClick={() => navigate('my-reservations')} className="text-xs text-[#0071E3] hover:underline">View all</button>
          </div>
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-[#0071E3] rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-[#0071E3] uppercase tracking-wide">Confirmed</span>
            </div>
            <div className="font-bold text-[#1D1D1F] text-lg">Saturday, 15 August</div>
            <div className="text-[#6E6E73] text-sm mt-1">14:00 – 17:00 · Table B4 · 4 Players</div>
            <div className="text-xs text-[#6E6E73] mt-1">RSV-10248</div>
          </div>
          <Btn variant="ghost" onClick={() => navigate('my-reservations')} className="mt-4 px-4 py-2 text-sm">
            Manage Reservations →
          </Btn>
        </div>

        {/* Recent Order */}
        <div className="bg-white border border-[#D2D2D7] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#1D1D1F]">Recent Order</h3>
            <button onClick={() => navigate('my-orders')} className="text-xs text-[#0071E3] hover:underline">View all</button>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#F5F5F7]">
              <img src={PRODUCTS[0].image} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-[#1D1D1F]">Wingspan + 1 Item</div>
              <div className="text-sm text-[#6E6E73]">฿2,890 · Order #BG10242</div>
              <div className="mt-1.5">
                <span className="text-xs bg-amber-100 text-amber-700 font-medium px-2 py-0.5 rounded-full">Preparing</span>
              </div>
            </div>
          </div>
          <Btn variant="ghost" onClick={() => navigate('my-orders')} className="mt-4 px-4 py-2 text-sm">
            Track Order →
          </Btn>
        </div>

        {/* Play History Preview */}
        <div className="bg-white border border-[#D2D2D7] rounded-2xl p-6">
          <h3 className="font-bold text-[#1D1D1F] mb-4">Last Store Visit</h3>
          <div className="text-sm text-[#6E6E73] space-y-1.5">
            <div className="flex justify-between"><span>Date</span><span className="text-[#1D1D1F] font-medium">8 Aug 2026</span></div>
            <div className="flex justify-between"><span>Table</span><span className="text-[#1D1D1F] font-medium">B4</span></div>
            <div className="flex justify-between"><span>Duration</span><span className="text-[#1D1D1F] font-medium">2h 45m</span></div>
            <div className="flex justify-between"><span>Fee</span><span className="text-[#1D1D1F] font-medium">฿165</span></div>
          </div>
        </div>

        {/* Profile */}
        <div className="bg-white border border-[#D2D2D7] rounded-2xl p-6">
          <h3 className="font-bold text-[#1D1D1F] mb-4">Profile</h3>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#0071E3] rounded-full flex items-center justify-center text-white font-bold text-lg">A</div>
            <div>
              <div className="font-semibold text-[#1D1D1F]">Apinya Wongsak</div>
              <div className="text-sm text-[#6E6E73]">apinya@example.com</div>
            </div>
          </div>
          <div className="text-sm text-[#6E6E73] space-y-1">
            <div>⭐ Favorite types: Strategy, Cooperative</div>
            <div>📊 Total orders: 5 · Total visits: 12</div>
          </div>
          <div className="flex gap-2 mt-4">
            <Btn variant="ghost" className="px-4 py-2 text-sm">Edit Profile →</Btn>
            <Btn variant="secondary" onClick={onLogout} className="px-4 py-2 text-sm text-red-500 hover:bg-red-50">Logout</Btn>
          </div>
        </div>
      </div>
    </div>
  )
}

// ===================== MY ORDERS =====================

function MyOrdersPage({ navigate }: { navigate: (p: Page) => void }) {
  const [tab, setTab] = useState('All')
  const tabs = ['All', 'Processing', 'Shipped', 'Ready for Pickup', 'Completed', 'Cancelled']
  const orders = [
    { id: 'BG10248', date: '15 Aug 2026', items: 'Wingspan', count: 1, total: 1970, status: 'Processing', statusColor: 'bg-amber-100 text-amber-700' },
    { id: 'BG10242', date: '10 Aug 2026', items: 'Catan, Codenames', count: 2, total: 2890, status: 'Completed', statusColor: 'bg-green-100 text-green-700' },
    { id: 'BG10234', date: '2 Aug 2026', items: 'Azul', count: 1, total: 990, status: 'Completed', statusColor: 'bg-green-100 text-green-700' },
    { id: 'BG10221', date: '28 Jul 2026', items: 'Pandemic, Dixit', count: 2, total: 2080, status: 'Cancelled', statusColor: 'bg-red-100 text-red-700' },
  ]
  const filtered = tab === 'All' ? orders : orders.filter(o => o.status === tab)

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-[#1D1D1F]">My Orders</h1>
        <Btn variant="secondary" onClick={() => navigate('shop')} className="px-4 py-2 text-sm">Shop More Games</Btn>
      </div>
      <div className="flex gap-2 flex-wrap mb-6">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t ? 'bg-[#1D1D1F] text-white' : 'bg-[#F5F5F7] text-[#6E6E73] hover:bg-gray-200'}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="space-y-4">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-[#6E6E73]">
            <div className="text-4xl mb-3">📦</div>
            <div>No orders in this category</div>
          </div>
        )}
        {filtered.map(o => (
          <div key={o.id} className="bg-white border border-[#D2D2D7] rounded-2xl p-5 flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-[#F5F5F7] flex items-center justify-center text-xl">📦</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-[#1D1D1F]">#{o.id}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${o.statusColor}`}>{o.status}</span>
              </div>
              <div className="text-sm text-[#6E6E73]">{o.date} · {o.count} item{o.count > 1 ? 's' : ''} · {o.items}</div>
              <div className="font-semibold text-[#1D1D1F] mt-0.5">{fmt(o.total)}</div>
            </div>
            <Btn variant="secondary" onClick={() => {}} className="px-4 py-2 text-sm flex-shrink-0">View Order</Btn>
          </div>
        ))}
      </div>
    </div>
  )
}

// ===================== MY RESERVATIONS =====================

function MyReservationsPage({ navigate }: { navigate: (p: Page) => void }) {
  const [tab, setTab] = useState('Upcoming')
  const reservations = {
    Upcoming: [
      { id: 'RSV-10248', date: 'Saturday, 15 Aug 2026', time: '14:00–17:00', table: 'B4', players: 4, branch: 'Central Branch', status: 'Confirmed' },
    ],
    Completed: [
      { id: 'RSV-10231', date: 'Saturday, 8 Aug 2026', time: '16:00–18:00', table: 'A1', players: 2, branch: 'Silom Branch', status: 'Completed' },
      { id: 'RSV-10214', date: 'Sunday, 1 Aug 2026', time: '14:00–18:00', table: 'C1', players: 6, branch: 'Central Branch', status: 'Completed' },
    ],
    Cancelled: [],
  }
  const items = reservations[tab as keyof typeof reservations] || []

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-[#1D1D1F]">My Reservations</h1>
        <Btn variant="primary" onClick={() => navigate('reserve')} className="px-5 py-2.5 text-sm">Reserve a Table</Btn>
      </div>
      <div className="flex gap-2 mb-6">
        {['Upcoming', 'Completed', 'Cancelled'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t ? 'bg-[#1D1D1F] text-white' : 'bg-[#F5F5F7] text-[#6E6E73] hover:bg-gray-200'}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="space-y-4">
        {items.length === 0 && (
          <div className="text-center py-16 text-[#6E6E73]">
            <div className="text-4xl mb-3">📅</div>
            <div>No {tab.toLowerCase()} reservations</div>
            {tab === 'Upcoming' && <Btn variant="ghost" onClick={() => navigate('reserve')} className="mt-4 px-4 py-2 text-sm">Make a Reservation →</Btn>}
          </div>
        )}
        {items.map(r => (
          <div key={r.id} className="bg-white border border-[#D2D2D7] rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm text-[#0071E3] font-semibold">{r.id}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.status === 'Confirmed' ? 'bg-blue-100 text-blue-700' : r.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {r.status}
                  </span>
                </div>
                <div className="font-bold text-[#1D1D1F]">{r.date}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-[#6E6E73]">
              <span>🏢 {(r as typeof r & { branch: string }).branch}</span>
              <span>🕐 {r.time}</span>
              <span>🪑 Table {r.table}</span>
              <span>👥 {r.players} Players</span>
            </div>
            {r.status === 'Confirmed' && (
              <div className="flex gap-2 mt-4">
                <Btn variant="secondary" onClick={() => {}} className="px-4 py-2 text-sm">View Details</Btn>
                <Btn variant="ghost" onClick={() => {}} className="px-4 py-2 text-sm text-red-500 hover:bg-red-50">Cancel</Btn>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ===================== VISIT STORE =====================

const BRANCH_DETAILS: Record<string, { amenities: string[]; games: string[]; rules: string[] }> = {
  central: {
    amenities: ['☕ Café & beverages available', `💡 10 tables (2–8 players each)`, '🎲 500+ games available to play', '🔌 Power outlets at all tables', '📶 Free high-speed Wi-Fi', '🅿️ Nearby parking available'],
    games: ['Wingspan', 'Catan', 'Ticket to Ride', 'Pandemic', 'Gloomhaven', 'Azul', 'Dixit', 'Codenames'],
    rules: ['No outside food or drinks', 'Handle games with care', 'Book in advance on weekends', 'Children must be accompanied'],
  },
  silom: {
    amenities: ['☕ Coffee bar on-site', `💡 8 tables (2–6 players each)`, '🎲 350+ games available', '📶 Free high-speed Wi-Fi', '🚇 BTS Sala Daeng 3 min walk'],
    games: ['Catan', 'Ticket to Ride', 'Codenames', 'Azul', 'Dixit', 'Pandemic'],
    rules: ['No outside food or drinks', 'Handle games with care', 'Quiet zone after 20:00', 'Max 6 players per table'],
  },
  siam: {
    amenities: ['☕ Full café menu', `💡 12 tables (2–10 players each)`, '🎲 600+ games available', '🔌 Power outlets at all tables', '📶 Free high-speed Wi-Fi', '🛍️ In-store shop'],
    games: ['Wingspan', 'Gloomhaven', 'Catan', 'Ticket to Ride', 'Pandemic', 'Azul', 'Dixit', 'Codenames'],
    rules: ['No outside food or drinks', 'Handle games with care', 'Reservations recommended', 'Large groups call ahead'],
  },
  onnut: {
    amenities: ['☕ Beverages available', `💡 6 tables (2–6 players each)`, '🎲 200+ games available', '🅿️ Free parking'],
    games: ['Catan', 'Codenames', 'Azul', 'Dixit'],
    rules: ['No outside food or drinks', 'Handle games with care'],
  },
}

function VisitStorePage({ navigate, onReserve }: { navigate: (p: Page) => void; onReserve: (branchId: string) => void }) {
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const branch = BRANCHES.find(b => b.id === selectedBranchId)
  const details = selectedBranchId ? BRANCH_DETAILS[selectedBranchId] : null

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="rounded-3xl overflow-hidden mb-8 h-56 relative">
        <img src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&h=500&fit=crop&auto=format"
          alt="Boardly store" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Visit Our Store</h1>
            <p className="text-white/80 mt-1">Bangkok's premier board game cafés</p>
          </div>
        </div>
      </div>

      {/* Branch Selector */}
      <div className="bg-white border border-[#D2D2D7] rounded-2xl p-5 mb-6">
        <label className="block text-sm font-semibold text-[#1D1D1F] mb-2">Choose a Branch</label>
        <BranchSearchDropdown value={selectedBranchId} onChange={setSelectedBranchId} placeholder="Search or select a branch..." onlyActive={false} />
      </div>

      {!branch ? (
        <div className="bg-[#F5F5F7] rounded-2xl p-14 text-center text-[#6E6E73]">
          <div className="text-4xl mb-3">🏢</div>
          <div className="font-semibold text-[#1D1D1F] mb-1">Select a branch to view details</div>
          <div className="text-sm">Choose a Boardly location above to see address, hours, amenities, and available games.</div>
        </div>
      ) : (
        <>
          {/* Branch header card */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-6 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-[#1D1D1F]">{branch.name}</h2>
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${branch.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {branch.status === 'active' ? 'Open' : 'Closed'}
                </span>
              </div>
              <div className="text-sm text-[#6E6E73] space-y-0.5">
                <div>📍 {branch.address}, {branch.district}</div>
                <div>🕐 {branch.hours}</div>
                <div>📞 {branch.phone}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-[#0071E3]">
              <span className="text-2xl font-bold text-[#1D1D1F]">{branch.tables}</span>
              <span className="text-[#6E6E73] text-xs">tables<br />available</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Pricing */}
            <div className="bg-white border border-[#D2D2D7] rounded-2xl p-6">
              <h3 className="font-bold text-[#1D1D1F] mb-4">Table Pricing</h3>
              <div className="space-y-3 text-sm">
                {[
                  ['First Hour', '฿60 per person'],
                  ['Additional Hours', '฿40 per person/hour'],
                  ['Children under 12', '฿30 per person/hour'],
                ].map(([label, price]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-[#6E6E73]">{label}</span>
                    <span className="font-semibold text-[#1D1D1F]">{price}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Amenities */}
            <div className="bg-white border border-[#D2D2D7] rounded-2xl p-6">
              <h3 className="font-bold text-[#1D1D1F] mb-4">Amenities</h3>
              <div className="space-y-2 text-sm text-[#6E6E73]">
                {details!.amenities.map(a => <div key={a}>{a}</div>)}
              </div>
            </div>

            {/* Available Games */}
            <div className="bg-white border border-[#D2D2D7] rounded-2xl p-6">
              <h3 className="font-bold text-[#1D1D1F] mb-4">Games Available Here</h3>
              <div className="flex flex-wrap gap-2">
                {details!.games.map(g => (
                  <span key={g} className="text-xs bg-[#F5F5F7] border border-[#D2D2D7] px-2.5 py-1 rounded-full text-[#1D1D1F] font-medium">{g}</span>
                ))}
                <span className="text-xs text-[#6E6E73] px-2.5 py-1">+ many more</span>
              </div>
            </div>

            {/* Store Rules */}
            <div className="bg-white border border-[#D2D2D7] rounded-2xl p-6">
              <h3 className="font-bold text-[#1D1D1F] mb-4">Store Rules</h3>
              <div className="space-y-2 text-sm text-[#6E6E73]">
                {details!.rules.map((r, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[#0071E3] font-bold flex-shrink-0">·</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Btn variant="primary" onClick={() => branch.status === 'active' ? onReserve(branch.id) : undefined} disabled={branch.status !== 'active'} className="flex-1 py-3.5 text-base">
              Reserve a Table at {branch.name}
            </Btn>
            <Btn variant="secondary" onClick={() => navigate('shop')} className="flex-1 py-3.5 text-base">Shop Board Games</Btn>
          </div>
        </>
      )}
    </div>
  )
}

// ===================== STAFF DASHBOARD =====================

function StaffDashboardPage({ navigate, assignedBranch = 'Central Branch' }: { navigate: (p: Page) => void; assignedBranch?: string }) {
  const kpis = [
    { label: 'Available Tables', value: '8', sub: 'of 15 total', color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Active Sessions', value: '5', sub: 'playing now', color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Today\'s Reservations', value: '12', sub: '3 upcoming', color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Clients Today', value: '38', sub: '+12% vs yesterday', color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Orders Today', value: '24', sub: '6 new, 4 pending', color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Sales Today', value: '฿38,420', sub: 'online + in-store', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Low Stock', value: '6', sub: 'products need restock', color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Pending Orders', value: '4', sub: 'need processing', color: 'text-orange-600', bg: 'bg-orange-50' },
  ]

  const activity = [
    { time: '17:21', text: 'Alex S. checked out from Table B2', type: 'checkout' },
    { time: '17:05', text: 'New online order #BG10249 (Wingspan)', type: 'order' },
    { time: '16:58', text: 'Reservations RSV-10248 confirmed for tomorrow', type: 'reserve' },
    { time: '16:30', text: 'Napat S. checked in to Table B1', type: 'checkin' },
    { time: '15:55', text: 'Low stock alert: Pandemic (2 units left)', type: 'alert' },
  ]

  return (
    <div className="p-6 max-w-none">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1D1D1F]">Dashboard</h1>
          <p className="text-[#6E6E73] text-sm mt-0.5">Thursday, 14 August 2026 · 17:24</p>
        </div>
        <div className="flex items-center gap-2 bg-[#F5F5F7] border border-[#D2D2D7] rounded-xl px-4 py-2">
          <span className="text-base">🏢</span>
          <div>
            <div className="text-xs text-[#6E6E73]">Assigned Branch</div>
            <div className="font-semibold text-[#1D1D1F] text-sm">{assignedBranch}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {kpis.map(k => (
          <div key={k.label} className="bg-white border border-[#D2D2D7] rounded-2xl p-5">
            <div className={`text-2xl font-bold ${k.color} mb-1`}>{k.value}</div>
            <div className="font-medium text-[#1D1D1F] text-sm">{k.label}</div>
            <div className="text-xs text-[#6E6E73] mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Live Tables Quick View */}
        <div className="bg-white border border-[#D2D2D7] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#1D1D1F]">Live Tables</h3>
            <button onClick={() => navigate('staff-tables')} className="text-xs text-[#0071E3] hover:underline">View all →</button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {TABLES.slice(0, 6).map(t => (
              <div key={t.id} className={`rounded-xl p-3 text-center ${
                t.status === 'occupied' ? 'bg-red-50 border border-red-200' :
                t.status === 'reserved' ? 'bg-orange-50 border border-orange-200' :
                t.status === 'unavailable' ? 'bg-gray-100 border border-gray-200' :
                'bg-green-50 border border-green-200'}`}>
                <div className="font-bold text-[#1D1D1F] text-sm">{t.id}</div>
                {t.elapsed && <div className="text-[10px] text-[#6E6E73] mt-0.5">{t.elapsed}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white border border-[#D2D2D7] rounded-2xl p-5">
          <h3 className="font-bold text-[#1D1D1F] mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {activity.map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-xs font-mono text-[#6E6E73] mt-0.5 flex-shrink-0">{a.time}</span>
                <span className="text-sm text-[#1D1D1F]">{a.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ===================== WALK-IN ASSIGN CLIENT MODAL =====================

interface WalkInClient { id: string; name: string; phone: string; email: string; status: string }

const WALKIN_CLIENTS: WalkInClient[] = [
  { id: 'u1', name: 'Apinya Wongsak', phone: '081-234-5678', email: 'apinya@example.com', status: 'Active' },
  { id: 'u2', name: 'James Walker', phone: '082-345-6789', email: 'james@example.com', status: 'Active' },
  { id: 'u3', name: 'Mint Pattama', phone: '083-456-7890', email: 'mint@example.com', status: 'Active' },
  { id: 'u4', name: 'Chaiwat Srisuk', phone: '084-567-8901', email: 'chaiwat@example.com', status: 'Active' },
]

function WalkInModal({ table, onClose, onAssign }: { table: TableData; onClose: () => void; onAssign: (tableId: string, clientName: string, players: number) => void }) {
  const [step, setStep] = useState(1)
  const [search, setSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState<WalkInClient | null>(null)
  const [isGuest, setIsGuest] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [players, setPlayers] = useState(2)
  const [toast, setToast] = useState(false)

  const maxPlayers = table.maxPlayers
  const clientLabel = isGuest ? (guestName || 'Guest') : selectedClient?.name ?? ''
  const filteredClients = WALKIN_CLIENTS.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search) || c.email.includes(search)
  )

  const canProceedStep1 = isGuest ? guestName.trim().length > 0 : selectedClient !== null
  const overCapacity = players > maxPlayers

  const handleAssign = () => {
    setToast(true)
    setTimeout(() => {
      onAssign(table.id, clientLabel, players)
      onClose()
    }, 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm px-0 sm:px-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#D2D2D7]">
          <div>
            <h2 className="text-lg font-bold text-[#1D1D1F]">Assign Walk-In Client</h2>
            <div className="text-xs text-[#6E6E73] mt-0.5">Table {table.id} · {table.zone} Area · {table.maxPlayers}p max</div>
          </div>
          <button onClick={onClose} className="text-[#6E6E73] hover:text-[#1D1D1F] p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex px-6 py-3 gap-1 border-b border-[#D2D2D7]">
          {['Client', 'Players', 'Table', 'Confirm'].map((s, i) => (
            <div key={s} className="flex items-center gap-1 flex-1">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${i + 1 < step ? 'bg-[#0071E3] text-white' : i + 1 === step ? 'bg-[#1D1D1F] text-white' : 'bg-[#D2D2D7] text-[#6E6E73]'}`}>
                {i + 1 < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${i + 1 === step ? 'text-[#1D1D1F]' : 'text-[#6E6E73]'}`}>{s}</span>
              {i < 3 && <div className={`flex-1 h-0.5 ml-1 ${i + 1 < step ? 'bg-[#0071E3]' : 'bg-[#D2D2D7]'}`} />}
            </div>
          ))}
        </div>

        <div className="px-6 py-5">
          {/* Step 1: Search or Create Client */}
          {step === 1 && (
            <div>
              <h3 className="font-semibold text-[#1D1D1F] mb-4">Search or create client</h3>
              {!isGuest ? (
                <>
                  <div className="relative mb-3">
                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E6E73]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, phone, email..."
                      className="w-full pl-10 pr-4 py-2.5 border border-[#D2D2D7] rounded-xl text-sm outline-none focus:border-[#0071E3]" />
                  </div>
                  <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                    {filteredClients.map(c => (
                      <button key={c.id} onClick={() => setSelectedClient(c)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-colors ${selectedClient?.id === c.id ? 'border-[#0071E3] bg-blue-50' : 'border-[#D2D2D7] hover:bg-[#F5F5F7]'}`}>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#0071E3]/10 flex items-center justify-center text-[#0071E3] font-bold text-xs flex-shrink-0">{c.name[0]}</div>
                          <div>
                            <div className="text-sm font-medium text-[#1D1D1F]">{c.name}</div>
                            <div className="text-xs text-[#6E6E73]">{c.phone} · {c.email}</div>
                          </div>
                        </div>
                        {selectedClient?.id === c.id && (
                          <svg className="w-4 h-4 text-[#0071E3] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        )}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setIsGuest(true)} className="w-full py-2.5 border-2 border-dashed border-[#D2D2D7] rounded-xl text-sm font-medium text-[#6E6E73] hover:border-[#0071E3] hover:text-[#0071E3] transition-colors">
                    + Create Guest Client
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Guest Name <span className="text-red-500">*</span></label>
                    <input autoFocus value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Full name"
                      className="w-full border border-[#D2D2D7] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0071E3]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Phone</label>
                    <input value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder="0XX-XXX-XXXX"
                      className="w-full border border-[#D2D2D7] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0071E3]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Email <span className="text-[#6E6E73]">(optional)</span></label>
                    <input value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="guest@example.com"
                      className="w-full border border-[#D2D2D7] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0071E3]" />
                  </div>
                  <button onClick={() => { setIsGuest(false); setGuestName(''); setGuestPhone(''); setGuestEmail('') }}
                    className="text-xs text-[#6E6E73] hover:text-[#0071E3] transition-colors">← Back to search</button>
                </div>
              )}
              <div className="mt-5">
                <Btn variant="primary" onClick={() => setStep(2)} disabled={!canProceedStep1} className="w-full py-2.5 text-sm">Continue →</Btn>
              </div>
            </div>
          )}

          {/* Step 2: Players */}
          {step === 2 && (
            <div>
              <h3 className="font-semibold text-[#1D1D1F] mb-1">Number of players</h3>
              <p className="text-sm text-[#6E6E73] mb-6">Table capacity: up to {maxPlayers} players</p>
              <div className="flex items-center justify-center gap-6 mb-4">
                <button onClick={() => setPlayers(p => Math.max(1, p - 1))}
                  className="w-11 h-11 rounded-full border-2 border-[#D2D2D7] hover:border-[#0071E3] flex items-center justify-center text-xl font-bold text-[#1D1D1F] transition-colors">−</button>
                <div className="text-5xl font-bold text-[#1D1D1F] w-16 text-center">{players}</div>
                <button onClick={() => setPlayers(p => Math.min(maxPlayers + 1, p + 1))}
                  className="w-11 h-11 rounded-full border-2 border-[#D2D2D7] hover:border-[#0071E3] flex items-center justify-center text-xl font-bold text-[#1D1D1F] transition-colors">+</button>
              </div>
              {overCapacity && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 mb-4 text-center">
                  Exceeds table capacity of {maxPlayers}. Please choose a different table or reduce players.
                </div>
              )}
              <div className="flex gap-3 mt-5">
                <Btn variant="secondary" onClick={() => setStep(1)} className="flex-1 py-2.5 text-sm">← Back</Btn>
                <Btn variant="primary" onClick={() => setStep(3)} disabled={overCapacity} className="flex-1 py-2.5 text-sm">Continue →</Btn>
              </div>
            </div>
          )}

          {/* Step 3: Table confirmation */}
          {step === 3 && (
            <div>
              <h3 className="font-semibold text-[#1D1D1F] mb-4">Confirm table</h3>
              <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-4 mb-5">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-bold text-[#1D1D1F] text-base">Table {table.id}</div>
                    <div className="text-sm text-[#6E6E73]">{table.zone} Area · up to {table.maxPlayers} players</div>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 font-medium px-2.5 py-1 rounded-full">Available</span>
                </div>
                {table.features.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {table.features.map(f => <span key={f} className="text-xs bg-white border border-green-200 px-2 py-0.5 rounded-full text-green-700">✓ {f}</span>)}
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Btn variant="secondary" onClick={() => setStep(2)} className="flex-1 py-2.5 text-sm">← Back</Btn>
                <Btn variant="primary" onClick={() => setStep(4)} className="flex-1 py-2.5 text-sm">Continue →</Btn>
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && (
            <div>
              <h3 className="font-semibold text-[#1D1D1F] mb-4">Confirm check-in</h3>
              <div className="bg-[#F5F5F7] rounded-2xl p-4 space-y-3 text-sm mb-5">
                {[
                  ['Client', clientLabel],
                  ['Phone', isGuest ? (guestPhone || '—') : (selectedClient?.phone ?? '—')],
                  ['Branch', 'Central Branch'],
                  ['Table', `Table ${table.id} · ${table.zone} Area`],
                  ['Players', `${players} person${players > 1 ? 's' : ''}`],
                  ['Check-in', 'Now · ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })],
                  ['Rate', '฿60/person first hour'],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between">
                    <span className="text-[#6E6E73]">{l}</span>
                    <span className="font-medium text-[#1D1D1F]">{v}</span>
                  </div>
                ))}
              </div>
              {toast ? (
                <div className="flex items-center justify-center gap-2 py-3 text-green-600 font-medium text-sm">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  Client assigned and checked in!
                </div>
              ) : (
                <div className="flex gap-3">
                  <Btn variant="secondary" onClick={() => setStep(3)} className="flex-1 py-2.5 text-sm">← Back</Btn>
                  <Btn variant="primary" onClick={handleAssign} className="flex-1 py-2.5 text-sm">Assign & Check In</Btn>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ===================== STAFF LIVE TABLES =====================

function StaffLiveTablesPage() {
  const [tables, setTables] = useState(TABLES)
  const [selectedTable, setSelectedTable] = useState<TableData | null>(null)
  const [showWalkIn, setShowWalkIn] = useState(false)
  const [sessionToast, setSessionToast] = useState<string | null>(null)

  const zoneLabels = ['Window', 'Main', 'Corner']
  const statusConfig = {
    available: { bg: 'bg-green-50', border: 'border-green-300', label: 'Available', dot: 'bg-green-500' },
    reserved: { bg: 'bg-orange-50', border: 'border-orange-300', label: 'Reserved', dot: 'bg-orange-500' },
    occupied: { bg: 'bg-red-50', border: 'border-red-300', label: 'Occupied', dot: 'bg-red-500' },
    unavailable: { bg: 'bg-gray-100', border: 'border-gray-300', label: 'Unavailable', dot: 'bg-gray-400' },
  }

  const handleAssignWalkIn = (tableId: string, clientName: string, players: number) => {
    setTables(prev => prev.map(t =>
      t.id === tableId
        ? { ...t, status: 'occupied' as const, client: clientName, players, checkIn: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), elapsed: '0m', fee: 0 }
        : t
    ))
    setSelectedTable(null)
    setShowWalkIn(false)
    setSessionToast('Client assigned and checked in')
  }

  return (
    <div className="p-6 flex gap-6">
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-[#1D1D1F] mb-2">Live Tables</h1>
        <p className="text-[#6E6E73] text-sm mb-6">Click any table to manage it</p>

        {/* Legend */}
        <div className="flex gap-5 mb-6 text-xs font-medium">
          {Object.entries(statusConfig).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${v.dot}`} />
              <span className="text-[#6E6E73]">{v.label}</span>
            </div>
          ))}
        </div>

        <div className="bg-[#F5F5F7] rounded-2xl p-6 space-y-8">
          {zoneLabels.map(zone => (
            <div key={zone}>
              <div className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wider mb-3">{zone} Area</div>
              <div className="flex gap-4 flex-wrap">
                {tables.filter(t => t.zone === zone).map(t => {
                  const cfg = statusConfig[t.status]
                  const isActive = selectedTable?.id === t.id
                  return (
                    <button key={t.id} onClick={() => setSelectedTable(isActive ? null : t)}
                      className={`${cfg.bg} border-2 ${isActive ? 'border-[#0071E3] ring-2 ring-[#0071E3]/30' : cfg.border} rounded-xl p-4 text-left transition-all hover:shadow-md hover:-translate-y-0.5 ${zone === 'Corner' ? 'w-28' : 'w-24'}`}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                        <span className="font-bold text-[#1D1D1F] text-sm">{t.id}</span>
                      </div>
                      {t.status === 'occupied' && t.client ? (
                        <>
                          <div className="text-[10px] font-medium text-[#1D1D1F] truncate">{t.client}</div>
                          <div className="text-[10px] text-[#6E6E73]">{t.players}p · {t.elapsed}</div>
                          <div className="text-[10px] font-semibold text-red-600 mt-1">฿{t.fee}</div>
                        </>
                      ) : (
                        <>
                          <div className="text-[10px] text-[#6E6E73]">{t.capacity}p</div>
                          <div className="text-[10px] font-medium text-[#6E6E73] mt-1">{cfg.label}</div>
                        </>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          <div className="border-t-4 border-[#D2D2D7] pt-3 text-center text-xs font-semibold text-[#6E6E73] uppercase tracking-widest">COUNTER / ENTRANCE</div>
        </div>
      </div>

      {/* Side Panel */}
      {selectedTable && (
        <div className="w-64 flex-shrink-0">
          <div className="bg-white border border-[#D2D2D7] rounded-2xl p-5 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#1D1D1F]">Table {selectedTable.id}</h3>
              <button onClick={() => setSelectedTable(null)} className="text-[#6E6E73] hover:text-[#1D1D1F]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <div className={`w-2.5 h-2.5 rounded-full ${statusConfig[selectedTable.status].dot}`} />
              <span className="text-sm font-medium text-[#1D1D1F]">{statusConfig[selectedTable.status].label}</span>
            </div>

            {selectedTable.status === 'occupied' ? (
              <>
                <div className="space-y-2 text-sm mb-5">
                  {[
                    { label: 'Client', value: selectedTable.client },
                    { label: 'Players', value: `${selectedTable.players} people` },
                    { label: 'Check-In', value: selectedTable.checkIn },
                    { label: 'Duration', value: selectedTable.elapsed },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-[#6E6E73]">{label}</span>
                      <span className="font-semibold text-[#1D1D1F]">{value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-[#D2D2D7] pt-2">
                    <span className="text-[#6E6E73]">Est. Fee</span>
                    <span className="font-bold text-[#0071E3] text-base">฿{selectedTable.fee}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Btn variant="secondary" onClick={() => {}} className="w-full py-2.5 text-sm">View Session</Btn>
                  <Btn variant="danger" onClick={() => {}} className="w-full py-2.5 text-sm">End Session & Check Out</Btn>
                </div>
              </>
            ) : selectedTable.status === 'available' ? (
              <>
                <div className="space-y-2 text-sm mb-5">
                  <div className="flex justify-between">
                    <span className="text-[#6E6E73]">Capacity</span>
                    <span className="font-semibold">{selectedTable.capacity} players</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6E6E73]">Zone</span>
                    <span className="font-semibold">{selectedTable.zone} Area</span>
                  </div>
                  {selectedTable.features.map(f => (
                    <div key={f} className="text-[#6E6E73] text-xs">✓ {f}</div>
                  ))}
                </div>
                <Btn variant="primary" onClick={() => setShowWalkIn(true)} className="w-full py-2.5 text-sm">Assign Client</Btn>
              </>
            ) : selectedTable.status === 'reserved' ? (
              <>
                <div className="text-sm text-[#6E6E73] mb-4">Table has an upcoming reservation.</div>
                <Btn variant="primary" onClick={() => {}} className="w-full py-2.5 text-sm">Check In Client</Btn>
              </>
            ) : (
              <div className="text-sm text-[#6E6E73]">Table is currently unavailable.</div>
            )}
          </div>
        </div>
      )}

      {showWalkIn && selectedTable && (
        <WalkInModal
          table={selectedTable}
          onClose={() => setShowWalkIn(false)}
          onAssign={handleAssignWalkIn}
        />
      )}
      {sessionToast && <Toast message={sessionToast} onDone={() => setSessionToast(null)} />}
    </div>
  )
}

// ===================== STAFF CHECK-IN =====================

function StaffCheckInPage() {
  const [search, setSearch] = useState('')
  const [checkedIn, setCheckedIn] = useState<string | null>(null)
  const reservations = [
    { id: 'RSV-10247', time: '14:00', name: 'Pimchanok T.', players: 3, table: 'A3', status: 'Pending' },
    { id: 'RSV-10248', time: '14:00', name: 'Apinya W.', players: 4, table: 'B4', status: 'Pending' },
    { id: 'RSV-10249', time: '15:00', name: 'Chaiwat S.', players: 2, table: 'A1', status: 'Pending' },
    { id: 'RSV-10243', time: '13:00', name: 'Napat K.', players: 5, table: 'B3', status: 'Checked In' },
  ]

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-[#1D1D1F] mb-2">Client Check-In</h1>
      <p className="text-[#6E6E73] text-sm mb-6">Search by name, phone, email, or reservation ID</p>

      <div className="relative mb-8">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E6E73]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search name, phone, email, or reservation ID..."
          className="w-full pl-11 pr-4 py-3.5 border border-[#D2D2D7] rounded-2xl text-sm outline-none focus:border-[#0071E3] transition-colors"
        />
      </div>

      <h2 className="font-semibold text-[#1D1D1F] mb-3">Today's Reservations</h2>
      <div className="space-y-3">
        {reservations.filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.id.includes(search)).map(r => (
          <div key={r.id} className="bg-white border border-[#D2D2D7] rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-[#0071E3]/10 rounded-xl flex items-center justify-center text-[#0071E3] font-bold text-sm">
              {r.name.split(' ')[0][0]}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-semibold text-[#1D1D1F]">{r.name}</span>
                <span className="text-xs font-mono text-[#6E6E73]">{r.id}</span>
              </div>
              <div className="text-sm text-[#6E6E73]">
                {r.time} · {r.players} players · Table {r.table}
              </div>
            </div>
            {checkedIn === r.id || r.status === 'Checked In' ? (
              <span className="text-xs font-medium text-green-700 bg-green-100 px-3 py-1.5 rounded-xl flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Checked In
              </span>
            ) : (
              <Btn variant="primary" onClick={() => setCheckedIn(r.id)} className="px-4 py-2 text-sm flex-shrink-0">
                Check In
              </Btn>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ===================== STAFF ORDERS =====================

interface OrderRecord { id: string; name: string; date: string; items: number; total: number; method: string; status: string }

const ORDERS_DATA: OrderRecord[] = [
  { id: 'BG10249', name: 'James W.', date: '15 Aug', items: 1, total: 1890, method: 'Standard Delivery', status: 'New Orders' },
  { id: 'BG10248', name: 'Apinya W.', date: '15 Aug', items: 1, total: 1970, method: 'Store Pickup', status: 'Processing' },
  { id: 'BG10247', name: 'Chaiwat S.', date: '14 Aug', items: 2, total: 2290, method: 'Express Delivery', status: 'Shipped' },
  { id: 'BG10246', name: 'Mint P.', date: '14 Aug', items: 3, total: 3770, method: 'Store Pickup', status: 'Ready for Pickup' },
  { id: 'BG10245', name: 'Napat K.', date: '13 Aug', items: 1, total: 4890, method: 'Standard Delivery', status: 'Completed' },
]

const ORDER_STATUS_COLOR: Record<string, string> = {
  'New Orders': 'bg-blue-100 text-blue-700',
  'Processing': 'bg-amber-100 text-amber-700',
  'Ready for Pickup': 'bg-violet-100 text-violet-700',
  'Shipped': 'bg-indigo-100 text-indigo-700',
  'Completed': 'bg-green-100 text-green-700',
}

function ViewOrderModal({ order, onClose }: { order: OrderRecord; onClose: () => void }) {
  const productNames = ['Wingspan', 'Catan', 'Pandemic', 'Azul', 'Dixit']
  const items = Array.from({ length: order.items }, (_, i) => ({ name: productNames[i % productNames.length], qty: 1, price: Math.floor(order.total / order.items) }))
  return (
    <ModalShell title={`Order #${order.id}`} onClose={onClose}>
      <div className="space-y-3 mb-5">
        {[['Customer', order.name], ['Date', order.date], ['Delivery Method', order.method]].map(([l, v]) => (
          <div key={l} className="flex justify-between text-sm">
            <span className="text-[#6E6E73]">{l}</span>
            <span className="font-medium text-[#1D1D1F]">{v}</span>
          </div>
        ))}
        <div className="flex justify-between text-sm">
          <span className="text-[#6E6E73]">Status</span>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ORDER_STATUS_COLOR[order.status]}`}>{order.status}</span>
        </div>
      </div>
      <div className="border border-[#D2D2D7] rounded-xl overflow-hidden mb-4">
        <div className="bg-[#F5F5F7] px-4 py-2 text-xs font-semibold text-[#6E6E73] uppercase tracking-wide">Items</div>
        {items.map((item, i) => (
          <div key={i} className="flex justify-between items-center px-4 py-2.5 border-t border-[#D2D2D7] text-sm">
            <span className="text-[#1D1D1F]">{item.name}</span>
            <span className="font-semibold">{fmt(item.price)}</span>
          </div>
        ))}
        <div className="flex justify-between items-center px-4 py-3 border-t border-[#D2D2D7] bg-[#F5F5F7]">
          <span className="font-semibold text-[#1D1D1F]">Total</span>
          <span className="font-bold text-[#0071E3] text-base">{fmt(order.total)}</span>
        </div>
      </div>
      <Btn variant="secondary" onClick={onClose} className="w-full py-2.5 text-sm">Close</Btn>
    </ModalShell>
  )
}

function StaffOrdersPage() {
  const [tab, setTab] = useState('New Orders')
  const [viewOrder, setViewOrder] = useState<OrderRecord | null>(null)
  const tabs = ['New Orders', 'Processing', 'Ready for Pickup', 'Shipped', 'Completed']
  const filtered = tab === 'New Orders' ? ORDERS_DATA.filter(o => o.status === 'New Orders') : ORDERS_DATA.filter(o => o.status === tab)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-[#1D1D1F] mb-6">Order Management</h1>
      <div className="flex gap-2 flex-wrap mb-6">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t ? 'bg-[#1D1D1F] text-white' : 'bg-[#F5F5F7] text-[#6E6E73] hover:bg-gray-200'}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="bg-white border border-[#D2D2D7] rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F5F5F7] border-b border-[#D2D2D7]">
            <tr>
              {['Order ID', 'Customer', 'Date', 'Items', 'Total', 'Method', 'Status', 'Action'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-semibold text-[#6E6E73] text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10 text-[#6E6E73]">No orders</td></tr>
            ) : filtered.map(o => (
              <tr key={o.id} className="border-b border-[#D2D2D7] last:border-0 hover:bg-[#F5F5F7] transition-colors">
                <td className="px-4 py-3.5 font-mono font-semibold text-[#0071E3]">#{o.id}</td>
                <td className="px-4 py-3.5 font-medium text-[#1D1D1F]">{o.name}</td>
                <td className="px-4 py-3.5 text-[#6E6E73]">{o.date}</td>
                <td className="px-4 py-3.5 text-[#6E6E73]">{o.items} item{o.items > 1 ? 's' : ''}</td>
                <td className="px-4 py-3.5 font-semibold">{fmt(o.total)}</td>
                <td className="px-4 py-3.5 text-[#6E6E73]">{o.method}</td>
                <td className="px-4 py-3.5">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ORDER_STATUS_COLOR[o.status]}`}>{o.status}</span>
                </td>
                <td className="px-4 py-3.5">
                  <Btn variant="secondary" onClick={() => setViewOrder(o)} className="px-3 py-1.5 text-xs">View</Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {viewOrder && <ViewOrderModal order={viewOrder} onClose={() => setViewOrder(null)} />}
    </div>
  )
}

// ===================== STAFF PRODUCTS =====================

const PRODUCT_CATEGORIES = ['Strategy', 'Party', 'Family', 'Cooperative', 'Card Games', 'Abstract', 'Adventure', 'Expert']

function EditProductModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const parsePlayerRange = (s: string) => {
    const parts = s.replace(/\s/g, '').split('–')
    return { min: parseInt(parts[0]) || 1, max: parseInt(parts[parts.length - 1]) || 4 }
  }
  const initial = parsePlayerRange(product.players)
  const [playerMin, setPlayerMin] = useState(initial.min)
  const [playerMax, setPlayerMax] = useState(initial.max)

  return (
    <ModalShell title="Edit Product" onClose={onClose}>
      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#D2D2D7]">
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#F5F5F7] flex-shrink-0">
          <img src={product.image} alt="" className="w-full h-full object-cover" />
        </div>
        <div>
          <div className="font-semibold text-[#1D1D1F]">{product.name}</div>
          <div className="text-sm text-[#6E6E73]">{product.category}</div>
        </div>
      </div>
      <div className="space-y-3 mb-5">
        <div>
          <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Product Name</label>
          <input defaultValue={product.name} className="w-full border border-[#D2D2D7] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0071E3]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Category</label>
          <select defaultValue={product.category} className="w-full border border-[#D2D2D7] rounded-xl px-3 py-2.5 text-sm outline-none bg-white focus:border-[#0071E3]">
            {PRODUCT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Price (฿)</label>
            <input defaultValue={product.salePrice ?? product.price} type="number" min={0} className="w-full border border-[#D2D2D7] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0071E3]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Stock</label>
            <input defaultValue={product.stock} type="number" min={0} className="w-full border border-[#D2D2D7] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0071E3]" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Players</label>
          <div className="flex items-center gap-2">
            <input value={playerMin} onChange={e => setPlayerMin(Math.max(1, parseInt(e.target.value) || 1))} type="number" min={1} max={playerMax}
              className="w-full border border-[#D2D2D7] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0071E3] text-center" />
            <span className="text-sm text-[#6E6E73] flex-shrink-0">to</span>
            <input value={playerMax} onChange={e => setPlayerMax(Math.max(playerMin, parseInt(e.target.value) || playerMin))} type="number" min={playerMin} max={20}
              className="w-full border border-[#D2D2D7] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0071E3] text-center" />
            <span className="text-sm text-[#6E6E73] flex-shrink-0">players</span>
          </div>
          {playerMin > playerMax && (
            <p className="text-xs text-red-500 mt-1">Minimum must not exceed maximum.</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Difficulty</label>
          <select defaultValue={product.difficulty} className="w-full border border-[#D2D2D7] rounded-xl px-3 py-2.5 text-sm outline-none bg-white focus:border-[#0071E3]">
            {['Easy', 'Medium', 'Advanced', 'Expert'].map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-3">
        <Btn variant="secondary" onClick={onClose} className="flex-1 py-2.5 text-sm">Cancel</Btn>
        <Btn variant="primary" onClick={onClose} disabled={playerMin > playerMax} className="flex-1 py-2.5 text-sm">Save Changes</Btn>
      </div>
    </ModalShell>
  )
}

function StaffProductsPage() {
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1D1D1F]">Product Management</h1>
        <Btn variant="primary" onClick={() => {}} className="px-5 py-2.5 text-sm">+ Add New Product</Btn>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Products', value: '48', color: 'text-[#1D1D1F]' },
          { label: 'In Stock', value: '41', color: 'text-green-600' },
          { label: 'Low Stock', value: '6', color: 'text-orange-600' },
          { label: 'Out of Stock', value: '1', color: 'text-red-600' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-[#D2D2D7] rounded-2xl p-4">
            <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
            <div className="text-sm text-[#6E6E73] mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#D2D2D7] rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F5F5F7] border-b border-[#D2D2D7]">
            <tr>
              {['Product', 'Category', 'Price', 'Stock', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-semibold text-[#6E6E73] text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PRODUCTS.map(p => (
              <tr key={p.id} className="border-b border-[#D2D2D7] last:border-0 hover:bg-[#F5F5F7] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-[#F5F5F7] flex-shrink-0">
                      <img src={p.image} alt="" className="w-full h-full object-cover" />
                    </div>
                    <span className="font-medium text-[#1D1D1F]">{p.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-[#6E6E73]">{p.category}</td>
                <td className="px-4 py-3 font-semibold">{fmt(p.price)}</td>
                <td className="px-4 py-3">
                  <span className={`font-medium ${p.stock === 0 ? 'text-red-600' : p.stock <= 3 ? 'text-orange-600' : 'text-[#1D1D1F]'}`}>
                    {p.stock}
                  </span>
                </td>
                <td className="px-4 py-3"><StockBadge s={p.stock} /></td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Btn variant="secondary" onClick={() => setEditProduct(p)} className="px-3 py-1.5 text-xs">Edit</Btn>
                    <Btn variant="ghost" onClick={() => {}} className="px-3 py-1.5 text-xs">Stock</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editProduct && <EditProductModal product={editProduct} onClose={() => setEditProduct(null)} />}
    </div>
  )
}

// ===================== USER MANAGEMENT (Staff + Admin) =====================

interface UserRecord { id: string; name: string; email: string; phone: string; status: string; orders: number; reservations: number; visits: number; lastActivity: string }

const USERS_DATA: UserRecord[] = [
  { id: 'u1', name: 'Apinya Wongsak', email: 'apinya@example.com', phone: '081-234-5678', status: 'Active', orders: 5, reservations: 8, visits: 12, lastActivity: '15 Aug 2026' },
  { id: 'u2', name: 'James Walker', email: 'james@example.com', phone: '082-345-6789', status: 'Active', orders: 2, reservations: 3, visits: 5, lastActivity: '14 Aug 2026' },
  { id: 'u3', name: 'Mint Pattama', email: 'mint@example.com', phone: '083-456-7890', status: 'Active', orders: 8, reservations: 14, visits: 20, lastActivity: '15 Aug 2026' },
  { id: 'u4', name: 'Chaiwat Srisuk', email: 'chaiwat@example.com', phone: '084-567-8901', status: 'Inactive', orders: 1, reservations: 1, visits: 1, lastActivity: '1 Jul 2026' },
]

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 my-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[#1D1D1F]">{title}</h2>
          <button onClick={onClose} className="text-[#6E6E73] hover:text-[#1D1D1F]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ViewUserModal({ user, onClose, onRemove }: { user: UserRecord; onClose: () => void; onRemove?: () => void }) {
  return (
    <ModalShell title="User Profile" onClose={onClose}>
      <div className="flex items-center gap-3 mb-5 pb-5 border-b border-[#D2D2D7]">
        <div className="w-12 h-12 rounded-full bg-[#0071E3]/10 flex items-center justify-center text-[#0071E3] font-bold text-lg flex-shrink-0">{user.name[0]}</div>
        <div>
          <div className="font-semibold text-[#1D1D1F]">{user.name}</div>
          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${user.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{user.status}</span>
        </div>
      </div>
      <div className="space-y-3 text-sm mb-5">
        {[['Email', user.email], ['Phone', user.phone], ['Last Activity', user.lastActivity]].map(([l, v]) => (
          <div key={l} className="flex justify-between">
            <span className="text-[#6E6E73]">{l}</span>
            <span className="font-medium text-[#1D1D1F]">{v}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 bg-[#F5F5F7] rounded-xl p-4 mb-5">
        {[['Orders', user.orders], ['Reservations', user.reservations], ['Visits', user.visits]].map(([l, v]) => (
          <div key={l as string} className="text-center">
            <div className="text-lg font-bold text-[#1D1D1F]">{v}</div>
            <div className="text-xs text-[#6E6E73]">{l}</div>
          </div>
        ))}
      </div>
      {onRemove ? (
        <div className="flex gap-3">
          <Btn variant="secondary" onClick={onClose} className="flex-1 py-2.5 text-sm">Close</Btn>
          <Btn variant="danger" onClick={onRemove} className="flex-1 py-2.5 text-sm">Remove User</Btn>
        </div>
      ) : (
        <Btn variant="secondary" onClick={onClose} className="w-full py-2.5 text-sm">Close</Btn>
      )}
    </ModalShell>
  )
}

function RemoveUserModal({ user, onClose, onConfirm }: { user: UserRecord; onClose: () => void; onConfirm: () => void }) {
  const hasActiveSession = false
  const hasActiveReservation = user.reservations > 0 && user.status === 'Active'
  const hasPendingOrder = user.orders > 0 && user.status === 'Active'
  const isBlocked = hasActiveSession || hasActiveReservation || hasPendingOrder

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1D1D1F]">Remove this user?</h2>
            <div className="text-sm text-[#6E6E73]">{user.name} · {user.email}</div>
          </div>
        </div>

        {isBlocked ? (
          <div className="space-y-2 mb-5">
            <div className="text-sm font-medium text-red-600 mb-2">Cannot remove — active dependencies exist:</div>
            {hasActiveSession && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                🔴 Active play session in progress. Session must be completed before removal.
              </div>
            )}
            {hasActiveReservation && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm text-orange-700">
                🟠 {user.reservations} active reservation{user.reservations > 1 ? 's' : ''}. Resolve or cancel before removal.
              </div>
            )}
            {hasPendingOrder && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
                🟡 {user.orders} pending order{user.orders > 1 ? 's' : ''}. Complete or cancel before removal.
              </div>
            )}
            <Btn variant="secondary" onClick={onClose} className="w-full py-2.5 text-sm mt-3">Close</Btn>
          </div>
        ) : (
          <>
            <p className="text-sm text-[#6E6E73] mb-5 leading-relaxed">
              This action will remove the customer account from active User Management. Historical orders, reservations, payments, and completed play-session records will remain preserved for audit and operational history.
            </p>
            <div className="flex gap-3">
              <Btn variant="secondary" onClick={onClose} className="flex-1 py-2.5 text-sm">Cancel</Btn>
              <Btn variant="danger" onClick={onConfirm} className="flex-1 py-2.5 text-sm">Remove User</Btn>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  setTimeout(onDone, 3000)
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-[#1D1D1F] text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-[fadeIn_0.2s_ease]">
      <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
      {message}
    </div>
  )
}

function UserManagementPage({ isAdmin = false }: { isAdmin?: boolean }) {
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState(USERS_DATA)
  const [viewUser, setViewUser] = useState<UserRecord | null>(null)
  const [removeUser, setRemoveUser] = useState<UserRecord | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const filtered = users.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.includes(search) || u.phone.includes(search)
  )

  const handleRemoveConfirm = () => {
    if (!removeUser) return
    setUsers(prev => prev.filter(u => u.id !== removeUser.id))
    setRemoveUser(null)
    setToast('User removed successfully')
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1D1D1F]">Users</h1>
        <div className="text-sm text-[#6E6E73]">{filtered.length} accounts</div>
      </div>
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E6E73]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, phone..."
            className="w-full pl-10 pr-4 py-2.5 border border-[#D2D2D7] rounded-xl text-sm outline-none focus:border-[#0071E3]" />
        </div>
      </div>
      <div className="bg-white border border-[#D2D2D7] rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F5F5F7] border-b border-[#D2D2D7]">
            <tr>
              {['User', 'Email', 'Phone', 'Status', 'Orders', 'Reservations', 'Visits', 'Last Activity', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-semibold text-[#6E6E73] text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className="border-b border-[#D2D2D7] last:border-0 hover:bg-[#F5F5F7] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#0071E3]/10 flex items-center justify-center text-[#0071E3] font-bold text-xs flex-shrink-0">{u.name[0]}</div>
                    <span className="font-medium text-[#1D1D1F] whitespace-nowrap">{u.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-[#6E6E73]">{u.email}</td>
                <td className="px-4 py-3 text-[#6E6E73] whitespace-nowrap">{u.phone}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${u.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{u.status}</span>
                </td>
                <td className="px-4 py-3 text-center font-medium">{u.orders}</td>
                <td className="px-4 py-3 text-center font-medium">{u.reservations}</td>
                <td className="px-4 py-3 text-center font-medium">{u.visits}</td>
                <td className="px-4 py-3 text-[#6E6E73] whitespace-nowrap">{u.lastActivity}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    <Btn variant="secondary" onClick={() => setViewUser(u)} className="px-3 py-1.5 text-xs whitespace-nowrap">View</Btn>
                    <Btn variant={u.status === 'Active' ? 'ghost' : 'secondary'} onClick={() => {}} className={`px-3 py-1.5 text-xs whitespace-nowrap ${u.status === 'Active' ? 'text-red-500 hover:bg-red-50' : ''}`}>
                      {u.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {viewUser && <ViewUserModal user={viewUser} onClose={() => setViewUser(null)} onRemove={isAdmin ? () => { setViewUser(null); setRemoveUser(viewUser) } : undefined} />}
      {removeUser && <RemoveUserModal user={removeUser} onClose={() => setRemoveUser(null)} onConfirm={handleRemoveConfirm} />}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

// ===================== STAFF MANAGEMENT (Admin only) =====================

function StaffManagementPage() {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editStaff, setEditStaff] = useState<StaffMember | null>(null)
  const filtered = STAFF_LIST.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.email.includes(search)
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1D1D1F]">Staff Management</h1>
        <Btn variant="primary" onClick={() => { setEditStaff(null); setShowModal(true) }} className="px-5 py-2.5 text-sm">+ Add Staff</Btn>
      </div>
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E6E73]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search staff name or email..."
            className="w-full pl-10 pr-4 py-2.5 border border-[#D2D2D7] rounded-xl text-sm outline-none focus:border-[#0071E3]" />
        </div>
      </div>
      <div className="bg-white border border-[#D2D2D7] rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F5F5F7] border-b border-[#D2D2D7]">
            <tr>
              {['Staff Member', 'Email', 'Phone', 'Assigned Branch', 'Status', 'Last Login', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-semibold text-[#6E6E73] text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} className="border-b border-[#D2D2D7] last:border-0 hover:bg-[#F5F5F7] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-xs flex-shrink-0">{s.name[0]}</div>
                    <span className="font-medium text-[#1D1D1F] whitespace-nowrap">{s.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-[#6E6E73]">{s.email}</td>
                <td className="px-4 py-3 text-[#6E6E73] whitespace-nowrap">{s.phone}</td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-[#F5F5F7] border border-[#D2D2D7] px-2.5 py-1 rounded-full font-medium text-[#1D1D1F]">{s.branch}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{s.status}</span>
                </td>
                <td className="px-4 py-3 text-[#6E6E73] whitespace-nowrap">{s.lastLogin}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    <Btn variant="secondary" onClick={() => { setEditStaff(s); setShowModal(true) }} className="px-3 py-1.5 text-xs">Edit</Btn>
                    <Btn variant="ghost" onClick={() => {}} className="px-3 py-1.5 text-xs text-red-500 hover:bg-red-50">Remove</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[#1D1D1F]">{editStaff ? 'Edit Staff' : 'Add Staff'}</h2>
              <button onClick={() => setShowModal(false)} className="text-[#6E6E73] hover:text-[#1D1D1F]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[['First Name', editStaff?.name.split(' ')[0] ?? ''], ['Last Name', editStaff?.name.split(' ')[1] ?? '']].map(([label, val]) => (
                  <div key={label}>
                    <label className="block text-xs font-medium text-[#1D1D1F] mb-1">{label}</label>
                    <input defaultValue={val} className="w-full border border-[#D2D2D7] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0071E3]" />
                  </div>
                ))}
              </div>
              {[['Email', editStaff?.email ?? ''], ['Phone', editStaff?.phone ?? '']].map(([label, val]) => (
                <div key={label}>
                  <label className="block text-xs font-medium text-[#1D1D1F] mb-1">{label}</label>
                  <input defaultValue={val} className="w-full border border-[#D2D2D7] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0071E3]" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Assigned Branch</label>
                <BranchSearchDropdown value={BRANCHES.find(b => b.name === editStaff?.branch)?.id ?? null} onChange={() => {}} onlyActive />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#1D1D1F] mb-1">{editStaff ? 'Reset Password' : 'Password'}</label>
                <input type="password" placeholder={editStaff ? 'Leave blank to keep current' : 'Set password'} className="w-full border border-[#D2D2D7] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0071E3]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Account Status</label>
                <select defaultValue={editStaff?.status ?? 'Active'} className="w-full border border-[#D2D2D7] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0071E3] bg-white">
                  <option>Active</option><option>Inactive</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <Btn variant="secondary" onClick={() => setShowModal(false)} className="flex-1 py-2.5 text-sm">Cancel</Btn>
                <Btn variant="primary" onClick={() => setShowModal(false)} className="flex-1 py-2.5 text-sm">{editStaff ? 'Save Changes' : 'Add Staff'}</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ===================== BRANCH MANAGEMENT (Admin only) =====================

function BranchManagementPage() {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editBranch, setEditBranch] = useState<Branch | null>(null)
  const filtered = BRANCHES.filter(b =>
    !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.district.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1D1D1F]">Branches</h1>
        <Btn variant="primary" onClick={() => { setEditBranch(null); setShowModal(true) }} className="px-5 py-2.5 text-sm">+ Add Branch</Btn>
      </div>
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E6E73]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search branches..."
            className="w-full pl-10 pr-4 py-2.5 border border-[#D2D2D7] rounded-xl text-sm outline-none focus:border-[#0071E3]" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(b => (
          <div key={b.id} className={`bg-white border rounded-2xl p-5 ${b.status === 'inactive' ? 'border-[#D2D2D7] opacity-70' : 'border-[#D2D2D7]'}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-bold text-[#1D1D1F]">{b.name}</h3>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${b.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {b.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="text-xs text-[#6E6E73] font-mono">{b.code}</div>
              </div>
              <div className="flex gap-2">
                <Btn variant="secondary" onClick={() => { setEditBranch(b); setShowModal(true) }} className="px-3 py-1.5 text-xs">Edit</Btn>
                <Btn variant="ghost" onClick={() => {}} className="px-3 py-1.5 text-xs text-red-500 hover:bg-red-50">Remove</Btn>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div className="text-[#6E6E73]">📍 {b.address}, {b.district}</div>
              <div className="text-[#6E6E73]">🕐 {b.hours}</div>
              <div className="text-[#6E6E73]">📞 {b.phone}</div>
            </div>
            <div className="grid grid-cols-3 gap-2 border-t border-[#D2D2D7] pt-3">
              {[
                { label: 'Tables', value: b.tables },
                { label: 'Staff', value: b.staff },
                { label: 'Today', value: b.reservationsToday },
              ].map(k => (
                <div key={k.label} className="text-center">
                  <div className="font-bold text-[#1D1D1F] text-lg">{k.value}</div>
                  <div className="text-xs text-[#6E6E73]">{k.label}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Branch Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 my-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[#1D1D1F]">{editBranch ? 'Edit Branch' : 'Add Branch'}</h2>
              <button onClick={() => setShowModal(false)} className="text-[#6E6E73] hover:text-[#1D1D1F]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-3">
              {[
                ['Branch Name', editBranch?.name ?? ''],
                ['Branch Code', editBranch?.code ?? ''],
                ['Address', editBranch?.address ?? ''],
                ['District', editBranch?.district ?? ''],
                ['Phone', editBranch?.phone ?? ''],
                ['Opening Hours', editBranch?.hours ?? ''],
              ].map(([label, val]) => (
                <div key={label}>
                  <label className="block text-xs font-medium text-[#1D1D1F] mb-1">{label}</label>
                  <input defaultValue={val} className="w-full border border-[#D2D2D7] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0071E3]" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Branch Status</label>
                  <select defaultValue={editBranch?.status ?? 'active'} className="w-full border border-[#D2D2D7] rounded-xl px-3 py-2.5 text-sm outline-none bg-white focus:border-[#0071E3]">
                    <option value="active">Active</option><option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Allow Reservations</label>
                  <select className="w-full border border-[#D2D2D7] rounded-xl px-3 py-2.5 text-sm outline-none bg-white focus:border-[#0071E3]">
                    <option>Yes</option><option>No</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Btn variant="secondary" onClick={() => setShowModal(false)} className="flex-1 py-2.5 text-sm">Cancel</Btn>
                <Btn variant="primary" onClick={() => setShowModal(false)} className="flex-1 py-2.5 text-sm">Save Branch</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ===================== ADMIN LIVE TABLES =====================

function AdminLiveTablesPage() {
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>('central')
  const [selectedTable, setSelectedTable] = useState<TableData | null>(null)
  const [showAddTable, setShowAddTable] = useState(false)

  const statusConfig = {
    available: { bg: 'bg-green-50', border: 'border-green-300', label: 'Available', dot: 'bg-green-500' },
    reserved: { bg: 'bg-orange-50', border: 'border-orange-300', label: 'Reserved', dot: 'bg-orange-500' },
    occupied: { bg: 'bg-red-50', border: 'border-red-300', label: 'Occupied', dot: 'bg-red-500' },
    unavailable: { bg: 'bg-gray-100', border: 'border-gray-300', label: 'Unavailable', dot: 'bg-gray-400' },
  }

  return (
    <div className="p-6 flex gap-6">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[#1D1D1F]">Live Tables</h1>
          <Btn variant="secondary" onClick={() => setShowAddTable(true)} className="px-4 py-2 text-sm">+ Add Table</Btn>
        </div>

        {/* Branch Selector */}
        <div className="flex items-center gap-3 mb-5 bg-[#F5F5F7] border border-[#D2D2D7] rounded-2xl p-4">
          <span className="text-sm font-medium text-[#1D1D1F] whitespace-nowrap">Branch:</span>
          <div className="flex-1 max-w-xs">
            <BranchSearchDropdown value={selectedBranchId} onChange={setSelectedBranchId} placeholder="Select branch..." onlyActive />
          </div>
          {selectedBranchId && (
            <div className="text-xs text-[#6E6E73] ml-2">
              {BRANCHES.find(b => b.id === selectedBranchId)?.district}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex gap-5 mb-5 text-xs font-medium">
          {Object.entries(statusConfig).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${v.dot}`} />
              <span className="text-[#6E6E73]">{v.label}</span>
            </div>
          ))}
        </div>

        {!selectedBranchId ? (
          <div className="bg-[#F5F5F7] rounded-2xl p-16 text-center text-[#6E6E73]">
            <div className="text-4xl mb-3">🏢</div>
            <div className="font-medium">Select a branch to view its floor plan</div>
          </div>
        ) : (
          <div className="bg-[#F5F5F7] rounded-2xl p-6 space-y-8">
            {['Window', 'Main', 'Corner'].map(zone => (
              <div key={zone}>
                <div className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wider mb-3">{zone} Area</div>
                <div className="flex gap-4 flex-wrap">
                  {TABLES.filter(t => t.zone === zone).map(t => {
                    const cfg = statusConfig[t.status]
                    const isActive = selectedTable?.id === t.id
                    return (
                      <button key={t.id} onClick={() => setSelectedTable(isActive ? null : t)}
                        className={`${cfg.bg} border-2 ${isActive ? 'border-[#0071E3] ring-2 ring-[#0071E3]/30' : cfg.border} rounded-xl p-4 text-left transition-all hover:shadow-md hover:-translate-y-0.5 ${zone === 'Corner' ? 'w-28' : 'w-24'}`}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                          <span className="font-bold text-[#1D1D1F] text-sm">{t.id}</span>
                        </div>
                        {t.status === 'occupied' && t.client ? (
                          <>
                            <div className="text-[10px] font-medium text-[#1D1D1F] truncate">{t.client}</div>
                            <div className="text-[10px] text-[#6E6E73]">{t.players}p · {t.elapsed}</div>
                            <div className="text-[10px] font-semibold text-red-600 mt-1">฿{t.fee}</div>
                          </>
                        ) : (
                          <>
                            <div className="text-[10px] text-[#6E6E73]">{t.capacity}p</div>
                            <div className="text-[10px] font-medium text-[#6E6E73] mt-1">{cfg.label}</div>
                          </>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            <div className="border-t-4 border-[#D2D2D7] pt-3 text-center text-xs font-semibold text-[#6E6E73] uppercase tracking-widest">COUNTER / ENTRANCE</div>
          </div>
        )}
      </div>

      {/* Side Panel */}
      {selectedTable && (
        <div className="w-64 flex-shrink-0">
          <div className="bg-white border border-[#D2D2D7] rounded-2xl p-5 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#1D1D1F]">Table {selectedTable.id}</h3>
              <button onClick={() => setSelectedTable(null)} className="text-[#6E6E73] hover:text-[#1D1D1F]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-2.5 h-2.5 rounded-full ${statusConfig[selectedTable.status].dot}`} />
              <span className="text-sm font-medium text-[#1D1D1F]">{statusConfig[selectedTable.status].label}</span>
            </div>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between"><span className="text-[#6E6E73]">Capacity</span><span className="font-semibold">{selectedTable.capacity}p</span></div>
              <div className="flex justify-between"><span className="text-[#6E6E73]">Zone</span><span className="font-semibold">{selectedTable.zone}</span></div>
              {selectedTable.status === 'occupied' && <>
                <div className="flex justify-between"><span className="text-[#6E6E73]">Client</span><span className="font-semibold">{selectedTable.client}</span></div>
                <div className="flex justify-between"><span className="text-[#6E6E73]">Duration</span><span className="font-semibold">{selectedTable.elapsed}</span></div>
                <div className="flex justify-between border-t border-[#D2D2D7] pt-2"><span className="text-[#6E6E73]">Fee</span><span className="font-bold text-[#0071E3]">฿{selectedTable.fee}</span></div>
              </>}
            </div>
            {/* Admin Table Management Controls */}
            <div className="space-y-2 border-t border-[#D2D2D7] pt-4">
              <div className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wide mb-2">Admin Controls</div>
              {selectedTable.status === 'occupied' && <Btn variant="danger" onClick={() => {}} className="w-full py-2 text-xs">End Session & Check Out</Btn>}
              {selectedTable.status === 'available' && <>
                <Btn variant="primary" onClick={() => setShowAddTable(true)} className="w-full py-2 text-xs">Edit Table</Btn>
                <Btn variant="secondary" onClick={() => {}} className="w-full py-2 text-xs text-orange-600">Mark Unavailable</Btn>
              </>}
              {selectedTable.status === 'unavailable' && <Btn variant="secondary" onClick={() => {}} className="w-full py-2 text-xs text-green-600">Restore to Available</Btn>}
              {selectedTable.status !== 'available' && <Btn variant="secondary" onClick={() => setShowAddTable(true)} className="w-full py-2 text-xs">Edit Table</Btn>}
              <Btn variant="ghost" onClick={() => {}} className="w-full py-2 text-xs text-red-500 hover:bg-red-50">Remove Table</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Add Table Modal */}
      {showAddTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[#1D1D1F]">Add Table</h2>
              <button onClick={() => setShowAddTable(false)} className="text-[#6E6E73] hover:text-[#1D1D1F]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-3">
              {[['Table Name / Code', 'e.g. D1'], ['Capacity (max players)', 'e.g. 6']].map(([label, ph]) => (
                <div key={label}>
                  <label className="block text-xs font-medium text-[#1D1D1F] mb-1">{label}</label>
                  <input placeholder={ph} className="w-full border border-[#D2D2D7] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0071E3]" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Zone / Area</label>
                <select className="w-full border border-[#D2D2D7] rounded-xl px-3 py-2.5 text-sm outline-none bg-white focus:border-[#0071E3]">
                  <option>Window</option><option>Main</option><option>Corner</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Features</label>
                <input placeholder="e.g. Near Window, Power Outlet" className="w-full border border-[#D2D2D7] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0071E3]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Initial Status</label>
                <select className="w-full border border-[#D2D2D7] rounded-xl px-3 py-2.5 text-sm outline-none bg-white focus:border-[#0071E3]">
                  <option>Available</option><option>Unavailable</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <Btn variant="secondary" onClick={() => setShowAddTable(false)} className="flex-1 py-2.5 text-sm">Cancel</Btn>
                <Btn variant="primary" onClick={() => setShowAddTable(false)} className="flex-1 py-2.5 text-sm">Add Table</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ===================== ADMIN DASHBOARD =====================

function AdminDashboardPage({ navigate }: { navigate: (p: Page) => void }) {
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const selectedBranch = BRANCHES.find(b => b.id === selectedBranchId)

  const globalKpis = [
    { label: 'Total Branches', value: BRANCHES.filter(b => b.status === 'active').length.toString(), sub: `${BRANCHES.length} total`, color: 'text-violet-600' },
    { label: 'Total Staff', value: STAFF_LIST.filter(s => s.status === 'Active').length.toString(), sub: 'active accounts', color: 'text-blue-600' },
    { label: 'Today Reservations', value: BRANCHES.reduce((s, b) => s + b.reservationsToday, 0).toString(), sub: 'all branches', color: 'text-indigo-600' },
    { label: 'Total Sales Today', value: '฿98,420', sub: 'all branches', color: 'text-emerald-600' },
  ]

  const branchKpis = selectedBranch ? [
    { label: 'Available Tables', value: '8', sub: `of ${selectedBranch.tables} total`, color: 'text-green-600' },
    { label: 'Active Sessions', value: '5', sub: 'playing now', color: 'text-blue-600' },
    { label: 'Reservations Today', value: selectedBranch.reservationsToday.toString(), sub: '3 upcoming', color: 'text-violet-600' },
    { label: 'Active Staff', value: selectedBranch.staff.toString(), sub: 'on duty', color: 'text-amber-600' },
  ] : []

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1D1D1F]">Admin Dashboard</h1>
        <p className="text-[#6E6E73] text-sm mt-0.5">Thursday, 14 August 2026 · 17:24</p>
      </div>

      {/* Global KPIs */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-[#6E6E73] uppercase tracking-wide mb-3">Network Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {globalKpis.map(k => (
            <div key={k.label} className="bg-white border border-[#D2D2D7] rounded-2xl p-5">
              <div className={`text-2xl font-bold ${k.color} mb-1`}>{k.value}</div>
              <div className="font-medium text-[#1D1D1F] text-sm">{k.label}</div>
              <div className="text-xs text-[#6E6E73] mt-0.5">{k.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Branch-scoped view */}
      <div className="mb-5 flex items-center gap-4">
        <h2 className="text-sm font-semibold text-[#6E6E73] uppercase tracking-wide whitespace-nowrap">Branch Detail</h2>
        <div className="w-64">
          <BranchSearchDropdown value={selectedBranchId} onChange={setSelectedBranchId} placeholder="Select a branch..." onlyActive />
        </div>
      </div>
      {!selectedBranchId ? (
        <div className="bg-[#F5F5F7] rounded-2xl p-10 text-center text-[#6E6E73]">
          <div className="text-3xl mb-2">🏢</div>
          <div className="text-sm">Select a branch to view branch-specific metrics</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {branchKpis.map(k => (
              <div key={k.label} className="bg-white border border-[#D2D2D7] rounded-2xl p-5">
                <div className={`text-2xl font-bold ${k.color} mb-1`}>{k.value}</div>
                <div className="font-medium text-[#1D1D1F] text-sm">{k.label}</div>
                <div className="text-xs text-[#6E6E73] mt-0.5">{k.sub}</div>
              </div>
            ))}
          </div>
          <div className="bg-white border border-[#D2D2D7] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[#1D1D1F]">{selectedBranch?.name} — Quick Actions</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              <Btn variant="primary" onClick={() => navigate('admin-tables')} className="px-4 py-2 text-sm">View Live Tables →</Btn>
              <Btn variant="secondary" onClick={() => navigate('admin-checkin')} className="px-4 py-2 text-sm">Check-In →</Btn>
              <Btn variant="secondary" onClick={() => navigate('admin-orders')} className="px-4 py-2 text-sm">Orders →</Btn>
            </div>
          </div>
        </>
      )}

      {/* Branches list */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#6E6E73] uppercase tracking-wide">All Branches</h2>
          <button onClick={() => navigate('admin-branches')} className="text-xs text-[#0071E3] hover:underline">Manage →</button>
        </div>
        <div className="bg-white border border-[#D2D2D7] rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F5F7] border-b border-[#D2D2D7]">
              <tr>
                {['Branch', 'Location', 'Tables', 'Staff', 'Reservations Today', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 font-semibold text-[#6E6E73] text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BRANCHES.map(b => (
                <tr key={b.id} className="border-b border-[#D2D2D7] last:border-0 hover:bg-[#F5F5F7] transition-colors">
                  <td className="px-4 py-3 font-medium text-[#1D1D1F]">{b.name}</td>
                  <td className="px-4 py-3 text-[#6E6E73]">{b.district}</td>
                  <td className="px-4 py-3 font-medium">{b.tables}</td>
                  <td className="px-4 py-3 font-medium">{b.staff}</td>
                  <td className="px-4 py-3 font-medium">{b.reservationsToday}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${b.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {b.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ===================== MAIN APP =====================

export default function App() {
  const [page, setPage] = useState<Page>('home')
  const [prevPage, setPrevPage] = useState<Page>('home')
  const [cart, setCart] = useState<CartItem[]>([])
  const [userMode, setUserMode] = useState<UserMode>('guest')
  const [reserveFromBranch, setReserveFromBranch] = useState<string | null>(null)

  const navigate = (p: Page) => {
    setPrevPage(page)
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleLogout = () => {
    setUserMode('guest')
    setCart([])
    setPrevPage('home')
    setPage('login')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleReserveFromStore = (branchId: string) => {
    setReserveFromBranch(branchId)
    setPrevPage(page)
    setPage('reserve')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product, quantity: 1 }]
    })
  }

  const updateCart = (id: string, qty: number) => {
    setCart(prev => prev.map(i => i.product.id === id ? { ...i, quantity: qty } : i))
  }

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.product.id !== id))
  }

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)

  const isStaffPage = page.startsWith('staff-')
  const isAdminPage = page.startsWith('admin-')
  const isFullPage = page === 'login' || page === 'register'

  // Render login/register without nav
  if (isFullPage) {
    if (page === 'login') return (
      <LoginPage
        navigate={navigate}
        onLogin={role => {
          setUserMode(role)
          if (role === 'admin') navigate('admin-dashboard')
          else if (role === 'staff') navigate('staff-dashboard')
          else navigate('account')
        }}
        prevPage={prevPage}
      />
    )
    if (page === 'register') return <RegisterPage navigate={navigate} />
  }

  // Admin layout
  if (isAdminPage) {
    return (
      <div className="flex min-h-screen bg-[#F5F5F7]">
        <AdminSidebar page={page} navigate={navigate} onLogout={handleLogout} />
        <main className="flex-1 ml-56 overflow-auto">
          {page === 'admin-dashboard' && <AdminDashboardPage navigate={navigate} />}
          {page === 'admin-tables' && <AdminLiveTablesPage />}
          {page === 'admin-checkin' && <StaffCheckInPage />}
          {page === 'admin-orders' && <StaffOrdersPage />}
          {page === 'admin-products' && <StaffProductsPage />}
          {page === 'admin-users' && <UserManagementPage isAdmin />}
          {page === 'admin-staff' && <StaffManagementPage />}
          {page === 'admin-branches' && <BranchManagementPage />}
        </main>
      </div>
    )
  }

  // Staff layout
  if (isStaffPage) {
    return (
      <div className="flex min-h-screen bg-[#F5F5F7]">
        <StaffSidebar page={page} navigate={navigate} onLogout={handleLogout} />
        <main className="flex-1 ml-56 overflow-auto">
          {page === 'staff-dashboard' && <StaffDashboardPage navigate={navigate} />}
          {page === 'staff-tables' && <StaffLiveTablesPage />}
          {page === 'staff-checkin' && <StaffCheckInPage />}
          {page === 'staff-orders' && <StaffOrdersPage />}
          {page === 'staff-products' && <StaffProductsPage />}
          {page === 'staff-users' && <UserManagementPage />}
        </main>
      </div>
    )
  }

  // Customer layout
  return (
    <div className="min-h-screen bg-white">
      <Nav page={page} cartCount={cartCount} navigate={navigate} userMode={userMode} />
      <main className={page !== 'home' ? 'pt-14' : 'pt-14'}>
        {page === 'home' && <HomePage navigate={navigate} onAddToCart={addToCart} />}
        {page === 'shop' && <ShopPage navigate={navigate} onAddToCart={addToCart} />}
        {page === 'product' && <ProductPage navigate={navigate} onAddToCart={addToCart} />}
        {page === 'cart' && <CartPage cart={cart} navigate={navigate} onUpdate={updateCart} onRemove={removeFromCart} />}
        {page === 'checkout' && <CheckoutPage cart={cart} navigate={navigate} />}
        {page === 'order-confirm' && <OrderConfirmPage navigate={navigate} />}
        {page === 'reserve' && <ReservePage key={reserveFromBranch ?? 'none'} navigate={navigate} initialBranchId={reserveFromBranch} />}
        {page === 'reserve-confirm' && <ReserveConfirmPage navigate={navigate} />}
        {page === 'account' && <AccountPage navigate={navigate} onLogout={handleLogout} />}
        {page === 'my-orders' && <MyOrdersPage navigate={navigate} />}
        {page === 'my-reservations' && <MyReservationsPage navigate={navigate} />}
        {page === 'visit-store' && <VisitStorePage navigate={navigate} onReserve={handleReserveFromStore} />}
      </main>
    </div>
  )
}
