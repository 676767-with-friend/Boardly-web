import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  StaffDashboardPage,
  StaffOrdersPage,
  StaffProductsPage,
  StaffUsersPage,
} from "./StaffPages"
import { staffApi } from "@/services/managementApi"
import { productsApi } from "@/services/productsApi"

const navigate = vi.fn()

vi.mock("react-router-dom", () => ({ useNavigate: () => navigate }))
vi.mock("@/services/managementApi", () => ({
  staffApi: {
    dashboard: vi.fn(),
    orders: vi.fn(),
    products: vi.fn(),
    branches: vi.fn(),
    adjustInventory: vi.fn(),
    users: vi.fn(),
  },
}))
vi.mock("@/services/productsApi", () => ({
  productsApi: { list: vi.fn() },
}))

const inventory = {
  branchId: "branch-1",
  branchName: "Central",
  productId: "product-1",
  productName: "Catan",
  sku: "CATAN",
  quantityOnHand: 5,
  reservedQuantity: 1,
  availableQuantity: 4,
  lowStockThreshold: 2,
}

describe("staff management pages", () => {
  beforeEach(() => vi.clearAllMocks())

  it("loads the dashboard and routes each quick action", async () => {
    vi.mocked(staffApi.dashboard).mockResolvedValue({
      branchName: "Central",
      totalTables: 8,
      availableTables: 5,
      unavailableTables: 3,
      activeSessions: 2,
      reservationsToday: 4,
      orders: 3,
      activeBranches: 1,
      activeStaff: 2,
      salesToday: 1000,
    })

    render(<StaffDashboardPage />)

    expect(
      screen.getByText(/Loading database-backed information/),
    ).toBeInTheDocument()
    expect(await screen.findByText("Central")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /View Live Tables/ }))
    fireEvent.click(
      screen.getByRole("button", { name: /Reservation Check-In/ }),
    )
    fireEvent.click(screen.getByRole("button", { name: /Pickup Orders/ }))
    expect(navigate.mock.calls.map(([path]) => path)).toEqual([
      "/staff/tables",
      "/staff/check-in",
      "/staff/orders",
    ])
  })

  it("filters pickup orders and reports API failures", async () => {
    vi.mocked(staffApi.orders).mockResolvedValueOnce([
      {
        orderNumber: "ORD-1",
        customerName: "Ada",
        status: "ready_for_pickup",
        fulfillmentMethod: "pickup",
        pickupBranchName: "Central",
        totalAmount: 1200,
        currency: "THB",
        itemCount: 2,
        placedAt: "2026-10-30T08:00:00+07:00",
      },
      {
        orderNumber: "ORD-2",
        customerName: "Grace",
        status: "completed",
        fulfillmentMethod: "pickup",
        pickupBranchName: "Central",
        totalAmount: 700,
        currency: "THB",
        itemCount: 1,
        placedAt: "2026-10-29T08:00:00+07:00",
      },
    ])

    const view = render(<StaffOrdersPage />)
    expect(await screen.findByText("#ORD-1")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "completed" }))
    expect(screen.queryByText("#ORD-1")).not.toBeInTheDocument()
    expect(screen.getByText("#ORD-2")).toBeInTheDocument()

    view.unmount()
    vi.mocked(staffApi.orders).mockRejectedValueOnce(new Error("Orders denied"))
    render(<StaffOrdersPage />)
    expect(await screen.findByText("Orders denied")).toBeInTheDocument()
  })

  it("loads branch inventory and submits a valid stock adjustment", async () => {
    vi.mocked(staffApi.branches).mockResolvedValue([
      { id: "branch-1", name: "Central" },
      { id: "branch-2", name: "North" },
    ])
    vi.mocked(productsApi.list).mockResolvedValue({
      content: [
        {
          id: "product-1",
          name: "Catan",
          image: "/catan.png",
          category: "Strategy",
          price: 1200,
          salePrice: null,
        },
      ],
    } as never)
    vi.mocked(staffApi.products).mockResolvedValue([inventory])
    vi.mocked(staffApi.adjustInventory).mockResolvedValue({
      ...inventory,
      quantityOnHand: 7,
      availableQuantity: 6,
    })

    render(<StaffProductsPage />)

    expect(await screen.findByText("Catan")).toBeInTheDocument()
    expect(screen.getAllByText("In Stock")).toHaveLength(2)
    fireEvent.click(screen.getByRole("button", { name: "Adjust" }))
    const quantity = screen.getByLabelText("Quantity change")
    fireEvent.change(quantity, { target: { value: "2" } })
    expect(screen.getByText("New on-hand quantity: 7")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() =>
      expect(staffApi.adjustInventory).toHaveBeenCalledWith("product-1", {
        branchId: "branch-1",
        quantityDelta: 2,
      }),
    )
    expect(staffApi.products).toHaveBeenCalledTimes(2)
  })

  it("searches customer records when Enter is pressed", async () => {
    vi.mocked(staffApi.users)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "user-1",
          name: "Ada Lovelace",
          email: "ada@example.com",
          phone: null,
          status: "active",
          roles: ["customer"],
          orderCount: 1,
          reservationCount: 2,
          completedVisits: 3,
          lastActivity: "2026-10-30T08:00:00+07:00",
        },
      ])

    render(<StaffUsersPage />)
    expect(
      await screen.findByText("No matching customer records."),
    ).toBeInTheDocument()
    const search = screen.getByPlaceholderText("Search name, email, phone...")
    fireEvent.change(search, { target: { value: "Ada" } })
    fireEvent.keyDown(search, { key: "Enter" })

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument()
    expect(staffApi.users).toHaveBeenLastCalledWith("Ada")
  })
})
