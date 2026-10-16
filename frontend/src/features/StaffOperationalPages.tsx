import { useEffect, useState } from "react"
import { Btn } from "@/components/ui"
import { staffApi, type StaffBranch, type UserSummary } from "@/services/managementApi"
import {
  staffReservationsApi,
  type CheckoutPreview,
  type LiveTable,
  type StaffReservation,
} from "@/services/reservationsApi"

const inputClass = "w-full rounded-xl border border-[#D2D2D7] bg-white px-3.5 py-3 text-sm text-[#1D1D1F] outline-none focus:border-[#0071E3]"
const statusStyle = {
  available: { bg: "bg-green-50", border: "border-green-300", dot: "bg-green-500", text: "text-green-700" },
  reserved: { bg: "bg-orange-50", border: "border-orange-300", dot: "bg-orange-500", text: "text-orange-700" },
  occupied: { bg: "bg-red-50", border: "border-red-300", dot: "bg-red-500", text: "text-red-700" },
  unavailable: { bg: "bg-gray-100", border: "border-gray-300", dot: "bg-gray-400", text: "text-gray-600" },
}

const errorMessage = (error: unknown, fallback: string) => typeof error === "object" && error !== null && "message" in error ? String(error.message) : fallback
const money = (value: number, currency = "THB") => new Intl.NumberFormat("en-TH", { style: "currency", currency, maximumFractionDigits: 0 }).format(value)
const dateTime = (value: string) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(value))
const time = (value: string) => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }).format(new Date(value))
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date())
const duration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remaining = seconds % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`
}

export function StaffLiveTablesPage({ mode = "staff", refreshKey = 0, onManageTable }: { mode?: "staff" | "manager" | "admin"; refreshKey?: number; onManageTable?: (table: LiveTable | null, branchId: string) => void }) {
  const [branches, setBranches] = useState<StaffBranch[]>([])
  const [branchId, setBranchId] = useState("")
  const [walkInPlayers, setWalkInPlayers] = useState(4)
  const [tables, setTables] = useState<LiveTable[]>([])
  const [selected, setSelected] = useState<LiveTable | null>(null)
  const [walkIn, setWalkIn] = useState<LiveTable | null>(null)
  const [checkout, setCheckout] = useState<LiveTable | null>(null)
  const [loadedAt, setLoadedAt] = useState(Date.now())
  const [clock, setClock] = useState(Date.now())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  useEffect(() => { if (refreshKey > 0 && branchId) void load(branchId) }, [refreshKey])

  const load = async (id: string, players = walkInPlayers) => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const items = await staffReservationsApi.liveTables(id, players)
      setTables(items)
      setLoadedAt(Date.now())
      setSelected(current => current ? items.find(item => item.id === current.id) ?? null : null)
    } catch (next) {
      setTables([])
      setError(errorMessage(next, "Unable to load live tables."))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    staffApi.branches().then(items => {
      setBranches(items)
      setBranchId(items[0]?.id ?? "")
      if (items[0]) void load(items[0].id, 4)
    }).catch(next => {
      setError(errorMessage(next, "Unable to load assigned branches."))
      setLoading(false)
    })
  }, [])

  const elapsed = (table: LiveTable) => table.elapsedSeconds + Math.max(0, Math.floor((clock - loadedAt) / 1000))
  const zones = Array.from(new Set(tables.map(table => table.zone)))

  return <div className="flex gap-6 p-4 sm:p-6">
    <div className="min-w-0 flex-1">
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><h1 className="text-2xl font-bold text-[#1D1D1F]">Live Tables</h1><p className="mt-1 text-sm text-[#6E6E73]">{mode === "staff" ? "Database-derived table, reservation, and session state." : "Live floor state with physical table management."}</p></div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-medium text-[#6E6E73]">Assigned branch<select value={branchId} onChange={event => { setBranchId(event.target.value); void load(event.target.value) }} className="mt-1 block h-11 min-w-48 rounded-xl border border-[#D2D2D7] bg-white px-3 text-sm text-[#1D1D1F]">{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
          <label className="text-xs font-medium text-[#6E6E73]">Party size<select value={walkInPlayers} onChange={event => { const players = Number(event.target.value); setWalkInPlayers(players); void load(branchId, players) }} className="mt-1 block h-11 w-24 rounded-xl border border-[#D2D2D7] bg-white px-3 text-sm font-semibold">{Array.from({ length: 12 }, (_, index) => index + 1).map(players => <option key={players}>{players}</option>)}</select></label>
          {onManageTable && <Btn variant="primary" onClick={() => onManageTable(null, branchId)} className="h-11 whitespace-nowrap px-4">+ Add Table</Btn>}
        </div>
      </div>
      <div className="mb-5 flex flex-wrap gap-5 text-xs font-medium">{(Object.keys(statusStyle) as LiveTable["status"][]).map(status => <span key={status} className="flex items-center gap-1.5 capitalize text-[#6E6E73]"><span className={`h-2.5 w-2.5 rounded-full ${statusStyle[status].dot}`} />{status}</span>)}</div>
      {error && <Notice>{error}</Notice>}
      {loading ? <Loading>Loading live tables...</Loading> : <div className="space-y-8 rounded-2xl bg-[#F5F5F7] p-4 sm:p-6">
        {zones.map(zone => <section key={zone}><h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#6E6E73]">{zone} Area</h2><div className="flex flex-wrap gap-3 sm:gap-4">{tables.filter(table => table.zone === zone).map(table => {
          const style = statusStyle[table.status]
          const active = selected?.id === table.id
          const runtime = table.status === "occupied" ? elapsed(table) : 0
          return <button key={table.id} type="button" onClick={() => setSelected(active ? null : table)} className={`min-h-28 w-32 rounded-xl border-2 p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${style.bg} ${active ? "border-[#0071E3] ring-2 ring-[#0071E3]/20" : style.border}`}>
            <div className="mb-2 flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${style.dot}`} /><strong className="text-sm text-[#1D1D1F]">{table.code}</strong></div>
            {table.status === "occupied" ? <><div className="truncate text-[10px] font-medium">{table.client}</div><div className="text-[10px] text-[#6E6E73]">{table.players} players</div><div className="mt-1 font-mono text-[11px] font-semibold text-red-600">{duration(runtime)}</div></> : table.status === "reserved" ? <><div className="truncate text-[10px] font-medium">{table.client}</div><div className="text-[10px] text-[#6E6E73]">{table.reservationStartsAt ? `${time(table.reservationStartsAt)}-${time(table.reservationEndsAt!)}` : "Reserved"}</div><div className="mt-1 text-[9px] text-orange-700">{table.reservationNumber}</div></> : <><div className="text-[10px] text-[#6E6E73]">{table.minPlayers}-{table.maxPlayers} players</div><div className={`mt-1 text-[10px] font-medium capitalize ${style.text}`}>{table.status}</div>{!table.assignable && <div className="mt-1 line-clamp-2 text-[9px] text-amber-800">{table.assignmentBlockReason}</div>}</>}
          </button>
        })}</div></section>)}
        {tables.length === 0 && <div className="py-12 text-center text-sm text-[#6E6E73]">No tables are configured for this branch.</div>}
        <div className="border-t-4 border-[#D2D2D7] pt-3 text-center text-xs font-semibold uppercase tracking-widest text-[#6E6E73]">Counter / Entrance</div>
      </div>}
    </div>
    {selected && <aside className="hidden w-72 flex-shrink-0 lg:block"><TableDetails table={selected} elapsed={elapsed(selected)} mode={mode} onClose={() => setSelected(null)} onWalkIn={() => setWalkIn(selected)} onCheckout={() => setCheckout(selected)} onManage={() => onManageTable?.(selected, branchId)} /></aside>}
    {selected && <div className="fixed inset-x-4 bottom-4 z-30 rounded-2xl border border-[#D2D2D7] bg-white p-4 shadow-xl lg:hidden"><TableDetails table={selected} elapsed={elapsed(selected)} mode={mode} onClose={() => setSelected(null)} onWalkIn={() => setWalkIn(selected)} onCheckout={() => setCheckout(selected)} onManage={() => onManageTable?.(selected, branchId)} compact /></div>}
    {walkIn && <WalkInModal table={walkIn} branchId={branchId} defaultPlayers={walkInPlayers} onClose={() => setWalkIn(null)} onComplete={async () => { setWalkIn(null); await load(branchId) }} onError={setError} />}
    {checkout?.sessionId && <CheckoutModal sessionId={checkout.sessionId} onClose={() => setCheckout(null)} onComplete={async () => { setCheckout(null); setSelected(null); await load(branchId) }} onError={setError} />}
  </div>
}

