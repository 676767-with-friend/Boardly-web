import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { StaffCheckInPage, StaffLiveTablesPage } from "./StaffOperationalPages"
import { staffApi } from "@/services/managementApi"
import {
  staffReservationsApi,
  type LiveTable,
} from "@/services/reservationsApi"

vi.mock("@/services/managementApi", () => ({
  staffApi: { branches: vi.fn(), users: vi.fn() },
}))

vi.mock("@/services/reservationsApi", () => ({
  staffReservationsApi: {
    liveTables: vi.fn(),
    reservations: vi.fn(),
    checkIn: vi.fn(),
    checkoutPreview: vi.fn(),
    checkout: vi.fn(),
    walkIn: vi.fn(),
  },
}))

const overdueTable: LiveTable = {
  id: "table-1",
  code: "A1",
  zone: "Main",
  minPlayers: 2,
  maxPlayers: 4,
  status: "occupied",
  assignable: false,
  assignmentBlockCode: "ACTIVE_SESSION",
  assignmentBlockReason: "An active play session is using this table.",
  sessionId: "session-1",
  reservationId: "reservation-1",
  reservationNumber: "RSV-CURRENT",
  client: "Overtime Guest",
  players: 2,
  reservationStartsAt: "2026-10-28T12:00:00+07:00",
  reservationEndsAt: "2026-10-28T14:00:00+07:00",
  nextReservationNumber: "RSV-NEXT",
  nextReservationStartsAt: "2026-10-28T15:00:00+07:00",
  nextReservationEndsAt: "2026-10-28T16:00:00+07:00",
  checkInAt: "2026-10-28T11:30:00+07:00",
  serverTime: "2026-10-28T14:30:00+07:00",
  bookedDurationMinutes: 120,
  elapsedSeconds: 10800,
  overtimeSeconds: 1800,
  baseFee: 280,
  overtimeFee: 120,
  runningFee: 400,
}

const availableTable: LiveTable = {
  ...overdueTable,
  id: "table-2",
  code: "A2",
  status: "available",
  assignable: true,
  assignmentBlockCode: null,
  assignmentBlockReason: null,
  sessionId: null,
  reservationId: null,
  reservationNumber: null,
  client: null,
  players: null,
  reservationStartsAt: null,
  reservationEndsAt: null,
  nextReservationNumber: null,
  nextReservationStartsAt: null,
  nextReservationEndsAt: null,
  checkInAt: null,
  bookedDurationMinutes: null,
  elapsedSeconds: 0,
  overtimeSeconds: 0,
  baseFee: null,
  overtimeFee: null,
  runningFee: null,
}

