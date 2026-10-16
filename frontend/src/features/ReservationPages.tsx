import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useAuth } from "@/auth/AuthProvider"
import { BranchSearchDropdown, Btn } from "@/components/ui"
import { branchesApi } from "@/services/branchesApi"
import {
  reservationsApi,
  staffReservationsApi,
  type AvailabilityResponse,
  type AvailableTable,
  type LiveTable,
  type Reservation,
} from "@/services/reservationsApi"
import type { PublicBranch } from "@/types"

const BANGKOK_OFFSET = "+07:00"
const inputClass =
  "w-full border border-[#D2D2D7] rounded-xl bg-white px-3.5 py-3 text-sm text-[#1D1D1F] outline-none transition-colors focus:border-[#0071E3]"
const statusStyle = {
  available: {
    bg: "bg-green-50",
    border: "border-green-300",
    dot: "bg-green-500",
    text: "text-green-700",
  },
  reserved: {
    bg: "bg-orange-50",
    border: "border-orange-300",
    dot: "bg-orange-500",
    text: "text-orange-700",
  },
  occupied: {
    bg: "bg-red-50",
    border: "border-red-300",
    dot: "bg-red-500",
    text: "text-red-700",
  },
  unavailable: {
    bg: "bg-gray-100",
    border: "border-gray-300",
    dot: "bg-gray-400",
    text: "text-gray-600",
  },
}

function errorMessage(error: unknown, fallback: string) {
  return typeof error === "object" && error !== null && "message" in error
    ? String(error.message)
    : fallback
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value))
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(new Date(`${value}T00:00:00${BANGKOK_OFFSET}`))
}