function TableDetails({ table, elapsed, mode, onClose, onWalkIn, onCheckout, onManage, compact = false }: { table: LiveTable; elapsed: number; mode: "staff" | "manager" | "admin"; onClose: () => void; onWalkIn: () => void; onCheckout: () => void; onManage?: () => void; compact?: boolean }) {
  return <div className={compact ? "" : "sticky top-6 rounded-2xl border border-[#D2D2D7] bg-white p-5"}>
    <div className="mb-4 flex items-center justify-between"><h2 className="font-bold">Table {table.code}</h2><button type="button" onClick={onClose} aria-label="Close">x</button></div>
    <div className="mb-4 flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${statusStyle[table.status].dot}`} /><span className="text-sm font-medium capitalize">{table.status}</span></div>
    {!compact && <div className="mb-5 space-y-1"><Row label="Zone" value={table.zone} /><Row label="Capacity" value={`${table.minPlayers}-${table.maxPlayers}`} />{table.client && <Row label="Client" value={table.client} />}{table.reservationNumber && <Row label="Reservation" value={table.reservationNumber} />}{table.reservationStartsAt && <Row label="Booked" value={`${time(table.reservationStartsAt)}-${time(table.reservationEndsAt!)}`} />}{table.checkInAt && <Row label="Check-in" value={dateTime(table.checkInAt)} />}{table.status === "occupied" && <Row label="Elapsed" value={duration(elapsed)} />}{table.bookedDurationMinutes && <Row label="Booked duration" value={`${table.bookedDurationMinutes} min`} />}{table.overtimeSeconds > 0 && <Row label="Overtime" value={duration(table.overtimeSeconds + Math.max(0, elapsed - table.elapsedSeconds))} />}{table.runningFee !== null && <Row label="Current fee" value={money(table.runningFee)} />}</div>}
    <div className="space-y-2">
      {table.status === "occupied" && table.sessionId && <Btn variant="danger" onClick={onCheckout} className="w-full py-2.5 text-sm">End Session & Check Out</Btn>}
      {table.status === "reserved" && <p className="rounded-xl bg-orange-50 p-3 text-xs text-orange-800">Use Check-In to start this reservation at its booked time.</p>}
      {table.status === "available" && table.assignable && <Btn variant="primary" onClick={onWalkIn} className="w-full py-2.5 text-sm">Assign Walk-In</Btn>}
      {onManage && (mode === "admin" || mode === "manager") && <Btn variant="secondary" onClick={onManage} className="w-full py-2.5 text-sm">Manage Physical Table</Btn>}
    </div>
    {!table.assignable && table.status !== "occupied" && table.status !== "reserved" && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">{table.assignmentBlockReason}</p>}
  </div>
}

function WalkInModal({ table, branchId, defaultPlayers, onClose, onComplete, onError }: { table: LiveTable; branchId: string; defaultPlayers: number; onClose: () => void; onComplete: () => Promise<void>; onError: (message: string) => void }) {
  const [mode, setMode] = useState<"guest" | "customer">("guest")
  const [players, setPlayers] = useState(defaultPlayers)
  const [guest, setGuest] = useState({ guestName: "", guestPhone: "", guestEmail: "" })
  const [search, setSearch] = useState("")
  const [customers, setCustomers] = useState<UserSummary[]>([])
  const [userId, setUserId] = useState("")
  const [saving, setSaving] = useState(false)
  const findCustomers = () => staffApi.users(search).then(setCustomers).catch(next => onError(errorMessage(next, "Unable to search customers.")))
  const submit = async () => {
    if ((mode === "guest" && !guest.guestName.trim()) || (mode === "customer" && !userId)) return
    setSaving(true)
    try {
      await staffReservationsApi.walkIn({ branchId, tableId: table.id, playerCount: players, ...(mode === "guest" ? guest : { userId }) })
      await onComplete()
    } catch (next) { onError(errorMessage(next, "Unable to start the walk-in session.")); setSaving(false) }
  }
  return <Modal title="Assign Walk-In Client" subtitle={`Table ${table.code} - ${table.zone} Area`} onClose={onClose}>
    <div className="grid grid-cols-2 rounded-xl bg-[#F5F5F7] p-1"><button type="button" onClick={() => setMode("guest")} className={`rounded-lg py-2 text-sm font-medium ${mode === "guest" ? "bg-white shadow-sm" : "text-[#6E6E73]"}`}>Guest</button><button type="button" onClick={() => { setMode("customer"); void findCustomers() }} className={`rounded-lg py-2 text-sm font-medium ${mode === "customer" ? "bg-white shadow-sm" : "text-[#6E6E73]"}`}>Registered customer</button></div>
    {mode === "guest" ? <><Field label="Guest name"><input autoFocus className={inputClass} value={guest.guestName} onChange={event => setGuest({ ...guest, guestName: event.target.value })} /></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="Phone"><input className={inputClass} value={guest.guestPhone} onChange={event => setGuest({ ...guest, guestPhone: event.target.value })} /></Field><Field label="Email"><input type="email" className={inputClass} value={guest.guestEmail} onChange={event => setGuest({ ...guest, guestEmail: event.target.value })} /></Field></div></> : <><Field label="Find customer"><div className="flex gap-2"><input className={inputClass} value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void findCustomers() }} placeholder="Name, email, or phone" /><Btn variant="secondary" onClick={() => void findCustomers()}>Search</Btn></div></Field><div className="max-h-40 space-y-2 overflow-y-auto">{customers.map(customer => <label key={customer.id} className={`block cursor-pointer rounded-xl border p-3 text-sm ${userId === customer.id ? "border-[#0071E3] bg-blue-50" : "border-[#D2D2D7]"}`}><input type="radio" className="mr-2" checked={userId === customer.id} onChange={() => setUserId(customer.id)} />{customer.name}<span className="ml-2 text-xs text-[#6E6E73]">{customer.email}</span></label>)}</div></>}
    <Field label="Players"><input type="number" min={table.minPlayers} max={table.maxPlayers} className={inputClass} value={players} onChange={event => setPlayers(Number(event.target.value))} /></Field>
    <div className="flex gap-3 pt-1"><Btn variant="secondary" onClick={onClose} className="flex-1 py-2.5">Cancel</Btn><Btn variant="primary" onClick={() => void submit()} disabled={saving || players < table.minPlayers || players > table.maxPlayers} className="flex-1 py-2.5">{saving ? "Checking in..." : "Assign & Check In"}</Btn></div>
  </Modal>
}