describe("Staff live table overtime", () => {
  beforeEach(() => {
    vi.mocked(staffApi.branches).mockResolvedValue([
      { id: "branch-1", name: "Central" },
    ])
    vi.mocked(staffReservationsApi.liveTables).mockResolvedValue([overdueTable])
    vi.mocked(staffApi.users).mockResolvedValue([])
    vi.mocked(staffReservationsApi.reservations).mockResolvedValue([])
    vi.mocked(staffReservationsApi.walkIn).mockResolvedValue({} as never)
    vi.mocked(staffReservationsApi.checkIn).mockResolvedValue({} as never)
    vi.mocked(staffReservationsApi.checkoutPreview).mockResolvedValue({
      id: "session-1",
      status: "active",
      client: "Overtime Guest",
      tableCode: "A1",
      checkInAt: overdueTable.checkInAt!,
      checkOutAt: null,
      serverTime: overdueTable.serverTime,
      scheduledEndAt: overdueTable.reservationEndsAt,
      bookedDurationMinutes: 120,
      elapsedSeconds: 10800,
      overtimeSeconds: 1800,
      baseFee: 280,
      overtimeFee: 120,
      finalFee: 400,
      currency: "THB",
    })
    vi.mocked(staffReservationsApi.checkout).mockResolvedValue({} as never)
  })

  it("shows overdue and upcoming warnings plus the authoritative checkout breakdown", async () => {
    render(<StaffLiveTablesPage />)

    fireEvent.click(await screen.findByRole("button", { name: /A1/i }))
    expect(screen.getAllByText("Overdue").length).toBeGreaterThan(0)
    expect(
      screen.getAllByText(/This session is overdue/).length,
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByText(/Upcoming reservation RSV-NEXT/).length,
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByText("Estimated additional charge").length,
    ).toBeGreaterThan(0)

    fireEvent.click(
      screen.getAllByRole("button", { name: "End Session & Check Out" })[0],
    )
    await waitFor(() =>
      expect(staffReservationsApi.checkoutPreview).toHaveBeenCalledWith(
        "session-1",
      ),
    )
    expect(await screen.findByText("Reserved base fee")).toBeInTheDocument()
    expect(screen.getByText("Overtime charge")).toBeInTheDocument()
    expect(screen.getByText("Final fee")).toBeInTheDocument()

    const complete = screen.getByRole("button", { name: "Complete Checkout" })
    expect(complete).toBeDisabled()
    fireEvent.click(screen.getByLabelText(/Payment received/))
    fireEvent.click(complete)
    await waitFor(() =>
      expect(staffReservationsApi.checkout).toHaveBeenCalledWith(
        "session-1",
        true,
      ),
    )
  }, 15_000)

  it("assigns an available table to a validated walk-in guest", async () => {
    vi.mocked(staffReservationsApi.liveTables).mockResolvedValueOnce([
      availableTable,
    ])
    vi.mocked(staffReservationsApi.walkIn).mockResolvedValue({} as never)

    render(<StaffLiveTablesPage />)
    fireEvent.click(await screen.findByRole("button", { name: /A2/i }))
    fireEvent.click(
      screen.getAllByRole("button", { name: "Assign Walk-In" })[0],
    )
    fireEvent.change(screen.getByLabelText("Guest name"), {
      target: { value: "Walk In Guest" },
    })
    fireEvent.change(screen.getByLabelText("Phone"), {
      target: { value: "0812345678" },
    })
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "guest@example.com" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Assign & Check In" }))

    await waitFor(() =>
      expect(staffReservationsApi.walkIn).toHaveBeenCalledWith({
        branchId: "branch-1",
        tableId: "table-2",
        playerCount: 4,
        guestName: "Walk In Guest",
        guestPhone: "0812345678",
        guestEmail: "guest@example.com",
      }),
    )
  })

  it("loads branch reservations and checks in an eligible customer", async () => {
    vi.mocked(staffReservationsApi.reservations).mockResolvedValue([
      {
        id: "reservation-2",
        reservationNumber: "RSV-READY",
        branchId: "branch-1",
        branchName: "Central",
        tableId: "table-2",
        tableCode: "A2",
        contactName: "Ready Guest",
        contactEmail: "ready@example.com",
        contactPhone: "0812345678",
        startsAt: "2026-10-30T12:00:00+07:00",
        endsAt: "2026-10-30T14:00:00+07:00",
        playerCount: 4,
        status: "confirmed",
        checkInEligible: true,
        checkInBlockReason: null,
      },
    ])
    vi.mocked(staffReservationsApi.checkIn).mockResolvedValue({} as never)

    render(<StaffCheckInPage />)
    expect(await screen.findByText("Ready Guest")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Check In" }))

    await waitFor(() =>
      expect(staffReservationsApi.checkIn).toHaveBeenCalledWith(
        "reservation-2",
      ),
    )
  })

  it("reports assigned-branch and live-table loading failures", async () => {
    vi.mocked(staffApi.branches).mockRejectedValueOnce(
      new Error("No assigned branch"),
    )
    const branchFailure = render(<StaffLiveTablesPage />)
    expect(await screen.findByText("No assigned branch")).toBeInTheDocument()
    branchFailure.unmount()

    vi.mocked(staffReservationsApi.liveTables).mockRejectedValueOnce(
      new Error("Live floor unavailable"),
    )
    render(<StaffLiveTablesPage />)
    expect(
      await screen.findByText("Live floor unavailable"),
    ).toBeInTheDocument()
    expect(
      screen.getByText("No tables are configured for this branch."),
    ).toBeInTheDocument()
  })

  it("assigns a registered customer and surfaces walk-in rejection", async () => {
    vi.mocked(staffReservationsApi.liveTables).mockResolvedValueOnce([
      availableTable,
    ])
    vi.mocked(staffApi.users).mockResolvedValue([
      {
        id: "user-1",
        name: "Ada Lovelace",
        email: "ada@example.test",
        phone: "0812345678",
        status: "active",
        roles: ["customer"],
      },
    ] as never)
    vi.mocked(staffReservationsApi.walkIn).mockRejectedValueOnce(
      new Error("Session conflict"),
    )
    render(<StaffLiveTablesPage />)
    fireEvent.click(await screen.findByRole("button", { name: /A2/i }))
    fireEvent.click(
      screen.getAllByRole("button", { name: "Assign Walk-In" })[0],
    )
    fireEvent.click(screen.getByRole("button", { name: "Registered customer" }))
    fireEvent.click(await screen.findByRole("radio"))
    fireEvent.click(screen.getByRole("button", { name: "Assign & Check In" }))

    await waitFor(() =>
      expect(staffReservationsApi.walkIn).toHaveBeenCalledWith({
        branchId: "branch-1",
        tableId: "table-2",
        playerCount: 4,
        userId: "user-1",
      }),
    )
    expect(await screen.findByText("Session conflict")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Assign & Check In" }),
    ).toBeEnabled()
  })

  it("shows blocked check-ins and keeps an eligible reservation after API failure", async () => {
    vi.mocked(staffReservationsApi.reservations).mockResolvedValue([
      {
        id: "reservation-blocked",
        reservationNumber: "RSV-EARLY",
        branchId: "branch-1",
        branchName: "Central",
        tableId: "table-1",
        tableCode: "A1",
        contactName: "Early Guest",
        contactEmail: null,
        contactPhone: null,
        startsAt: "2026-10-30T18:00:00+07:00",
        endsAt: "2026-10-30T20:00:00+07:00",
        playerCount: 2,
        status: "confirmed",
        checkInEligible: false,
        checkInBlockReason: "Check-in window has not opened.",
      },
      {
        id: "reservation-ready",
        reservationNumber: "RSV-READY",
        branchId: "branch-1",
        branchName: "Central",
        tableId: "table-2",
        tableCode: "A2",
        contactName: "Ready Guest",
        contactEmail: null,
        contactPhone: null,
        startsAt: "2026-10-30T12:00:00+07:00",
        endsAt: "2026-10-30T14:00:00+07:00",
        playerCount: 2,
        status: "confirmed",
        checkInEligible: true,
        checkInBlockReason: null,
      },
    ])
    vi.mocked(staffReservationsApi.checkIn).mockRejectedValueOnce(
      new Error("Table became occupied"),
    )
    render(<StaffCheckInPage />)

    expect(
      await screen.findByText("Check-in window has not opened."),
    ).toBeInTheDocument()
    const buttons = screen.getAllByRole("button", { name: "Check In" })
    expect(buttons[0]).toBeDisabled()
    fireEvent.click(buttons[1])
    expect(await screen.findByText("Table became occupied")).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Check In" })[1]).toBeEnabled()
  })

  it("reloads the live floor for branch and party changes and opens manager table editing", async () => {
    vi.mocked(staffApi.branches).mockResolvedValue([
      { id: "branch-1", name: "Central" },
      { id: "branch-2", name: "Silom" },
    ])
    vi.mocked(staffReservationsApi.liveTables).mockResolvedValue([
      availableTable,
    ])
    const manage = vi.fn()
    render(<StaffLiveTablesPage mode="manager" onManageTable={manage} />)

    await screen.findByRole("button", { name: /A2/i })
    fireEvent.change(screen.getByLabelText("Assigned branch"), {
      target: { value: "branch-2" },
    })
    await waitFor(() =>
      expect(staffReservationsApi.liveTables).toHaveBeenCalledWith(
        "branch-2",
        4,
      ),
    )
    fireEvent.change(screen.getByLabelText("Party size"), {
      target: { value: "6" },
    })
    await waitFor(() =>
      expect(staffReservationsApi.liveTables).toHaveBeenCalledWith(
        "branch-2",
        6,
      ),
    )

    fireEvent.click(screen.getByRole("button", { name: "+ Add Table" }))
    expect(manage).toHaveBeenCalledWith(null, "branch-2")
    fireEvent.click(screen.getByRole("button", { name: /A2/i }))
    fireEvent.click(
      screen.getAllByRole("button", { name: "Manage Physical Table" })[0],
    )
    expect(manage).toHaveBeenCalledWith(availableTable, "branch-2")
  })

  it("validates walk-in phones and reports registered-customer search failures", async () => {
    vi.mocked(staffReservationsApi.liveTables).mockResolvedValue([
      availableTable,
    ])
    vi.mocked(staffApi.users).mockRejectedValueOnce(
      new Error("Customer directory unavailable"),
    )
    render(<StaffLiveTablesPage />)
    fireEvent.click(await screen.findByRole("button", { name: /A2/i }))
    fireEvent.click(
      screen.getAllByRole("button", { name: "Assign Walk-In" })[0],
    )
    fireEvent.change(screen.getByLabelText("Guest name"), {
      target: { value: "Walk In Guest" },
    })
    fireEvent.change(screen.getByLabelText("Phone"), {
      target: { value: "123" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Assign & Check In" }))
    expect(staffReservationsApi.walkIn).not.toHaveBeenCalled()
    expect(screen.getByText(/0812345678/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Registered customer" }))
    expect(
      await screen.findByText("Customer directory unavailable"),
    ).toBeInTheDocument()
  })

  it("keeps checkout recoverable after preview and payment failures", async () => {
    vi.mocked(staffReservationsApi.checkoutPreview).mockRejectedValueOnce(
      new Error("Checkout preview unavailable"),
    )
    const previewFailure = render(<StaffLiveTablesPage />)
    fireEvent.click(await screen.findByRole("button", { name: /A1/i }))
    fireEvent.click(
      screen.getAllByRole("button", { name: "End Session & Check Out" })[0],
    )
    expect(
      await screen.findByText("Checkout preview unavailable"),
    ).toBeInTheDocument()

    previewFailure.unmount()
    vi.mocked(staffReservationsApi.checkout).mockRejectedValueOnce(
      new Error("Payment confirmation rejected"),
    )
    render(<StaffLiveTablesPage />)
    fireEvent.click(await screen.findByRole("button", { name: /A1/i }))
    fireEvent.click(
      screen.getAllByRole("button", { name: "End Session & Check Out" })[0],
    )
    await screen.findByText("Final fee")
    fireEvent.click(screen.getByLabelText(/Payment received/))
    fireEvent.click(screen.getByRole("button", { name: "Complete Checkout" }))
    expect(
      await screen.findByText("Payment confirmation rejected"),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Complete Checkout" }),
    ).toBeEnabled()
  })

  it("reloads reservations from search, branch, date, and explicit actions", async () => {
    vi.mocked(staffApi.branches).mockResolvedValue([
      { id: "branch-1", name: "Central" },
      { id: "branch-2", name: "Silom" },
    ])
    render(<StaffCheckInPage />)
    expect(
      await screen.findByText("No matching pending or confirmed reservations."),
    ).toBeInTheDocument()

    const search = screen.getByPlaceholderText(
      "Name, reservation number, email, phone",
    )
    fireEvent.change(search, { target: { value: "RSV-2002" } })
    fireEvent.keyDown(search, { key: "Enter" })
    await waitFor(() =>
      expect(staffReservationsApi.reservations).toHaveBeenCalledWith(
        "branch-1",
        expect.any(String),
        "RSV-2002",
      ),
    )

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "branch-2" },
    })
    fireEvent.change(screen.getByDisplayValue(/^\d{4}-\d{2}-\d{2}$/), {
      target: { value: "2026-11-01" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Search" }))
    await waitFor(() =>
      expect(staffReservationsApi.reservations).toHaveBeenCalledWith(
        "branch-2",
        "2026-11-01",
        "RSV-2002",
      ),
    )
  })
})
