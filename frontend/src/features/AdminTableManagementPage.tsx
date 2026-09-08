import { useEffect, useState } from "react"
import { Btn } from "@/components/ui"
import { StaffLiveTablesPage } from "@/features/StaffOperationalPages"
import type { LiveTable } from "@/services/reservationsApi"
import {
  adminApi,
  staffApi,
  type AdminTable,
  type AdminTableInput,
  type StaffBranch,
  type TableFeature,
  type TableZone,
} from "@/services/managementApi"

const input = "w-full rounded-xl border border-[#D2D2D7] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0071E3]"
const errorText = (error: unknown) => typeof error === "object" && error && "message" in error ? String(error.message) : "Unable to complete that request."

export function AdminLiveTablesPage({ mode = "admin" }: { mode?: "admin" | "manager" } = {}) {
  const [version, setVersion] = useState(0)
  const [branchId, setBranchId] = useState("")
  const [tables, setTables] = useState<AdminTable[]>([])
  const [zones, setZones] = useState<TableZone[]>([])
  const [features, setFeatures] = useState<TableFeature[]>([])
  const [editing, setEditing] = useState<AdminTable | null | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openEditor = async (liveTable: LiveTable | null, selectedBranchId: string) => {
    setLoading(true); setError(null); setBranchId(selectedBranchId)
    try {
      const [physicalTables, zoneList, featureList] = await Promise.all([
        adminApi.tables(selectedBranchId), adminApi.tableZones(selectedBranchId), adminApi.tableFeatures(),
      ])
      setTables(physicalTables); setZones(zoneList); setFeatures(featureList)
      const physicalTable = liveTable ? physicalTables.find(table => table.id === liveTable.id) : null
      if (liveTable && !physicalTable) throw new Error("Physical table configuration was not found.")
      setEditing(physicalTable)
    } catch (next) { setError(errorText(next)) }
    finally { setLoading(false) }
  }

  const deactivate = async (table: AdminTable) => {
    if (!window.confirm(`Deactivate Table ${table.code}? Existing history will be retained.`)) return
    try { await adminApi.deactivateTable(table.id); setEditing(undefined); setVersion(value => value + 1) }
    catch (next) { setError(errorText(next)) }
  }

  return <>
    {error && <div className="m-4 mb-0 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:mx-6">{error}</div>}
    <StaffLiveTablesPage mode={mode} refreshKey={version} onManageTable={(table, id) => void openEditor(table, id)} />
    {loading && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 text-sm font-medium text-white backdrop-blur-sm">Loading table configuration...</div>}
    {editing !== undefined && <TableEditor item={editing} branchId={branchId} zones={zones} features={features} nextOrder={tables.length ? Math.max(...tables.map(table => table.sortOrder)) + 1 : 1} onClose={() => setEditing(undefined)} onSaved={async () => { setEditing(undefined); setVersion(value => value + 1) }} onDeactivate={editing ? () => deactivate(editing) : undefined} onError={setError} />}
  </>
}

export function AdminTableManagementPage({ mode = "admin" }: { mode?: "admin" | "manager" } = {}) {
  const [branches, setBranches] = useState<StaffBranch[]>([])
  const [branchId, setBranchId] = useState("")
  const [zones, setZones] = useState<TableZone[]>([])
  const [features, setFeatures] = useState<TableFeature[]>([])
  const [tables, setTables] = useState<AdminTable[]>([])
  const [editing, setEditing] = useState<AdminTable | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadBranch = async (id: string) => {
    if (!id) return
    setLoading(true); setError(null)
    try {
      const [tableList, zoneList] = await Promise.all([adminApi.tables(id), adminApi.tableZones(id)])
      setTables(tableList); setZones(zoneList)
    } catch (next) { setError(errorText(next)) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    Promise.all([staffApi.branches(), adminApi.tableFeatures()]).then(([branchList, featureList]) => {
      setBranches(branchList); setFeatures(featureList)
      const first = branchList[0]?.id ?? ""; setBranchId(first); if (first) void loadBranch(first)
    }).catch(next => { setError(errorText(next)); setLoading(false) })
  }, [])

  const deactivate = async (table: AdminTable) => {
    if (!window.confirm(`Deactivate Table ${table.code}? Existing history will be retained.`)) return
    try { await adminApi.deactivateTable(table.id); await loadBranch(branchId) }
    catch (next) { setError(errorText(next)) }
  }

  return <div className="p-4 sm:p-6">
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-bold text-[#1D1D1F]">Physical Tables</h1><p className="mt-1 text-sm text-[#6E6E73]">Configure branch floor inventory. Live customer sessions remain staff operations.</p></div><div className="flex gap-3"><select value={branchId} onChange={event => { setBranchId(event.target.value); void loadBranch(event.target.value) }} className={input}>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select><Btn variant="primary" onClick={() => setEditing(null)} className="whitespace-nowrap px-5">+ Add Table</Btn></div></div>
    {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {loading ? <div className="p-12 text-center text-[#6E6E73]">Loading physical tables...</div> : <div className="space-y-7">{zones.map(zone => <section key={zone.id}><h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#6E6E73]">{zone.name}</h2><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{tables.filter(table => table.zoneId === zone.id).map(table => <article key={table.id} className={`rounded-2xl border border-[#D2D2D7] bg-white p-4 ${!table.active ? "opacity-60" : ""}`}><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h3 className="text-lg font-bold">Table {table.code}</h3><span className={`rounded-full px-2 py-0.5 text-xs ${table.active && table.operationalStatus === "available" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{table.active ? table.operationalStatus : "inactive"}</span></div><p className="mt-1 text-sm text-[#6E6E73]">{table.minPlayers}-{table.maxPlayers} players - order {table.sortOrder}</p>{table.featureNames.length > 0 && <p className="mt-2 text-xs text-[#6E6E73]">{table.featureNames.join(" / ")}</p>}</div><Btn variant="secondary" onClick={() => setEditing(table)} className="px-3 py-1.5 text-xs">Edit</Btn></div>{table.active && <button type="button" onClick={() => void deactivate(table)} className="mt-4 text-xs font-medium text-red-600 hover:underline">Deactivate table</button>}</article>)}</div>{tables.every(table => table.zoneId !== zone.id) && <p className="rounded-xl bg-[#F5F5F7] p-5 text-sm text-[#6E6E73]">No tables in this zone.</p>}</section>)}</div>}
    {editing !== undefined && <TableEditor item={editing} branchId={branchId} zones={zones} features={features} nextOrder={tables.length ? Math.max(...tables.map(table => table.sortOrder)) + 1 : 1} onClose={() => setEditing(undefined)} onSaved={async () => { setEditing(undefined); await loadBranch(branchId) }} onDeactivate={editing ? () => deactivate(editing) : undefined} onError={setError} />}
  </div>
}

function TableEditor({ item, branchId, zones, features, nextOrder, onClose, onSaved, onDeactivate, onError }: { item: AdminTable | null; branchId: string; zones: TableZone[]; features: TableFeature[]; nextOrder: number; onClose: () => void; onSaved: () => Promise<void>; onDeactivate?: () => Promise<void>; onError: (message: string) => void }) {
  const [form, setForm] = useState<AdminTableInput>({ branchId, code: item?.code ?? "", zoneId: item?.zoneId ?? zones[0]?.id ?? "", minPlayers: item?.minPlayers ?? 1, maxPlayers: item?.maxPlayers ?? 4, operationalStatus: item?.operationalStatus ?? "available", sortOrder: item?.sortOrder ?? nextOrder, active: item?.active ?? true, featureIds: item?.featureIds ?? [] })
  const [saving, setSaving] = useState(false)
  const toggleFeature = (id: string) => setForm(current => ({ ...current, featureIds: current.featureIds.includes(id) ? current.featureIds.filter(value => value !== id) : [...current.featureIds, id] }))
  const save = async () => {
    setSaving(true)
    try { item ? await adminApi.updateTable(item.id, form) : await adminApi.createTable(form); await onSaved() }
    catch (next) { onError(errorText(next)); setSaving(false) }
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"><section className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-[#D2D2D7] px-6 py-5"><h2 className="text-lg font-bold">{item ? "Edit Table" : "Add Table"}</h2><button type="button" onClick={onClose} aria-label="Close">x</button></header><div className="max-h-[75vh] space-y-4 overflow-y-auto p-6"><div className="grid grid-cols-2 gap-3"><Field label="Table code"><input autoFocus className={input} value={form.code} onChange={event => setForm({ ...form, code: event.target.value })} /></Field><Field label="Zone"><select className={input} value={form.zoneId} onChange={event => setForm({ ...form, zoneId: event.target.value })}>{zones.map(zone => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></Field><Field label="Minimum players"><input type="number" min={1} className={input} value={form.minPlayers} onChange={event => setForm({ ...form, minPlayers: Number(event.target.value) })} /></Field><Field label="Maximum players"><input type="number" min={1} className={input} value={form.maxPlayers} onChange={event => setForm({ ...form, maxPlayers: Number(event.target.value) })} /></Field><Field label="Operational status"><select className={input} value={form.operationalStatus} onChange={event => setForm({ ...form, operationalStatus: event.target.value })}><option value="available">Available</option><option value="unavailable">Unavailable</option></select></Field><Field label="Display order"><input type="number" min={0} className={input} value={form.sortOrder} onChange={event => setForm({ ...form, sortOrder: Number(event.target.value) })} /></Field></div><div><p className="mb-2 text-sm font-medium">Features</p><div className="grid grid-cols-2 gap-2 rounded-xl bg-[#F5F5F7] p-3">{features.map(feature => <label key={feature.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.featureIds.includes(feature.id)} onChange={() => toggleFeature(feature.id)} />{feature.name}</label>)}</div></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={event => setForm({ ...form, active: event.target.checked })} />Active table</label>{item && onDeactivate && <button type="button" onClick={() => void onDeactivate()} className="text-sm font-medium text-red-600 hover:underline">Deactivate Table</button>}<div className="flex gap-3 pt-2"><Btn variant="secondary" onClick={onClose} className="flex-1">Cancel</Btn><Btn variant="primary" disabled={saving || !form.code.trim() || !form.zoneId || form.maxPlayers < form.minPlayers} onClick={() => void save()} className="flex-1">{saving ? "Saving..." : "Save Table"}</Btn></div></div></section></div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-medium"><span className="mb-1 block text-xs">{label}</span>{children}</label> }