function CheckoutModal({ sessionId, onClose, onComplete, onError }: { sessionId: string; onClose: () => void; onComplete: () => Promise<void>; onError: (message: string) => void }) {
  const [preview, setPreview] = useState<CheckoutPreview | null>(null)
  const [paymentReceived, setPaymentReceived] = useState(false)
  const [saving, setSaving] = useState(false)
  useEffect(() => { staffReservationsApi.checkoutPreview(sessionId).then(setPreview).catch(next => onError(errorMessage(next, "Unable to prepare checkout."))) }, [sessionId])
  const confirm = async () => {
    setSaving(true)
    try { await staffReservationsApi.checkout(sessionId, paymentReceived); await onComplete() }
    catch (next) { onError(errorMessage(next, "Unable to check out this session.")); setSaving(false) }
  }
  return <Modal title="Confirm Session Checkout" subtitle="Review the server-calculated fee before closing the session." onClose={onClose}>
    {!preview ? <Loading>Calculating checkout...</Loading> : <><div className="rounded-xl bg-[#F5F5F7] p-4"><Row label="Client" value={preview.client || "Guest"} /><Row label="Table" value={preview.tableCode} /><Row label="Elapsed" value={duration(preview.elapsedSeconds)} />{preview.bookedDurationMinutes && <Row label="Booked minimum" value={`${preview.bookedDurationMinutes} min`} />}{preview.overtimeSeconds > 0 && <Row label="Overtime" value={duration(preview.overtimeSeconds)} />}<Row label="Final fee" value={money(preview.finalFee, preview.currency)} /></div><label className="flex items-start gap-3 rounded-xl border border-[#D2D2D7] p-4 text-sm"><input type="checkbox" className="mt-0.5" checked={paymentReceived} onChange={event => setPaymentReceived(event.target.checked)} /><span><strong className="block">Payment received</strong><span className="text-xs text-[#6E6E73]">This acknowledgement is required to complete checkout.</span></span></label><div className="flex gap-3"><Btn variant="secondary" onClick={onClose} className="flex-1 py-2.5">Cancel</Btn><Btn variant="danger" disabled={!paymentReceived || saving} onClick={() => void confirm()} className="flex-1 py-2.5">{saving ? "Completing..." : "Complete Checkout"}</Btn></div></>}
  </Modal>
}

