import { useState } from 'react'

type BranchOption = { id: string; name: string; district: string; status?: string; hours?: string }

export default function BranchSearchDropdown({ value, onChange, placeholder = 'Search or select a branch...', onlyActive = false, branches }: {
  value: string | null; onChange: (id: string) => void; placeholder?: string; onlyActive?: boolean; branches: BranchOption[]
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const options = branches.filter(branch => (!onlyActive || branch.status === 'active') && (branch.name.toLowerCase().includes(query.toLowerCase()) || branch.district.toLowerCase().includes(query.toLowerCase())))
  const selected = branches.find(branch => branch.id === value)

  return (
    <div className="relative">
      <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(current => !current)} onKeyDown={event => { if (event.key === 'Escape') setOpen(false) }}
        className="w-full flex items-center justify-between gap-3 border border-[#D2D2D7] rounded-xl px-4 py-3 text-sm bg-white text-left outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-blue-100 hover:border-[#9B9BA1] transition-colors">
        {selected ? <span className="min-w-0"><span className="block font-medium text-[#1D1D1F] truncate">{selected.name}</span><span className="block text-xs text-[#6E6E73] truncate">{selected.hours ? `${selected.district} - ${selected.hours}` : selected.district}</span></span> : <span className="text-[#6E6E73]">{placeholder}</span>}
        <svg aria-hidden="true" className={`w-4 h-4 text-[#6E6E73] flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && <div className="absolute z-50 mt-1 w-full bg-white border border-[#D2D2D7] rounded-xl shadow-xl overflow-hidden" onKeyDown={event => { if (event.key === 'Escape') setOpen(false) }}>
        <div className="p-2 border-b border-[#D2D2D7]"><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search branch..." className="w-full px-3 py-2 text-sm rounded-lg border border-[#D2D2D7] outline-none focus:border-[#0071E3]" /></div>
        <div className="max-h-52 overflow-y-auto" role="listbox" aria-label="Branches">
          {options.length === 0 ? <div className="px-4 py-3 text-sm text-[#6E6E73]">No branches found</div> : options.map(branch => <button key={branch.id} type="button" role="option" aria-selected={value === branch.id} onClick={() => { onChange(branch.id); setOpen(false); setQuery('') }} className={`w-full text-left px-4 py-3 hover:bg-[#F5F5F7] focus:bg-blue-50 focus:outline-none transition-colors border-b border-[#D2D2D7]/50 last:border-0 ${value === branch.id ? 'bg-blue-50' : ''}`}><span className="block font-medium text-[#1D1D1F] text-sm">{branch.name}</span><span className="block text-xs text-[#6E6E73] mt-0.5">{branch.hours ? `${branch.district} - ${branch.hours}` : branch.district}</span></button>)}
        </div>
      </div>}
    </div>
  )
}
