import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  AdminDashboardPage,
  AdminOrdersPage,
  AdminProductsPage,
  BranchManagementPage,
  StaffManagementPage,
  UserManagementPage,
} from "./AdminPages"
import { adminApi } from "@/services/managementApi"
import { productsApi } from "@/services/productsApi"

vi.mock("@/services/managementApi", () => ({
  adminApi: {
    dashboard: vi.fn(),
    orders: vi.fn(),
    users: vi.fn(),
    updateUserStatus: vi.fn(),
    staff: vi.fn(),
    createStaff: vi.fn(),
    updateStaff: vi.fn(),
    branches: vi.fn(),
    createBranch: vi.fn(),
    updateBranch: vi.fn(),
    products: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    inventory: vi.fn(),
    adjustInventory: vi.fn(),
    addInventory: vi.fn(),
  },
}))
vi.mock("@/services/productsApi", () => ({
  productsApi: { categories: vi.fn(), list: vi.fn() },
}))

const branch = {
  id: "branch-1",
  code: "BKK",
  name: "Central",
  address: "1 Boardly Road",
  district: "Pathum Wan",
  province: "Bangkok",
  postalCode: "10330",
  phone: "021234567",
  status: "active",
  allowReservations: true,
  tableCount: 8,
  staffCount: 3,
  reservationsToday: 4,
}

const product = {
  id: "product-1",
  sku: "CATAN",
  name: "Catan",
  categoryId: "category-1",
  categoryName: "Strategy",
  basePrice: 1200,
  salePrice: null,
  minPlayers: 3,
  maxPlayers: 4,
  minPlayTimeMinutes: 60,
  maxPlayTimeMinutes: 120,
  minAge: 10,
  difficulty: "medium",
  description: "Trade and build",
  active: true,
  stock: 5,
}

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