export function StaffCheckInPage() {
  const [branches, setBranches] = useState<StaffBranch[]>([])
  const [branchId, setBranchId] = useState("")
  const [selectedDate, setSelectedDate] = useState(today())
  const [search, setSearch] = useState("")
  const [items, setItems] = useState<StaffReservation[]>([])
  const [checkingIn, setCheckingIn] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async (id = branchId, date = selectedDate, query = search) => {
    if (!id) return
    setLoading(true); setError(null)
    try { setItems(await staffReservationsApi.reservations(id, date, query)) }
    catch (next) { setError(errorMessage(next, "Unable to load reservations.")); setItems([]) }
    finally { setLoading(false) }
  }
  useEffect(() => { staffApi.branches().then(result => { setBranches(result); setBranchId(result[0]?.id ?? ""); if (result[0]) void load(result[0].id, selectedDate, "") }).catch(next => { setError(errorMessage(next, "Unable to load assigned branches.")); setLoading(false) }) }, [])
  const checkIn = async (reservation: StaffReservation) => {
    setCheckingIn(reservation.id); setError(null)
    try { await staffReservationsApi.checkIn(reservation.id); await load() }
    catch (next) { setError(errorMessage(next, "Unable to check in this reservation.")) }
    finally { setCheckingIn(null) }
  }
  return <div className="p-4 sm:p-6">
    <div className="mb-6"><h1 className="text-2xl font-bold text-[#1D1D1F]">Client Check-In</h1><p className="mt-1 text-sm text-[#6E6E73]">Find today&apos;s reservation by customer or reservation number.</p></div>
    <div className="mb-5 grid gap-3 rounded-2xl border border-[#D2D2D7] bg-white p-4 md:grid-cols-[1fr_170px_170px_auto]">
      <input className={inputClass} value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void load() }} placeholder="Name, reservation number, email, phone" />
      <select className={inputClass} value={branchId} onChange={event => { setBranchId(event.target.value); void load(event.target.value) }}>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>
      <input type="date" className={inputClass} value={selectedDate} onChange={event => { setSelectedDate(event.target.value); void load(branchId, event.target.value) }} />
      <Btn variant="primary" onClick={() => void load()} className="px-5">Search</Btn>
    </div>
    {error && <Notice>{error}</Notice>}
    {loading ? <Loading>Loading reservations...</Loading> : items.length === 0 ? <div className="rounded-2xl bg-[#F5F5F7] py-14 text-center text-sm text-[#6E6E73]">No matching pending or confirmed reservations.</div> : <div className="space-y-3">{items.map(item => <article key={item.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-[#D2D2D7] bg-white p-5 sm:flex-row sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-[#1D1D1F]">{item.contactName}</h2><span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-700">{item.status}</span></div><p className="mt-1 text-sm text-[#6E6E73]">{time(item.startsAt)}-{time(item.endsAt)} - Table {item.tableCode} - {item.playerCount} players</p><p className="mt-1 text-xs text-[#6E6E73]">{item.reservationNumber}{item.contactPhone ? ` - ${item.contactPhone}` : ""}</p>{!item.checkInEligible && <p className="mt-2 text-xs text-amber-700">{item.checkInBlockReason}</p>}</div><Btn variant="primary" disabled={!item.checkInEligible || checkingIn === item.id} onClick={() => void checkIn(item)} className="px-6 py-2.5">{checkingIn === item.id ? "Checking in..." : "Check In"}</Btn></article>)}</div>}
  </div>
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 backdrop-blur-sm sm:items-center sm:p-4"><section className="w-full max-w-lg rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl"><header className="flex items-start justify-between border-b border-[#D2D2D7] px-6 py-5"><div><h2 className="text-lg font-bold">{title}</h2>{subtitle && <p className="mt-0.5 text-xs text-[#6E6E73]">{subtitle}</p>}</div><button type="button" onClick={onClose} aria-label="Close" className="text-lg text-[#6E6E73]">x</button></header><div className="max-h-[75vh] space-y-4 overflow-y-auto p-6">{children}</div></section></div>
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-medium text-[#1D1D1F]"><span className="mb-1.5 block">{label}</span>{children}</label> }
function Row({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-4 border-b border-[#D2D2D7]/60 py-2 text-sm last:border-0"><span className="text-[#6E6E73]">{label}</span><strong className="text-right text-[#1D1D1F]">{value}</strong></div> }
function Notice({ children }: { children: React.ReactNode }) { return <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{children}</div> }
function Loading({ children }: { children: React.ReactNode }) { return <div className="p-10 text-center text-sm text-[#6E6E73]">{children}</div> }
