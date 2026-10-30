import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  MyReservationsApiPage,
  ReservationConfirmationPage,
  ReservationPage,
} from "./ReservationPages"
import { branchesApi } from "@/services/branchesApi"
import { reservationsApi } from "@/services/reservationsApi"

vi.mock("@/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { firstName: "Ada", lastName: "Lovelace", email: "ada@example.test" },
  }),
}))

vi.mock("@/services/branchesApi", () => ({ branchesApi: { list: vi.fn() } }))
vi.mock("@/services/reservationsApi", () => ({
  reservationsApi: {
    availableTables: vi.fn(),
    create: vi.fn(),
    get: vi.fn(),
    mine: vi.fn(),
    cancel: vi.fn(),
  },
  staffReservationsApi: {},
}))

const branch = {
  id: "branch-1",
  code: "CENTRAL",
  name: "Boardly Central",
  address: "1 Game Road",
  district: "Pathum Wan",
  province: "Bangkok",
  postalCode: "10330",
  phone: "02-000-0000",
  status: "active" as const,
  allowReservations: true,
  hours: "10:00-22:00",
  tableCount: 8,
  playableGameCount: 40,
}

const reservation = {
  id: "reservation-1",
  reservationNumber: "RSV-1001",
  branchId: branch.id,
  branchName: branch.name,
  tableId: "table-1",
  tableCode: "A1",
  contactName: "Ada Lovelace",
  startsAt: "2026-10-30T12:00:00+07:00",
  endsAt: "2026-10-30T14:00:00+07:00",
  playerCount: 2,
  status: "confirmed",
  estimatedFee: 240,
  currency: "THB",
}

async function reachPlayers(browser: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole("heading", { name: "Reserve a Table" })
  await browser.click(
    screen.getByRole("button", { name: /Search or select a branch/ }),
  )
  await browser.click(screen.getByRole("option", { name: /Boardly Central/ }))
  await browser.click(screen.getByRole("button", { name: "Continue" }))
  await browser.click(screen.getByRole("button", { name: "Continue" }))
  await screen.findByRole("heading", { name: "How many players?" })
}

async function reachSummary(browser: ReturnType<typeof userEvent.setup>) {
  await reachPlayers(browser)
  await browser.type(screen.getByLabelText("Phone"), "0812345678")
  await browser.click(screen.getByRole("button", { name: "Choose your table" }))
  await browser.click(
    await screen.findByRole("button", { name: /A1.*2-4 players/ }),
  )
  await browser.click(screen.getByRole("button", { name: "Confirm Table A1" }))
}

