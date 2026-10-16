import { NavLink } from 'react-router-dom'
import BoardlyMark from '@/components/branding/BoardlyMark'

export type BackOfficeLink = {
  label: string
  path: string
  icon: 'dashboard' | 'tables' | 'checkin' | 'orders' | 'products' | 'users' | 'staff' | 'branches'
}

export default function BackOfficeSidebar({ title, sections, onLogout }: { title: string; sections: Array<{ title?: string; links: BackOfficeLink[] }>; onLogout: () => void }) {
  const links = sections.flatMap(section => section.links)
  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-black/10 bg-[#1D1D1F] text-white md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2 font-bold"><BoardlyMark className="text-xl" /><span>Boardly</span><span className="text-xs font-normal text-white/40">{title}</span></div>
          <button type="button" onClick={onLogout} className="rounded-lg px-3 py-2 text-xs font-medium text-white/60 hover:bg-white/10 hover:text-white">Logout</button>
        </div>
        <nav className="flex overflow-x-auto px-2 pb-2" aria-label={`${title} navigation`}>
          {links.map(link => <NavItem key={link.path} link={link} compact />)}
        </nav>
      </header>
      <aside className="fixed left-0 top-0 z-40 hidden h-full w-56 flex-col bg-[#1D1D1F] text-white md:flex">
        <div className="border-b border-white/10 px-5 py-5">
          <div className="flex items-center gap-2 text-base font-bold"><BoardlyMark className="text-xl" /><span>Boardly</span></div>
          <div className="mt-0.5 text-xs text-white/40">{title}</div>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label={`${title} navigation`}>
          {sections.map((section, index) => <div key={section.title ?? index}>{section.title && <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/30">{section.title}</div>}<div className="space-y-1">{section.links.map(link => <NavItem key={link.path} link={link} />)}</div></div>)}
        </nav>
        <div className="px-3 pb-5">
          <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white"><LogoutIcon /><span>Logout</span></button>
        </div>
      </aside>
    </>
  )
}

function NavItem({ link, compact = false }: { link: BackOfficeLink; compact?: boolean }) {
  return <NavLink to={link.path} end={link.path === '/staff' || link.path === '/admin'} className={({ isActive }) => `${compact ? 'mx-0.5 flex-shrink-0 px-3 py-2 text-xs' : 'w-full px-3 py-2.5 text-sm'} flex items-center gap-2.5 rounded-xl font-medium transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}><NavIcon name={link.icon} /><span>{link.label}</span></NavLink>
}

function NavIcon({ name }: { name: BackOfficeLink['icon'] }) {
  const paths: Record<BackOfficeLink['icon'], React.ReactNode> = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    tables: <><path d="M4 9h16M6 9l-2 11M18 9l2 11M8 4h8l2 5H6l2-5z" /></>,
    checkin: <><path d="M20 6 9 17l-5-5" /><path d="M16 6h4v4" /></>,
    orders: <><path d="M6 2h12v20H6z" /><path d="M9 7h6M9 11h6M9 15h4" /></>,
    products: <><path d="M4 7l8-4 8 4-8 4-8-4z" /><path d="M4 7v10l8 4 8-4V7M12 11v10" /></>,
    users: <><circle cx="9" cy="8" r="4" /><path d="M2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 8M18 14a6 6 0 0 1 4 5.7" /></>,
    staff: <><circle cx="12" cy="7" r="4" /><path d="M5 21a7 7 0 0 1 14 0M17 11l2 2 3-3" /></>,
    branches: <><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 9h1M14 9h1M9 12h1M14 12h1" /></>,
  }
  return <svg aria-hidden="true" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function LogoutIcon() {
  return <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17l5-5-5-5M15 12H3M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" /></svg>
}