describe("admin management pages", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(adminApi.dashboard).mockResolvedValue({
      branchName: "All branches",
      totalTables: 12,
      availableTables: 7,
      unavailableTables: 2,
      activeSessions: 3,
      reservationsToday: 4,
      orders: 5,
      activeBranches: 2,
      activeStaff: 8,
      salesToday: 9500,
    })
    vi.mocked(adminApi.orders).mockResolvedValue([])
    vi.mocked(adminApi.users).mockResolvedValue([])
    vi.mocked(adminApi.staff).mockResolvedValue([])
    vi.mocked(adminApi.branches).mockResolvedValue([branch])
    vi.mocked(adminApi.products).mockResolvedValue([product])
    vi.mocked(adminApi.inventory).mockResolvedValue([inventory])
    vi.mocked(productsApi.categories).mockResolvedValue([
      { id: "category-1", name: "Strategy" },
    ] as never)
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
  })

  it("renders the network dashboard and reports dashboard failures", async () => {
    const dashboard = render(<AdminDashboardPage />)
    expect(await screen.findByText("Network Overview")).toBeInTheDocument()
    expect(screen.getByText("Total Sales Today")).toBeInTheDocument()
    expect(screen.getByText("Active Sessions")).toBeInTheDocument()

    dashboard.unmount()
    vi.mocked(adminApi.dashboard).mockRejectedValueOnce(
      new Error("Dashboard unavailable"),
    )
    render(<AdminDashboardPage />)
    expect(await screen.findByText("Dashboard unavailable")).toBeInTheDocument()
  })

  it("filters orders by persisted status and reports order API failures", async () => {
    vi.mocked(adminApi.orders).mockResolvedValueOnce([
      {
        orderNumber: "ORD-PENDING",
        customerName: "Pending Customer",
        status: "pending",
        fulfillmentMethod: "pickup",
        pickupBranchName: "Central",
        totalAmount: 500,
        currency: "THB",
        itemCount: 1,
        placedAt: "2026-10-30T08:00:00+07:00",
      },
      {
        orderNumber: "ORD-COMPLETE",
        customerName: "Completed Customer",
        status: "completed",
        fulfillmentMethod: "delivery",
        pickupBranchName: null,
        totalAmount: 900,
        currency: "THB",
        itemCount: 2,
        placedAt: "2026-10-30T09:00:00+07:00",
      },
    ])
    const orders = render(<AdminOrdersPage />)
    expect(await screen.findByText("#ORD-PENDING")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "completed" }))
    expect(screen.queryByText("Pending Customer")).not.toBeInTheDocument()
    expect(screen.getByText("Completed Customer")).toBeInTheDocument()

    orders.unmount()
    vi.mocked(adminApi.orders).mockRejectedValueOnce(
      new Error("Orders unavailable"),
    )
    render(<AdminOrdersPage />)
    expect(await screen.findByText("Orders unavailable")).toBeInTheDocument()
  })

  it("changes a customer status and reflects the API response", async () => {
    const activeUser = {
      id: "user-1",
      name: "Ada Lovelace",
      email: "ada@example.com",
      phone: "0812345678",
      status: "active",
      roles: ["customer"],
      orderCount: 1,
      reservationCount: 2,
      completedVisits: 3,
      lastActivity: "2026-10-30T08:00:00+07:00",
    }
    vi.mocked(adminApi.users).mockResolvedValue([activeUser])
    vi.mocked(adminApi.updateUserStatus).mockResolvedValue({
      ...activeUser,
      status: "inactive",
    })

    render(<UserManagementPage />)

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }))
    await waitFor(() =>
      expect(adminApi.updateUserStatus).toHaveBeenCalledWith(
        "user-1",
        "inactive",
      ),
    )
    expect(screen.getByRole("button", { name: "Activate" })).toBeInTheDocument()
  })

  it("validates staff assignment, reports duplicate email, then creates staff", async () => {
    vi.mocked(adminApi.createStaff)
      .mockRejectedValueOnce(new Error("Email already exists"))
      .mockResolvedValueOnce({ id: "staff-2" } as never)

    render(<StaffManagementPage />)
    expect(
      await screen.findByText("No matching staff accounts."),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "+ Add Staff" }))

    fireEvent.change(screen.getByLabelText("First name"), {
      target: { value: "Grace" },
    })
    fireEvent.change(screen.getByLabelText("Last name"), {
      target: { value: "Hopper" },
    })
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "grace@example.com" },
    })
    fireEvent.change(screen.getByLabelText("Temporary password"), {
      target: { value: "correct-horse-battery" },
    })
    fireEvent.change(screen.getByLabelText("Phone"), {
      target: { value: "0812345678" },
    })
    fireEvent.click(screen.getByLabelText("Central"))
    fireEvent.change(screen.getByLabelText("Primary branch"), {
      target: { value: "branch-1" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(await screen.findByText("Email already exists")).toBeInTheDocument()
    expect(adminApi.createStaff).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: "Grace",
        lastName: "Hopper",
        email: "grace@example.com",
        branchIds: ["branch-1"],
        primaryBranchId: "branch-1",
      }),
    )

    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => expect(adminApi.createStaff).toHaveBeenCalledTimes(2))
    expect(screen.queryByText("Add Staff")).not.toBeInTheDocument()
  })

  it("updates an existing staff assignment without resending credentials", async () => {
    vi.mocked(adminApi.staff).mockResolvedValueOnce([
      {
        id: "staff-1",
        name: "Lin Manager",
        email: "lin@example.test",
        phone: null,
        status: "active",
        branchIds: ["branch-1"],
        branchNames: ["Central"],
        lastLoginAt: null,
        roles: ["manager"],
      },
    ])
    vi.mocked(adminApi.updateStaff).mockResolvedValue({} as never)
    render(<StaffManagementPage />)
    fireEvent.click(await screen.findByRole("button", { name: "Edit" }))
    fireEvent.change(screen.getByLabelText("First name"), {
      target: { value: "Linda" },
    })
    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "suspended" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() =>
      expect(adminApi.updateStaff).toHaveBeenCalledWith(
        "staff-1",
        expect.objectContaining({
          firstName: "Linda",
          role: "manager",
          status: "suspended",
          branchIds: ["branch-1"],
          primaryBranchId: "branch-1",
        }),
      ),
    )
    expect(adminApi.updateStaff).not.toHaveBeenCalledWith(
      "staff-1",
      expect.objectContaining({ password: expect.anything() }),
    )
  })

  it("updates a branch and sends its reservation setting", async () => {
    vi.mocked(adminApi.updateBranch).mockResolvedValue({
      ...branch,
      name: "Central World",
      allowReservations: false,
    })

    render(<BranchManagementPage />)
    expect(await screen.findByText("Central")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Edit" }))
    fireEvent.change(screen.getByLabelText("Branch Name"), {
      target: { value: "Central World" },
    })
    fireEvent.change(screen.getByLabelText("Reservations"), {
      target: { value: "no" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() =>
      expect(adminApi.updateBranch).toHaveBeenCalledWith(
        "branch-1",
        expect.objectContaining({
          name: "Central World",
          allowReservations: false,
        }),
      ),
    )
  })

  it("surfaces duplicate branch and product creation errors without closing editors", async () => {
    vi.mocked(adminApi.createBranch).mockRejectedValueOnce(
      new Error("Branch code already exists"),
    )
    const branches = render(<BranchManagementPage />)
    fireEvent.click(await screen.findByRole("button", { name: "+ Add Branch" }))
    fireEvent.change(screen.getByLabelText("Branch Code"), {
      target: { value: "BKK" },
    })
    fireEvent.change(screen.getByLabelText("Branch Name"), {
      target: { value: "Duplicate Central" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    expect(
      await screen.findByText("Branch code already exists"),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Add Branch" }),
    ).toBeInTheDocument()

    branches.unmount()
    vi.mocked(adminApi.createProduct).mockRejectedValueOnce(
      new Error("Product SKU already exists"),
    )
    render(<AdminProductsPage />)
    fireEvent.click(
      await screen.findByRole("button", { name: "+ Add Product" }),
    )
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Duplicate Catan" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    expect(
      await screen.findByText("Product SKU already exists"),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Add Product" }),
    ).toBeInTheDocument()
  })

  it("edits a product and performs branch inventory actions", async () => {
    const secondProduct = {
      ...product,
      id: "product-2",
      sku: "AZUL",
      name: "Azul",
      stock: 0,
    }
    vi.mocked(adminApi.products).mockResolvedValue([product, secondProduct])
    vi.mocked(adminApi.updateProduct).mockResolvedValue({
      ...product,
      name: "Catan Plus",
    })
    vi.mocked(adminApi.adjustInventory).mockResolvedValue({
      ...inventory,
      quantityOnHand: 7,
      availableQuantity: 6,
    })
    vi.mocked(adminApi.addInventory).mockResolvedValue({
      ...inventory,
      productId: "product-2",
      productName: "Azul",
    })

    render(<AdminProductsPage />)
    expect(await screen.findByText("Catan")).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0])
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Catan Plus" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() =>
      expect(adminApi.updateProduct).toHaveBeenCalledWith(
        "product-1",
        expect.objectContaining({ name: "Catan Plus" }),
      ),
    )

    fireEvent.click(await screen.findByRole("button", { name: "Adjust" }))
    fireEvent.change(screen.getByLabelText("Quantity change"), {
      target: { value: "2" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() =>
      expect(adminApi.adjustInventory).toHaveBeenCalledWith("product-1", {
        branchId: "branch-1",
        quantityDelta: 2,
      }),
    )

    fireEvent.click(
      screen.getByRole("button", { name: "+ Add Catalog Product" }),
    )
    fireEvent.change(screen.getByLabelText("Product"), {
      target: { value: "product-2" },
    })
    fireEvent.change(screen.getByLabelText("Opening quantity"), {
      target: { value: "3" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() =>
      expect(adminApi.addInventory).toHaveBeenCalledWith({
        branchId: "branch-1",
        productId: "product-2",
        quantityOnHand: 3,
        lowStockThreshold: 3,
      }),
    )
  })

  it("surfaces unauthorized product-management access", async () => {
    vi.mocked(adminApi.products).mockRejectedValueOnce(
      new Error("Unauthorized"),
    )
    render(<AdminProductsPage />)
    expect(await screen.findByText("Unauthorized")).toBeInTheDocument()
  })
})