describe("ReservationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(branchesApi.list).mockResolvedValue([branch])
    vi.mocked(reservationsApi.availableTables).mockResolvedValue({
      startsAt: "2026-10-30T12:00:00+07:00",
      endsAt: "2026-10-30T14:00:00+07:00",
      players: 2,
      estimatedFee: 240,
      currency: "THB",
      tables: [
        {
          id: "table-1",
          code: "A1",
          zone: "Main",
          minPlayers: 2,
          maxPlayers: 4,
        },
      ],
    })
    vi.mocked(reservationsApi.create).mockResolvedValue(reservation)
    vi.mocked(reservationsApi.get).mockResolvedValue(reservation)
    vi.mocked(reservationsApi.mine).mockResolvedValue([])
    vi.mocked(reservationsApi.cancel).mockResolvedValue(reservation)
  })

  it("completes the customer reservation wizard and navigates to confirmation", async () => {
    const browser = userEvent.setup()
    render(
      <MemoryRouter initialEntries={["/reservations/new"]}>
        <Routes>
          <Route path="/reservations/new" element={<ReservationPage />} />
          <Route
            path="/reservations/:number/confirmation"
            element={<h1>Reservation confirmed</h1>}
          />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByRole("heading", { name: "Reserve a Table" })
    await browser.click(
      screen.getByRole("button", { name: /Search or select a branch/ }),
    )
    await browser.click(screen.getByRole("option", { name: /Boardly Central/ }))
    expect(
      screen.getByText("1 Game Road, Pathum Wan, Bangkok, 10330"),
    ).toBeInTheDocument()
    await browser.click(screen.getByRole("button", { name: "Continue" }))

    expect(
      screen.getByRole("heading", { name: "When do you want to play?" }),
    ).toBeInTheDocument()
    await browser.click(screen.getByRole("button", { name: "Continue" }))

    expect(
      screen.getByRole("heading", { name: "How many players?" }),
    ).toBeInTheDocument()
    await browser.type(screen.getByLabelText("Phone"), "081-234-5678")
    await browser.click(
      screen.getByRole("button", { name: "Choose your table" }),
    )

    await waitFor(() =>
      expect(reservationsApi.availableTables).toHaveBeenCalledWith(
        branch.id,
        expect.stringContaining("T12:00:00+07:00"),
        expect.stringContaining("T14:00:00+07:00"),
        2,
      ),
    )
    await browser.click(screen.getByRole("button", { name: /A1.*2-4 players/ }))
    await browser.click(
      screen.getByRole("button", { name: "Confirm Table A1" }),
    )

    expect(
      screen.getByRole("heading", { name: "Reservation Summary" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument()
    await browser.click(
      screen.getByRole("button", { name: "Confirm Reservation" }),
    )

    await screen.findByRole("heading", { name: "Reservation confirmed" })
    expect(reservationsApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        branchId: branch.id,
        tableId: "table-1",
        contactPhone: "081-234-5678",
        playerCount: 2,
      }),
    )
  }, 15_000)

  it("reports a branch loading failure", async () => {
    vi.mocked(branchesApi.list).mockRejectedValueOnce({
      message: "Branches are offline",
    })
    render(
      <MemoryRouter>
        <ReservationPage />
      </MemoryRouter>,
    )

    expect(
      await screen.findByText(
        "No branches are currently accepting reservations.",
      ),
    ).toBeInTheDocument()
  })

  it("validates reservation contact details and reports availability failures", async () => {
    const browser = userEvent.setup()
    vi.mocked(reservationsApi.availableTables).mockRejectedValueOnce(
      new Error("Availability is offline"),
    )
    render(
      <MemoryRouter>
        <ReservationPage />
      </MemoryRouter>,
    )
    await reachPlayers(browser)

    await browser.clear(screen.getByLabelText("Name"))
    await browser.clear(screen.getByLabelText("Email"))
    await browser.click(
      screen.getByRole("button", { name: "Choose your table" }),
    )
    expect(
      screen.getByText(
        "Enter players, reservation name, and email to continue.",
      ),
    ).toBeInTheDocument()

    await browser.type(screen.getByLabelText("Name"), "Ada Lovelace")
    await browser.type(screen.getByLabelText("Email"), "ada@example.test")
    await browser.type(screen.getByLabelText("Phone"), "123")
    await browser.click(
      screen.getByRole("button", { name: "Choose your table" }),
    )
    expect(screen.getByText(/กรุณากรอกหมายเลขโทรศัพท์ไทย/)).toBeInTheDocument()

    await browser.clear(screen.getByLabelText("Phone"))
    await browser.type(screen.getByLabelText("Phone"), "0812345678")
    await browser.click(
      screen.getByRole("button", { name: "Choose your table" }),
    )
    expect(
      await screen.findByText("Availability is offline"),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Choose your table" }),
    ).toBeEnabled()
  }, 15_000)

  it("supports editing time, duration, player bounds, and earlier wizard steps", async () => {
    const browser = userEvent.setup()
    render(
      <MemoryRouter>
        <ReservationPage />
      </MemoryRouter>,
    )
    await screen.findByRole("heading", { name: "Reserve a Table" })
    await browser.click(
      screen.getByRole("button", { name: /Search or select a branch/ }),
    )
    await browser.click(screen.getByRole("option", { name: /Boardly Central/ }))
    await browser.click(screen.getByRole("button", { name: "Continue" }))

    fireEvent.change(screen.getByLabelText("Start time"), {
      target: { value: "" },
    })
    await browser.click(screen.getByRole("button", { name: "Continue" }))
    expect(
      screen.getByText("Choose a date, time, and duration to continue."),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText("Start time"), {
      target: { value: "13:30" },
    })
    await browser.click(screen.getByRole("button", { name: "1h" }))
    await browser.click(screen.getByRole("button", { name: "Continue" }))

    await browser.click(
      screen.getByRole("button", { name: "Remove one player" }),
    )
    await browser.click(
      screen.getByRole("button", { name: "Remove one player" }),
    )
    expect(screen.getByText("1", { selector: ".text-7xl" })).toBeInTheDocument()
    for (let index = 0; index < 12; index += 1) {
      await browser.click(
        screen.getByRole("button", { name: "Add one player" }),
      )
    }
    expect(
      screen.getByText("12", { selector: ".text-7xl" }),
    ).toBeInTheDocument()

    await browser.click(screen.getByRole("button", { name: "Back" }))
    expect(
      screen.getByRole("heading", { name: "When do you want to play?" }),
    ).toBeInTheDocument()
    await browser.click(screen.getByRole("button", { name: "Back" }))
    expect(
      screen.getByRole("heading", {
        name: "Which branch do you want to visit?",
      }),
    ).toBeInTheDocument()
  }, 15_000)

  it("shows an empty availability result without inventing a selectable table", async () => {
    const browser = userEvent.setup()
    vi.mocked(reservationsApi.availableTables).mockResolvedValueOnce({
      startsAt: "2026-10-30T12:00:00+07:00",
      endsAt: "2026-10-30T14:00:00+07:00",
      players: 2,
      estimatedFee: 0,
      currency: "THB",
      tables: [],
    })
    render(
      <MemoryRouter>
        <ReservationPage />
      </MemoryRouter>,
    )
    await reachPlayers(browser)
    await browser.type(screen.getByLabelText("Phone"), "0812345678")
    await browser.click(
      screen.getByRole("button", { name: "Choose your table" }),
    )

    expect(
      await screen.findByText(/No table is available for this session/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Select a table to continue" }),
    ).toBeDisabled()
  })

  it.each(["RESERVATION_CONFLICT", "ACTIVE_SESSION"])(
    "returns to table search after %s and preserves the backend message",
    async (code) => {
      const browser = userEvent.setup()
      vi.mocked(reservationsApi.create).mockRejectedValueOnce({
        code,
        message: `${code} detected`,
      })
      render(
        <MemoryRouter>
          <ReservationPage />
        </MemoryRouter>,
      )
      await reachSummary(browser)
      await browser.click(
        screen.getByRole("button", { name: "Confirm Reservation" }),
      )

      expect(await screen.findByText(`${code} detected`)).toBeInTheDocument()
      expect(
        screen.getByRole("heading", { name: "How many players?" }),
      ).toBeInTheDocument()
    },
  )

  it("keeps the completed summary available after a generic create failure", async () => {
    const browser = userEvent.setup()
    vi.mocked(reservationsApi.create).mockRejectedValueOnce(
      new Error("Reservation service unavailable"),
    )
    render(
      <MemoryRouter>
        <ReservationPage />
      </MemoryRouter>,
    )
    await reachSummary(browser)
    await browser.click(
      screen.getByRole("button", { name: "Confirm Reservation" }),
    )

    expect(
      await screen.findByText("Reservation service unavailable"),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Reservation Summary" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Confirm Reservation" }),
    ).toBeEnabled()
  })

  it("renders reservation confirmation details and navigation", async () => {
    const confirmation = render(
      <MemoryRouter initialEntries={["/reservations/RSV-1001/confirmation"]}>
        <Routes>
          <Route
            path="/reservations/:reservationNumber/confirmation"
            element={<ReservationConfirmationPage />}
          />
          <Route
            path="/account/reservations"
            element={<h1>Reservation list</h1>}
          />
          <Route path="/shop" element={<h1>Shop page</h1>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText("Loading your reservation...")).toBeInTheDocument()
    expect(
      await screen.findByRole("heading", { name: "Your table is reserved!" }),
    ).toBeInTheDocument()
    expect(reservationsApi.get).toHaveBeenCalledWith("RSV-1001")
    expect(screen.getByText("Table A1")).toBeInTheDocument()

    await userEvent.click(
      screen.getByRole("button", { name: "View My Reservations" }),
    )
    expect(
      await screen.findByRole("heading", { name: "Reservation list" }),
    ).toBeInTheDocument()

    confirmation.unmount()
    render(
      <MemoryRouter initialEntries={["/reservations/RSV-1001/confirmation"]}>
        <Routes>
          <Route
            path="/reservations/:reservationNumber/confirmation"
            element={<ReservationConfirmationPage />}
          />
          <Route path="/shop" element={<h1>Shop page</h1>} />
        </Routes>
      </MemoryRouter>,
    )
    await userEvent.click(
      await screen.findByRole("button", { name: "Shop Games" }),
    )
    expect(
      await screen.findByRole("heading", { name: "Shop page" }),
    ).toBeInTheDocument()
  })

  it("shows reservation lookup errors", async () => {
    vi.mocked(reservationsApi.get).mockRejectedValueOnce(
      new Error("Reservation not found"),
    )
    render(
      <MemoryRouter initialEntries={["/reservations/missing/confirmation"]}>
        <Routes>
          <Route
            path="/reservations/:reservationNumber/confirmation"
            element={<ReservationConfirmationPage />}
          />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByText("Reservation not found")).toBeInTheDocument()
  })

  it("loads reservations, limits cancellation by status, and refreshes after cancel", async () => {
    vi.mocked(reservationsApi.mine)
      .mockResolvedValueOnce([
        { ...reservation, status: "pending" },
        {
          ...reservation,
          id: "reservation-2",
          reservationNumber: "RSV-1002",
          status: "completed",
        },
      ])
      .mockResolvedValueOnce([])
    const browser = userEvent.setup()
    render(
      <MemoryRouter>
        <MyReservationsApiPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText("RSV-1001")).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Cancel" })).toHaveLength(1)
    await browser.click(screen.getByRole("button", { name: "Cancel" }))
    await waitFor(() =>
      expect(reservationsApi.cancel).toHaveBeenCalledWith("RSV-1001"),
    )
    expect(
      await screen.findByText("You do not have any reservations yet."),
    ).toBeInTheDocument()
  })

  it("keeps reservation history usable when loading or cancellation fails", async () => {
    vi.mocked(reservationsApi.mine).mockRejectedValueOnce(
      new Error("Reservations offline"),
    )
    const view = render(
      <MemoryRouter>
        <MyReservationsApiPage />
      </MemoryRouter>,
    )
    expect(await screen.findByText("Reservations offline")).toBeInTheDocument()

    view.unmount()
    vi.mocked(reservationsApi.mine).mockResolvedValueOnce([
      { ...reservation, status: "confirmed" },
    ])
    vi.mocked(reservationsApi.cancel).mockRejectedValueOnce(
      new Error("Cancellation rejected"),
    )
    render(
      <MemoryRouter>
        <MyReservationsApiPage />
      </MemoryRouter>,
    )
    await userEvent.click(await screen.findByRole("button", { name: "Cancel" }))
    expect(await screen.findByText("Cancellation rejected")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled()
  })
})
