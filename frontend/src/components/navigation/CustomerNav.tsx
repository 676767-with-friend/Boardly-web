import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import BoardlyMark from '@/components/branding/BoardlyMark'

export default function CustomerNav({ cartCount, userMode }: { cartCount: number, userMode: 'guest' | 'customer' | 'staff' | 'admin' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const page = location.pathname

  const [menuOpen, setMenuOpen] = useState(false)
  const navLinks = [
    { label: 'Shop', page: '/shop' },
    { label: 'Reserve a Table', page: '/reserve' },
    { label: 'Visit Store', page: '/stores' },
  ]
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#D2D2D7]/60">
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-14">
        <button onClick={() => navigate("/")} className="font-bold text-lg text-[#1D1D1F] tracking-tight flex items-center gap-2">
          <BoardlyMark className="text-2xl" />
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
          <button onClick={() => navigate("/shop")} className="p-2 rounded-xl hover:bg-[#F5F5F7] transition-colors">
            <svg className="w-5 h-5 text-[#1D1D1F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button onClick={() => navigate(userMode === "guest" ? "/login" : "/account")} className="p-2 rounded-xl hover:bg-[#F5F5F7] transition-colors">
            <svg className="w-5 h-5 text-[#1D1D1F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>
          <button onClick={() => navigate("/cart")} className="relative p-2 rounded-xl hover:bg-[#F5F5F7] transition-colors">
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
