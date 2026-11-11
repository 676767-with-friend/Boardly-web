import type { AvailableTable } from "@/services/reservationsApi"

export default function ReservationFloorPlan({
  tables,
  selected,
  onSelect,
}: {
  tables: AvailableTable[]
  selected: AvailableTable | null
  onSelect: (table: AvailableTable) => void
}) {
  const zones = Array.from(new Set(tables.map((table) => table.zone)))
  return (
    <div className="min-h-80 flex-1 space-y-7 rounded-2xl bg-[#F5F5F7] p-5 sm:p-6">
      {zones.map((zone) => (
        <div key={zone}>
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#6E6E73]">
            {zone} Area
          </div>
          <div className="flex flex-wrap gap-3">
            {tables
              .filter((table) => table.zone === zone)
              .map((table) => {
                const active = selected?.id === table.id
                return (
                  <button
                    key={table.id}
                    type="button"
                    onClick={() => onSelect(table)}
                    className={`flex h-20 w-24 flex-col items-center justify-center rounded-xl border-2 transition-all hover:-translate-y-0.5 hover:shadow-md ${
                      active
                        ? "border-[#0071E3] bg-blue-50 ring-2 ring-[#0071E3]/20"
                        : "border-green-300 bg-green-50"
                    }`}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-bold text-[#1D1D1F]">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          active ? "bg-blue-500" : "bg-green-500"
                        }`}
                      />
                      {table.code}
                    </span>
                    <span className="mt-1 text-[10px] text-[#6E6E73]">
                      {table.minPlayers}-{table.maxPlayers} players
                    </span>
                  </button>
                )
              })}
          </div>
        </div>
      ))}
      <div className="border-t-4 border-[#D2D2D7] pt-3 text-center text-xs font-semibold uppercase tracking-widest text-[#6E6E73]">
        Counter / Entrance
      </div>
    </div>
  )
}
