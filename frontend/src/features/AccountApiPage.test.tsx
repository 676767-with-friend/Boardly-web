import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AccountApiPage } from "./AccountApiPage"
import { useAuth } from "@/auth/AuthProvider"
import { ordersApi } from "@/services/checkoutApi"
import { profileApi } from "@/services/managementApi"
import { reservationsApi } from "@/services/reservationsApi"
import { THAI_PHONE_ERROR } from "@/utils/phone"

const navigate = vi.fn()

vi.mock("react-router-dom", () => ({ useNavigate: () => navigate }))
vi.mock("@/auth/AuthProvider", () => ({ useAuth: vi.fn() }))
vi.mock("@/services/managementApi", () => ({
  profileApi: { get: vi.fn(), update: vi.fn() },
}))
vi.mock("@/services/checkoutApi", () => ({
  ordersApi: { mine: vi.fn() },
}))
vi.mock("@/services/reservationsApi", () => ({
  reservationsApi: { mine: vi.fn() },
}))

const logout = vi.fn()
const refreshUser = vi.fn()
const profile = {
  id: "user-1",
  firstName: "Ada",
  lastName: "Lovelace",
  displayName: "Ada",
  email: "ada@example.com",
  phone: "0812345678",
}

describe("customer account API page", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({ logout, refreshUser } as never)
    logout.mockResolvedValue(undefined)
    refreshUser.mockResolvedValue(undefined)
    vi.mocked(profileApi.get).mockResolvedValue(profile)
    vi.mocked(ordersApi.mine).mockResolvedValue([])
    vi.mocked(reservationsApi.mine).mockResolvedValue([])
  })

  it("loads account activity and updates a valid profile", async () => {
    vi.mocked(ordersApi.mine).mockResolvedValue([
      {
        orderNumber: "ORD-1",
        status: "ready_for_pickup",
        fulfillmentMethod: "pickup",
        pickupBranchName: "Central",
        subtotal: 1200,
        shippingFee: 0,
        totalAmount: 1200,
        currency: "THB",
        estimatedDeliveryDate: null,
        paymentStatus: "paid",
        paymentMethod: "card",
        items: [
          {
            productId: "product-1",
            name: "Catan",
            sku: "CATAN",
            unitPrice: 1200,
            quantity: 1,
            lineTotal: 1200,
          },
        ],
      },
    ])
    vi.mocked(reservationsApi.mine).mockResolvedValue([
      {
        id: "reservation-1",
        reservationNumber: "RSV-1",
        branchId: "branch-1",
        branchName: "Central",
        tableId: "table-1",
        tableCode: "A1",
        contactName: "Ada",
        startsAt: "2026-11-01T18:00:00+07:00",
        endsAt: "2026-11-01T20:00:00+07:00",
        playerCount: 4,
        status: "confirmed",
        estimatedFee: 400,
        currency: "THB",
      },
    ])
    vi.mocked(profileApi.update).mockResolvedValue({
      ...profile,
      displayName: "Countess Ada",
    })

    render(<AccountApiPage />)

    expect(screen.getByText("Loading your account...")).toBeInTheDocument()
    expect(await screen.findByText("Welcome back, Ada")).toBeInTheDocument()
    expect(screen.getByText("Catan")).toBeInTheDocument()
    expect(screen.getByText("RSV-1")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Edit Profile" }))
    fireEvent.change(screen.getByLabelText("Display name"), {
      target: { value: "Countess Ada" },
    })
    fireEvent.change(screen.getByLabelText("Phone"), {
      target: { value: "invalid" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }))
    expect(await screen.findByText(THAI_PHONE_ERROR)).toBeInTheDocument()
    expect(profileApi.update).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText("Phone"), {
      target: { value: "0891234567" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }))

    await waitFor(() =>
      expect(profileApi.update).toHaveBeenCalledWith(
        expect.objectContaining({
          displayName: "Countess Ada",
          phone: "0891234567",
        }),
      ),
    )
    expect(refreshUser).toHaveBeenCalled()
    expect(await screen.findByText("Profile saved.")).toBeInTheDocument()
    expect(screen.getByText("Welcome back, Countess Ada")).toBeInTheDocument()
  })

  it("shows empty states and routes quick actions and logout", async () => {
    render(<AccountApiPage />)

    expect(
      await screen.findByText("No upcoming reservation yet."),
    ).toBeInTheDocument()
    expect(screen.getByText("No Boardly orders yet.")).toBeInTheDocument()
    expect(screen.getByText("No activity recorded yet.")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Reserve a Table" }))
    fireEvent.click(screen.getByRole("button", { name: "Shop Board Games" }))
    fireEvent.click(screen.getByRole("button", { name: /My Orders/ }))
    fireEvent.click(screen.getByRole("button", { name: "Logout" }))

    await waitFor(() => expect(logout).toHaveBeenCalled())
    expect(navigate).toHaveBeenCalledWith("/reserve")
    expect(navigate).toHaveBeenCalledWith("/shop")
    expect(navigate).toHaveBeenCalledWith("/account/orders")
    expect(navigate).toHaveBeenCalledWith("/")
  })

  it("shows authentication and update API failures", async () => {
    vi.mocked(profileApi.get).mockRejectedValueOnce(
      new Error("Session expired"),
    )
    const view = render(<AccountApiPage />)
    expect(await screen.findByText("Session expired")).toBeInTheDocument()

    view.unmount()
    vi.mocked(profileApi.get).mockResolvedValueOnce(profile)
    vi.mocked(profileApi.update).mockRejectedValueOnce(
      new Error("Duplicate profile value"),
    )
    render(<AccountApiPage />)
    await screen.findByText("Welcome back, Ada")
    fireEvent.click(screen.getByRole("button", { name: "Edit Profile" }))
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }))
    expect(
      await screen.findByText("Duplicate profile value"),
    ).toBeInTheDocument()
  })
})