function money(value: number, currency = "THB") {
  return new Intl.NumberFormat("en-TH", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

function localIso(date: string, time: string) {
  return `${date}T${time}:00${BANGKOK_OFFSET}`
}

function endIso(date: string, time: string, duration: number) {
  const [hours, minutes] = time.split(":").map(Number)
  const total = hours * 60 + minutes + duration * 60
  const nextDate = new Date(`${date}T00:00:00Z`)
  nextDate.setUTCDate(nextDate.getUTCDate() + Math.floor(total / 1440))
  return `${nextDate.toISOString().slice(0, 10)}T${String(Math.floor((total % 1440) / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}:00${BANGKOK_OFFSET}`
}

function PageLoading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-6 py-20 text-center text-[#6E6E73]">
      {children}
    </div>
  )
}

function Notice({
  children,
  tone = "error",
}: {
  children: React.ReactNode
  tone?: "error" | "success"
}) {
  return (
    <div
      className={`rounded-xl px-4 py-3 text-sm ${
        tone === "error"
          ? "border border-red-200 bg-red-50 text-red-700"
          : "border border-green-200 bg-green-50 text-green-700"
      }`}
    >
      {children}
    </div>
  )
}

export function ReservationPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [branches, setBranches] = useState<PublicBranch[]>([])
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(1)
  const [searching, setSearching] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(
    null,
  )
  const [selectedTable, setSelectedTable] = useState<AvailableTable | null>(
    null,
  )
  const [form, setForm] = useState({
    branchId: "",
    date: new Date().toISOString().slice(0, 10),
    time: "12:00",
    duration: 2,
    players: 2,
    contactName: `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim(),
    contactPhone: "",
    contactEmail: user?.email ?? "",
  })

  useEffect(() => {
    branchesApi
      .list()
      .then((items) =>
        setBranches(
          items.filter(
            (branch) => branch.status === "active" && branch.allowReservations,
          ),
        ),
      )
      .catch((next) => setError(errorMessage(next, "Unable to load branches.")))
      .finally(() => setLoading(false))
  }, [])

  const startsAt = useMemo(
    () => localIso(form.date, form.time),
    [form.date, form.time],
  )
  const endsAt = useMemo(
    () => endIso(form.date, form.time, form.duration),
    [form.date, form.time, form.duration],
  )
  const branch = branches.find((item) => item.id === form.branchId)
  const days = useMemo(
    () =>
      Array.from({ length: 14 }, (_, index) => {
        const day = new Date()
        day.setHours(0, 0, 0, 0)
        day.setDate(day.getDate() + index)
        return day
      }),
    [],
  )

  const invalidateTable = <K extends keyof typeof form,>(
    key: K,
    value: typeof form[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }))
    setAvailability(null)
    setSelectedTable(null)
    setError(null)
  }

  const nextBranch = () => {
    if (!form.branchId) return setError("Choose a branch to continue.")
    setError(null)
    setStep(2)
  }

  const nextDateTime = () => {
    if (!form.date || !form.time || form.duration < 1)
      return setError("Choose a date, time, and duration to continue.")
    setError(null)
    setStep(3)
  }

  const findTables = async () => {
    if (
      form.players < 1 ||
      !form.contactName.trim() ||
      !form.contactEmail.trim()
    )
      return setError("Enter players, reservation name, and email to continue.")
    setSearching(true)
    setError(null)
    setSelectedTable(null)
    try {
      setAvailability(
        await reservationsApi.availableTables(
          form.branchId,
          startsAt,
          endsAt,
          form.players,
        ),
      )
      setStep(4)
    } catch (next) {
      setAvailability(null)
      setError(errorMessage(next, "Unable to check table availability."))
    } finally {
      setSearching(false)
    }
  }

  const reserve = async () => {
    if (!selectedTable || !availability) return
    setSubmitting(true)
    setError(null)
    try {
      const reservation = await reservationsApi.create({
        branchId: form.branchId,
        tableId: selectedTable.id,
        contactName: form.contactName,
        contactPhone: form.contactPhone || undefined,
        contactEmail: form.contactEmail || undefined,
        startsAt,
        endsAt,
        playerCount: form.players,
      })
      navigate(`/reservations/${reservation.reservationNumber}/confirmation`)
    } catch (next) {
      setError(errorMessage(next, "Unable to create your reservation."))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <PageLoading>Loading reservation options...</PageLoading>
  if (branches.length === 0)
    return (
      <PageLoading>
        No branches are currently accepting reservations.
      </PageLoading>
    )

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="mb-2 text-3xl font-bold text-[#1D1D1F]">
        Reserve a Table
      </h1>
      <p className="mb-8 text-[#6E6E73]">
        Book your seat for the perfect game night
      </p>
      <ReservationProgress
        labels={["Branch", "Date & Time", "Players", "Table", "Confirmation"]}
        step={step}
      />
      {error && (
        <div className="mb-6 max-w-2xl">
          <Notice>{error}</Notice>
        </div>
      )}

      {step === 1 && (
        <div className="max-w-md">
          <h2 className="mb-1 text-xl font-bold text-[#1D1D1F]">
            Which branch do you want to visit?
          </h2>
          <p className="mb-6 text-[#6E6E73]">
            Choose a Boardly location near you.
          </p>
          <BranchSearchDropdown
            branches={branches}
            value={form.branchId || null}
            onChange={(id) => invalidateTable("branchId", id)}
            onlyActive
          />
          {branch && (
            <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <div className="mb-1 font-semibold text-[#1D1D1F]">
                {branch.name}
              </div>
              <div className="space-y-1 text-sm text-[#6E6E73]">
                <div>
                  {branch.address}, {branch.district}
                </div>
                <div>{branch.hours}</div>
                <div>{branch.tableCount} tables</div>
              </div>
            </div>
          )}
          <Btn
            variant="primary"
            onClick={nextBranch}
            disabled={!form.branchId}
            className="mt-8 px-8 py-3"
          >
            Continue
          </Btn>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="mb-1 text-xl font-bold text-[#1D1D1F]">
            When do you want to play?
          </h2>
          <p className="mb-6 text-[#6E6E73]">
            Choose a date, start time, and session duration.
          </p>
          <div className="mb-7 grid grid-cols-4 gap-2 sm:grid-cols-7">
            {days.map((day) => {
              const value = day.toISOString().slice(0, 10)
              const selected = form.date === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => invalidateTable("date", value)}
                  className={`flex min-h-20 flex-col items-center justify-center rounded-xl border-2 px-2 py-3 transition-colors ${
                    selected
                      ? "border-[#0071E3] bg-blue-50"
                      : "border-[#D2D2D7] hover:border-gray-400"
                  }`}
                >
                  <span className="text-xs text-[#6E6E73]">
                    {day.toLocaleDateString("en", { weekday: "short" })}
                  </span>
                  <span
                    className={`mt-0.5 text-lg font-bold ${
                      selected ? "text-[#0071E3]" : "text-[#1D1D1F]"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  <span className="text-xs text-[#6E6E73]">
                    {day.toLocaleDateString("en", { month: "short" })}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="grid max-w-2xl gap-5 sm:grid-cols-2">
            <Field label="Start time">
              <input
                type="time"
                value={form.time}
                onChange={(event) =>
                  invalidateTable("time", event.target.value)
                }
                className={inputClass}
              />
            </Field>
            <div>
              <div className="mb-1.5 text-sm font-medium text-[#1D1D1F]">
                Duration
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((hours) => (
                  <button
                    key={hours}
                    type="button"
                    onClick={() => invalidateTable("duration", hours)}
                    className={`rounded-xl border-2 py-3 text-sm font-medium transition-colors ${
                      form.duration === hours
                        ? "border-[#0071E3] bg-blue-50 text-[#0071E3]"
                        : "border-[#D2D2D7] text-[#1D1D1F] hover:border-gray-400"
                    }`}
                  >
                    {hours}h
                  </button>
                ))}
              </div>
            </div>
          </div>
          <StepButtons
            back={() => setStep(1)}
            next={nextDateTime}
            label="Continue"
          />
        </div>
      )}

      {step === 3 && (
        <div className="max-w-2xl">
          <h2 className="mb-1 text-xl font-bold text-[#1D1D1F]">
            How many players?
          </h2>
          <p className="mb-8 text-[#6E6E73]">
            We will show tables that fit your group.
          </p>
          <div className="flex items-center justify-center gap-6 py-6">
            <button
              type="button"
              aria-label="Remove one player"
              onClick={() =>
                invalidateTable("players", Math.max(1, form.players - 1))
              }
              className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#D2D2D7] text-2xl font-bold text-[#1D1D1F] transition-colors hover:border-[#0071E3] hover:bg-blue-50"
            >
              -
            </button>
            <div className="w-28 text-center">
              <div className="text-7xl font-bold text-[#1D1D1F]">
                {form.players}
              </div>
              <div className="mt-1 text-sm text-[#6E6E73]">players</div>
            </div>
            <button
              type="button"
              aria-label="Add one player"
              onClick={() =>
                invalidateTable("players", Math.min(12, form.players + 1))
              }
              className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#D2D2D7] text-2xl font-bold text-[#1D1D1F] transition-colors hover:border-[#0071E3] hover:bg-blue-50"
            >
              +
            </button>
          </div>
          <div className="mt-6 rounded-2xl bg-[#F5F5F7] p-5">
            <div className="mb-4 text-sm font-semibold text-[#1D1D1F]">
              Reservation contact
            </div>
            <div className="space-y-4">
              <Field label="Name">
                <input
                  value={form.contactName}
                  onChange={(event) =>
                    setForm({ ...form, contactName: event.target.value })
                  }
                  className={inputClass}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Phone">
                  <input
                    type="tel"
                    value={form.contactPhone}
                    onChange={(event) =>
                      setForm({ ...form, contactPhone: event.target.value })
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    value={form.contactEmail}
                    onChange={(event) =>
                      setForm({ ...form, contactEmail: event.target.value })
                    }
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>
          </div>
          <StepButtons
            back={() => setStep(2)}
            next={() => void findTables()}
            label={searching ? "Checking availability..." : "Choose your table"}
            disabled={searching}
          />
        </div>
      )}

      {step === 4 && (
        <div>
          <h2 className="mb-1 text-xl font-bold text-[#1D1D1F]">
            Select your table
          </h2>
          <p className="mb-5 text-sm text-[#6E6E73] sm:text-base">
            {branch?.name} - {formatDate(form.date)} - {form.time} -{" "}
            {form.duration}h - {form.players} players
          </p>
          <div className="mb-5 flex items-center gap-5 text-xs font-medium">
            <Legend color="bg-green-500" label="Available" />
            <Legend color="bg-blue-500" label="Selected" />
          </div>
          {availability?.tables.length ? (
            <div className="flex flex-col gap-6 lg:flex-row">
              <FloorPlan
                tables={availability.tables}
                selected={selectedTable}
                onSelect={setSelectedTable}
              />
              <div className="w-full flex-shrink-0 lg:w-56">
                {selectedTable ? (
                  <div className="rounded-2xl border-2 border-[#0071E3] bg-white p-5">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#6E6E73]">
                      Selected
                    </div>
                    <div className="mb-1 text-2xl font-bold text-[#1D1D1F]">
                      Table {selectedTable.code}
                    </div>
                    <div className="mb-4 flex items-center gap-1.5 text-sm font-medium text-green-700">
                      <span className="h-2 w-2 rounded-full bg-green-500" />{" "}
                      Available
                    </div>
                    <div className="space-y-2 text-sm text-[#6E6E73]">
                      <SummaryRow
                        label="Capacity"
                        value={`${selectedTable.minPlayers}-${selectedTable.maxPlayers}`}
                      />
                      <SummaryRow label="Zone" value={selectedTable.zone} />
                      <SummaryRow
                        label="Players"
                        value={String(form.players)}
                      />
                      <SummaryRow
                        label="Est. fee"
                        value={money(
                          availability.estimatedFee,
                          availability.currency,
                        )}
                        emphasize
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-[#F5F5F7] p-5 text-center">
                    <div className="text-sm font-medium text-[#1D1D1F]">
                      Choose a table
                    </div>
                    <div className="mt-1 text-xs text-[#6E6E73]">
                      Available tables are shown in green.
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#F5F5F7] px-5 py-10 text-center text-sm text-[#6E6E73]">
              No table is available for this session. Go back to adjust the
              date, time, duration, or player count.
            </div>
          )}
          <StepButtons
            back={() => setStep(3)}
            next={() =>
              selectedTable
                ? setStep(5)
                : setError("Select an available table to continue.")
            }
            label={
              selectedTable
                ? `Confirm Table ${selectedTable.code}`
                : "Select a table to continue"
            }
            disabled={!selectedTable}
          />
        </div>
      )}

      {step === 5 && (
        <div className="max-w-md">
          <h2 className="mb-1 text-xl font-bold text-[#1D1D1F]">
            Reservation Summary
          </h2>
          <p className="mb-6 text-sm text-[#6E6E73]">
            Review this read-only summary before confirming.
          </p>
          <div className="mb-4 overflow-hidden rounded-2xl border border-[#D2D2D7] bg-white">
            <SummaryLine label="Branch" value={branch?.name ?? "-"} />
            <SummaryLine label="Date" value={formatDate(form.date)} />
            <SummaryLine label="Time" value={form.time} />
            <SummaryLine
              label="Duration"
              value={`${form.duration} hour${form.duration === 1 ? "" : "s"}`}
            />
            <SummaryLine label="Players" value={`${form.players} people`} />
            <SummaryLine
              label="Table"
              value={
                selectedTable
                  ? `Table ${selectedTable.code} - ${selectedTable.zone}`
                  : "-"
              }
            />
            <SummaryLine label="Name" value={form.contactName} />
            <SummaryLine label="Email" value={form.contactEmail} />
            <SummaryLine
              label="Estimated fee"
              value={
                availability
                  ? money(availability.estimatedFee, availability.currency)
                  : "-"
              }
              highlight
            />
          </div>
          <p className="mb-6 text-xs text-[#6E6E73]">
            Actual fee is calculated by Boardly from the final play-session
            duration.
          </p>
          <StepButtons
            back={() => setStep(4)}
            next={() => void reserve()}
            label={
              submitting ? "Confirming reservation..." : "Confirm Reservation"
            }
            disabled={submitting}
          />
        </div>
      )}
    </div>
  )
}

function ReservationProgress({
  labels,
  step,
}: {
  labels: string[]
  step: number
}) {
  return (
    <div className="mb-10 flex items-center gap-1 overflow-x-auto pb-1">
      {labels.map((label, index) => (
        <div key={label} className="flex flex-shrink-0 items-center">
          <div
            className={`flex items-center gap-1.5 text-sm font-medium ${
              index + 1 <= step ? "text-[#1D1D1F]" : "text-[#6E6E73]"
            }`}
          >
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold ${
                index + 1 < step
                  ? "border-[#0071E3] bg-[#0071E3] text-white"
                  : index + 1 === step
                    ? "border-[#1D1D1F]"
                    : "border-[#D2D2D7]"
              }`}
            >
              {index + 1 < step ? "✓" : index + 1}
            </div>
            <span className="hidden sm:block">{label}</span>
          </div>
          {index < labels.length - 1 && (
            <div
              className={`mx-1 h-0.5 w-6 sm:w-10 ${
                index + 1 < step ? "bg-[#0071E3]" : "bg-[#D2D2D7]"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function FloorPlan({
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

function StepButtons({
  back,
  next,
  label,
  disabled = false,
}: {
  back: () => void
  next: () => void
  label: string
  disabled?: boolean
}) {
  return (
    <div className="mt-7 flex gap-3">
      <Btn variant="secondary" onClick={back} className="px-6 py-3">
        Back
      </Btn>
      <Btn
        variant="primary"
        onClick={next}
        disabled={disabled}
        className="px-8 py-3"
      >
        {label}
      </Btn>
    </div>
  )
}

function SummaryLine({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div
      className={`flex justify-between gap-5 border-b border-[#D2D2D7] px-5 py-4 last:border-0 ${
        highlight ? "bg-blue-50" : ""
      }`}
    >
      <span className="text-sm text-[#6E6E73]">{label}</span>
      <span
        className={`text-right text-sm font-semibold ${
          highlight ? "text-base text-[#0071E3]" : "text-[#1D1D1F]"
        }`}
      >
        {value}
      </span>
    </div>
  )
}

export function ReservationConfirmationPage() {
  const navigate = useNavigate()
  const { reservationNumber } = useParams()
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (reservationNumber)
      reservationsApi
        .get(reservationNumber)
        .then(setReservation)
        .catch((next) =>
          setError(errorMessage(next, "Unable to load this reservation.")),
        )
  }, [reservationNumber])
  if (error)
    return (
      <PageLoading>
        <Notice>{error}</Notice>
      </PageLoading>
    )
  if (!reservation)
    return <PageLoading>Loading your reservation...</PageLoading>
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-[#0071E3]">
        ✓
      </div>
      <h1 className="mt-6 text-3xl font-bold text-[#1D1D1F]">
        Your table is reserved!
      </h1>
      <p className="mt-2 text-[#6E6E73]">
        Your reservation is stored and ready for check-in.
      </p>
      <div className="mt-8 rounded-2xl bg-[#F5F5F7] p-6 text-left">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#6E6E73]">
          Reservation Details
        </div>
        <div className="mb-4 font-mono text-sm font-bold text-[#0071E3]">
          {reservation.reservationNumber}
        </div>
        <SummaryRow label="Branch" value={reservation.branchName} />
        <SummaryRow label="Table" value={`Table ${reservation.tableCode}`} />
        <SummaryRow
          label="Session"
          value={`${formatDateTime(reservation.startsAt)} - ${new Intl.DateTimeFormat("en-GB", { timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(reservation.endsAt))}`}
        />
        <SummaryRow
          label="Players"
          value={`${reservation.playerCount} people`}
        />
        <SummaryRow
          label="Estimated fee"
          value={money(reservation.estimatedFee, reservation.currency)}
          emphasize
        />
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Btn
          variant="secondary"
          onClick={() => navigate("/account/reservations")}
          className="flex-1 py-3"
        >
          View My Reservations
        </Btn>
        <Btn
          variant="primary"
          onClick={() => navigate("/shop")}
          className="flex-1 py-3"
        >
          Shop Games
        </Btn>
      </div>
    </div>
  )
}

export function MyReservationsApiPage() {
  const [items, setItems] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const load = () => {
    setLoading(true)
    reservationsApi
      .mine()
      .then(setItems)
      .catch((next) =>
        setError(errorMessage(next, "Unable to load reservations.")),
      )
      .finally(() => setLoading(false))
  }
  useEffect(load, [])
  const cancel = async (item: Reservation) => {
    setCancelling(item.reservationNumber)
    setError(null)
    try {
      await reservationsApi.cancel(item.reservationNumber)
      load()
    } catch (next) {
      setError(errorMessage(next, "Unable to cancel this reservation."))
    } finally {
      setCancelling(null)
    }
  }
  if (loading) return <PageLoading>Loading your reservations...</PageLoading>
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-2 text-2xl font-bold text-[#1D1D1F]">
        My Reservations
      </h1>
      <p className="mb-7 text-[#6E6E73]">
        Your upcoming and past table reservations.
      </p>
      {error && (
        <div className="mb-5">
          <Notice>{error}</Notice>
        </div>
      )}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#D2D2D7] py-16 text-center text-[#6E6E73]">
          You do not have any reservations yet.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <article
              key={item.id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-[#D2D2D7] p-5 sm:flex-row sm:items-center"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-[#1D1D1F]">
                    {item.branchName}
                  </h2>
                  <StatusPill status={item.status} />
                </div>
                <p className="mt-1 text-sm text-[#6E6E73]">
                  {formatDateTime(item.startsAt)} - Table {item.tableCode} -{" "}
                  {item.playerCount} players
                </p>
                <p className="mt-2 text-xs text-[#6E6E73]">
                  {item.reservationNumber}
                </p>
              </div>
              {["pending", "confirmed"].includes(item.status) && (
                <Btn
                  variant="secondary"
                  onClick={() => void cancel(item)}
                  disabled={cancelling === item.reservationNumber}
                  className="px-5 py-2.5"
                >
                  {cancelling === item.reservationNumber
                    ? "Cancelling..."
                    : "Cancel"}
                </Btn>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export function StaffLiveTablesApiPage() {
  const [branches, setBranches] = useState<PublicBranch[]>([])
  const [branchId, setBranchId] = useState("")
  const [walkInPlayers, setWalkInPlayers] = useState(4)
  const [tables, setTables] = useState<LiveTable[]>([])
  const [selectedTable, setSelectedTable] = useState<LiveTable | null>(null)
  const [walkInTable, setWalkInTable] = useState<LiveTable | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const load = async (id: string, players = walkInPlayers) => {
    if (!id) return
    setLoading(true)
    setError(null)
    setSelectedTable(null)
    try {
      setTables(await staffReservationsApi.liveTables(id, players))
    } catch (next) {
      setTables([])
      setError(errorMessage(next, "Unable to load live tables."))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    branchesApi
      .list()
      .then((items) => {
        const active = items.filter((item) => item.status === "active")
        setBranches(active)
        setBranchId(active[0]?.id ?? "")
        if (active[0]) void load(active[0].id, 4)
      })
      .catch((next) => {
        setError(errorMessage(next, "Unable to load branches."))
        setLoading(false)
      })
  }, [])
  const checkout = async (sessionId: string) => {
    try {
      await staffReservationsApi.checkout(sessionId)
      await load(branchId, walkInPlayers)
    } catch (next) {
      setError(errorMessage(next, "Unable to check out this session."))
    }
  }
  const checkIn = async (reservationId: string) => {
    try {
      await staffReservationsApi.checkIn(reservationId)
      await load(branchId, walkInPlayers)
    } catch (next) {
      setError(errorMessage(next, "Unable to check in this reservation."))
    }
  }
  const zones = Array.from(new Set(tables.map((table) => table.zone)))
  return (
    <div className="flex gap-6 p-4 sm:p-6">
      <div className="min-w-0 flex-1">
        <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-2xl font-bold text-[#1D1D1F]">Live Tables</h1>
            <p className="mt-1 text-sm text-[#6E6E73]">
              Click any table to view its current database-derived state.
            </p>
          </div>
          <div className="flex w-full gap-3 sm:w-auto">
            <div className="min-w-0 flex-1 sm:w-72">
              <BranchSearchDropdown
                branches={branches}
                value={branchId || null}
                onChange={(id) => {
                  setBranchId(id)
                  void load(id, walkInPlayers)
                }}
                onlyActive
              />
            </div>
            <label className="w-24 text-xs font-medium text-[#6E6E73]">
              Party size
              <select
                aria-label="Walk-in party size"
                value={walkInPlayers}
                onChange={(event) => {
                  const players = Number(event.target.value)
                  setWalkInPlayers(players)
                  void load(branchId, players)
                }}
                className="mt-1 h-11 w-full rounded-xl border border-[#D2D2D7] bg-white px-3 text-sm font-semibold text-[#1D1D1F]"
              >
                {Array.from({ length: 12 }, (_, index) => index + 1).map(
                  (players) => (
                    <option key={players} value={players}>
                      {players}
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>
        </div>
        <div className="mb-5 flex flex-wrap gap-5 text-xs font-medium">
          {(Object.keys(statusStyle) as LiveTable["status"][]).map((status) => (
            <Legend
              key={status}
              color={statusStyle[status].dot}
              label={status}
            />
          ))}
        </div>
        {error && (
          <div className="mb-5">
            <Notice>{error}</Notice>
          </div>
        )}
        {loading ? (
          <PageLoading>Loading live tables...</PageLoading>
        ) : (
          <div className="space-y-8 rounded-2xl bg-[#F5F5F7] p-4 sm:p-6">
            {zones.map((zone) => (
              <div key={zone}>
                <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#6E6E73]">
                  {zone} Area
                </div>
                <div className="flex flex-wrap gap-3 sm:gap-4">
                  {tables
                    .filter((table) => table.zone === zone)
                    .map((table) => {
                      const style = statusStyle[table.status]
                      const active = selectedTable?.id === table.id
                      const blocked =
                        table.status === "available" && !table.assignable
                      return (
                        <button
                          key={table.id}
                          type="button"
                          onClick={() =>
                            setSelectedTable(active ? null : table)
                          }
                          aria-disabled={!table.assignable}
                          className={`min-h-24 w-28 rounded-xl border-2 p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                            blocked
                              ? "bg-amber-50 opacity-80"
                              : style.bg
                          } ${
                            active
                              ? "border-[#0071E3] ring-2 ring-[#0071E3]/20"
                              : blocked
                                ? "border-amber-300"
                                : style.border
                          }`}
                        >
                          <div className="mb-2 flex items-center gap-1.5">
                            <span
                              className={`h-2 w-2 rounded-full ${style.dot}`}
                            />
                            <span className="text-sm font-bold text-[#1D1D1F]">
                              {table.code}
                            </span>
                          </div>
                          {table.status === "occupied" ? (
                            <>
                              <div className="truncate text-[10px] font-medium text-[#1D1D1F]">
                                {table.client}
                              </div>
                              <div className="text-[10px] text-[#6E6E73]">
                                {table.players} players
                              </div>
                              <div className="mt-1 text-[10px] font-semibold text-red-600">
                                {table.runningFee === null
                                  ? "-"
                                  : money(table.runningFee)}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-[10px] text-[#6E6E73]">
                                {table.minPlayers}-{table.maxPlayers} players
                              </div>
                              <div
                                className={`mt-1 text-[10px] font-medium capitalize ${style.text}`}
                              >
                                {table.status}
                              </div>
                              {!table.assignable && (
                                <div
                                  className="mt-1 line-clamp-2 text-[9px] leading-tight text-amber-800"
                                  title={
                                    table.assignmentBlockReason ?? undefined
                                  }
                                >
                                  Not eligible: {table.assignmentBlockReason}
                                </div>
                              )}
                            </>
                          )}
                        </button>
                      )
                    })}
                </div>
              </div>
            ))}
            {tables.length === 0 && (
              <div className="py-12 text-center text-sm text-[#6E6E73]">
                No tables are available for this branch.
              </div>
            )}
            <div className="border-t-4 border-[#D2D2D7] pt-3 text-center text-xs font-semibold uppercase tracking-widest text-[#6E6E73]">
              Counter / Entrance
            </div>
          </div>
        )}
      </div>
      {selectedTable && (
        <aside className="hidden w-64 flex-shrink-0 lg:block">
          <div className="sticky top-6 rounded-2xl border border-[#D2D2D7] bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-[#1D1D1F]">
                Table {selectedTable.code}
              </h2>
              <button
                type="button"
                aria-label="Close table details"
                onClick={() => setSelectedTable(null)}
                className="text-[#6E6E73]"
              >
                ×
              </button>
            </div>
            <div className="mb-4 flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${statusStyle[selectedTable.status].dot}`}
              />
              <span className="text-sm font-medium capitalize text-[#1D1D1F]">
                {selectedTable.status}
              </span>
            </div>
            <div className="mb-5 space-y-2 text-sm">
              <SummaryRow label="Zone" value={selectedTable.zone} />
              <SummaryRow
                label="Capacity"
                value={`${selectedTable.minPlayers}-${selectedTable.maxPlayers}`}
              />
              {selectedTable.client && (
                <SummaryRow label="Client" value={selectedTable.client} />
              )}
              {selectedTable.players !== null && (
                <SummaryRow
                  label="Players"
                  value={String(selectedTable.players)}
                />
              )}
              {selectedTable.checkInAt && (
                <SummaryRow
                  label="Check-in"
                  value={formatDateTime(selectedTable.checkInAt)}
                />
              )}
              {selectedTable.runningFee !== null && (
                <SummaryRow
                  label="Running fee"
                  value={money(selectedTable.runningFee)}
                  emphasize
                />
              )}
            </div>
            {!selectedTable.assignable &&
              selectedTable.assignmentBlockReason && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                  Cannot assign: {selectedTable.assignmentBlockReason}
                </div>
              )}
            {selectedTable.status === "occupied" && selectedTable.sessionId && (
              <Btn
                variant="danger"
                onClick={() => void checkout(selectedTable.sessionId!)}
                className="w-full py-2.5 text-sm"
              >
                End Session & Check Out
              </Btn>
            )}
            {selectedTable.status === "reserved" &&
              selectedTable.reservationId && (
                <Btn
                  variant="primary"
                  onClick={() => void checkIn(selectedTable.reservationId!)}
                  className="w-full py-2.5 text-sm"
                >
                  Check In Client
                </Btn>
              )}
            {selectedTable.status === "available" &&
              selectedTable.assignable && (
                <Btn
                  variant="primary"
                  onClick={() => setWalkInTable(selectedTable)}
                  className="w-full py-2.5 text-sm"
                >
                  Assign Walk-In
                </Btn>
              )}
          </div>
          {!selectedTable.assignable && selectedTable.assignmentBlockReason && (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              Cannot assign: {selectedTable.assignmentBlockReason}
            </div>
          )}
        </aside>
      )}
      {selectedTable && (
        <div className="fixed inset-x-4 bottom-4 z-30 rounded-2xl border border-[#D2D2D7] bg-white p-4 shadow-xl lg:hidden">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <span className="font-bold">Table {selectedTable.code}</span>
              <span className="ml-2 text-xs capitalize text-[#6E6E73]">
                {selectedTable.status}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedTable(null)}
              aria-label="Close table details"
            >
              ×
            </button>
          </div>
          {selectedTable.status === "occupied" && selectedTable.sessionId && (
            <Btn
              variant="danger"
              onClick={() => void checkout(selectedTable.sessionId!)}
              className="w-full py-2.5 text-sm"
            >
              End Session & Check Out
            </Btn>
          )}
          {selectedTable.status === "reserved" &&
            selectedTable.reservationId && (
              <Btn
                variant="primary"
                onClick={() => void checkIn(selectedTable.reservationId!)}
                className="w-full py-2.5 text-sm"
              >
                Check In Client
              </Btn>
            )}
          {selectedTable.status === "available" && selectedTable.assignable && (
            <Btn
              variant="primary"
              onClick={() => setWalkInTable(selectedTable)}
              className="w-full py-2.5 text-sm"
            >
              Assign Walk-In
            </Btn>
          )}
        </div>
      )}
      {walkInTable && (
        <WalkInModal
          table={walkInTable}
          branchId={branchId}
          playerCount={walkInPlayers}
          onClose={() => setWalkInTable(null)}
          onComplete={async () => {
            setWalkInTable(null)
            await load(branchId, walkInPlayers)
          }}
          onError={setError}
        />
      )}
    </div>
  )
}

function WalkInModal({
  table,
  branchId,
  playerCount,
  onClose,
  onComplete,
  onError,
}: {
  table: LiveTable
  branchId: string
  playerCount: number
  onClose: () => void
  onComplete: () => Promise<void>
  onError: (message: string) => void
}) {
  const [form, setForm] = useState({
    guestName: "",
    guestPhone: "",
  })
  const [saving, setSaving] = useState(false)
  const submit = async () => {
    if (!form.guestName.trim()) return
    setSaving(true)
    try {
      await staffReservationsApi.walkIn({
        branchId,
        tableId: table.id,
        playerCount,
        ...form,
      })
      await onComplete()
    } catch (next) {
      onError(errorMessage(next, "Unable to start the walk-in session."))
      setSaving(false)
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <section className="w-full max-w-lg rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-[#D2D2D7] px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-[#1D1D1F]">
              Assign Walk-In Client
            </h2>
            <p className="mt-0.5 text-xs text-[#6E6E73]">
              Table {table.code} - {table.zone} Area - {table.maxPlayers} max
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xl text-[#6E6E73]"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="space-y-4 p-6">
          <Field label="Guest name">
            <input
              autoFocus
              value={form.guestName}
              onChange={(event) =>
                setForm({ ...form, guestName: event.target.value })
              }
              className={inputClass}
            />
          </Field>
          <Field label="Phone">
            <input
              value={form.guestPhone}
              onChange={(event) =>
                setForm({ ...form, guestPhone: event.target.value })
              }
              className={inputClass}
            />
          </Field>
          <div className="rounded-2xl border-2 border-green-300 bg-green-50 p-4">
            <div className="font-bold text-[#1D1D1F]">Table {table.code}</div>
            <div className="mt-1 text-sm text-[#6E6E73]">
              {table.zone} Area - {playerCount} players
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Btn
              variant="secondary"
              onClick={onClose}
              className="flex-1 py-2.5"
            >
              Cancel
            </Btn>
            <Btn
              variant="primary"
              onClick={() => void submit()}
              disabled={saving || !form.guestName.trim()}
              className="flex-1 py-2.5"
            >
              {saving ? "Checking in..." : "Assign & Check In"}
            </Btn>
          </div>
        </div>
      </section>
    </div>
  )
}

export function StaffCheckInApiPage() {
  const [reservationId, setReservationId] = useState("")
  const [result, setResult] = useState<LiveTable | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const checkIn = async () => {
    if (!reservationId.trim())
      return setError("Enter the reservation ID from the reservation record.")
    setLoading(true)
    setError(null)
    try {
      setResult(await staffReservationsApi.checkIn(reservationId.trim()))
    } catch (next) {
      setResult(null)
      setError(errorMessage(next, "Unable to check in this reservation."))
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="max-w-2xl p-4 sm:p-6">
      <h1 className="mb-2 text-2xl font-bold text-[#1D1D1F]">
        Client Check-In
      </h1>
      <p className="mb-7 text-sm text-[#6E6E73]">
        Look up a reservation by its database reservation ID.
      </p>
      {error && (
        <div className="mb-5">
          <Notice>{error}</Notice>
        </div>
      )}
      <section className="rounded-2xl border border-[#D2D2D7] bg-white p-5">
        <Field label="Reservation ID">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={reservationId}
              onChange={(event) => setReservationId(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void checkIn()
              }}
              placeholder="Paste reservation UUID"
              className={inputClass}
            />
            <Btn
              variant="primary"
              onClick={() => void checkIn()}
              disabled={loading}
              className="flex-shrink-0 px-6 py-3"
            >
              {loading ? "Checking in..." : "Check In"}
            </Btn>
          </div>
        </Field>
      </section>
      {result && (
        <section className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 font-bold text-green-700">
              ✓
            </div>
            <div>
              <h2 className="font-semibold text-[#1D1D1F]">Checked in</h2>
              <p className="text-sm text-[#6E6E73]">
                An active play session was created.
              </p>
            </div>
          </div>
          <SummaryRow
            label="Client"
            value={result.client ?? "Reservation guest"}
          />
          <SummaryRow label="Table" value={`Table ${result.code}`} />
          <SummaryRow label="Zone" value={result.zone} />
          <SummaryRow label="Players" value={String(result.players ?? "-")} />
        </section>
      )}
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block text-sm font-medium text-[#1D1D1F]">
      <span className="mb-1.5 block">{label}</span>
      {children}
    </label>
  )
}
function SummaryRow({
  label,
  value,
  emphasize = false,
}: {
  label: string
  value: string
  emphasize?: boolean
}) {
  return (
    <div className="flex justify-between gap-5 border-b border-[#D2D2D7]/70 py-2.5 text-sm last:border-0">
      <span className="text-[#6E6E73]">{label}</span>
      <span
        className={`text-right font-semibold ${
          emphasize ? "text-[#0071E3]" : "text-[#1D1D1F]"
        }`}
      >
        {value}
      </span>
    </div>
  )
}
function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span className="capitalize text-[#6E6E73]">{label}</span>
    </div>
  )
}
function StatusPill({ status }: { status: string }) {
  const style =
    status === "confirmed" || status === "completed"
      ? "bg-green-100 text-green-700"
      : status === "cancelled" || status === "no_show"
        ? "bg-gray-100 text-gray-500"
        : "bg-blue-100 text-blue-700"
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${style}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  )
}
