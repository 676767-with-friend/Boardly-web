import { beforeEach, describe, expect, it, vi } from "vitest"
import { apiClient } from "./apiClient"
import { authApi } from "./authApi"
import { branchesApi } from "./branchesApi"
import { cartApi } from "./cartApi"
import { checkoutApi, ordersApi } from "./checkoutApi"
import { adminApi, profileApi, staffApi } from "./managementApi"
import { notificationsApi } from "./notificationsApi"
import { productsApi } from "./productsApi"

vi.mock("./apiClient", () => {
  const client = {
    request: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  }
  return { apiClient: client, default: client }
})

describe("service API request contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it("builds authentication, branch, checkout, and order requests", () => {
    authApi.login({
      email: "a@example.test",
      password: "secret",
      rememberMe: true,
    })
    authApi.register({
      firstName: "A",
      lastName: "User",
      email: "a@example.test",
      password: "secret",
      acceptTerms: true,
      acceptPrivacy: true,
    })
    authApi.refresh("refresh")
    authApi.logout(null)
    authApi.me()
    authApi.forgotPassword("a@example.test")
    authApi.resetPassword("token", "new-secret")
    branchesApi.list()
    branchesApi.get("branch 1")
    branchesApi.tables("branch-1")
    branchesApi.games("branch-1")
    checkoutApi.options()
    checkoutApi.checkout({
      contactFirstName: "A",
      contactLastName: "User",
      contactEmail: "a@example.test",
      fulfillmentMethodId: "pickup",
      paymentMethodId: "cash",
    })
    ordersApi.get("ORD-1")
    ordersApi.mine()

    expect(apiClient.post).toHaveBeenCalledWith(
      "/auth/login",
      expect.objectContaining({ rememberMe: true }),
    )
    expect(apiClient.get).toHaveBeenCalledWith("/branches/branch 1")
    expect(apiClient.post).toHaveBeenCalledWith(
      "/checkout",
      expect.objectContaining({ fulfillmentMethodId: "pickup" }),
    )
    expect(apiClient.get).toHaveBeenCalledWith("/orders/ORD-1")
  })

  it("keeps one guest cart key and sends the expected methods and bodies", () => {
    cartApi.get()
    cartApi.addItem("product-1", 2)
    cartApi.updateItem("item-1", 3)
    cartApi.removeItem("item-1")
    cartApi.clear()

    const calls = vi.mocked(apiClient.request).mock.calls
    const keys = calls.map(
      ([, request]) => request?.headers?.["X-Guest-Session-Key"],
    )
    expect(new Set(keys).size).toBe(1)
    expect(keys[0]).toBeTruthy()
    expect(calls).toEqual(
      expect.arrayContaining([
        [
          "/cart/items",
          expect.objectContaining({
            method: "POST",
            body: { productId: "product-1", quantity: 2 },
          }),
        ],
        [
          "/cart/items/item-1",
          expect.objectContaining({ method: "PATCH", body: { quantity: 3 } }),
        ],
        ["/cart", expect.objectContaining({ method: "DELETE" })],
      ]),
    )
  })

  it("encodes catalog, notification, profile, staff, and admin requests", () => {
    productsApi.categories()
    productsApi.list({
      search: "party game",
      category: "family",
      maxPrice: 1200,
      page: 0,
      size: 12,
    })
    productsApi.list({ search: "", category: null })
    productsApi.get("product-1")
    notificationsApi.list()
    notificationsApi.list(5)
    notificationsApi.unreadCount()
    notificationsApi.markRead("notice-1")
    notificationsApi.markAllRead()
    profileApi.get()
    profileApi.update({
      firstName: "A",
      lastName: "User",
      displayName: null,
      phone: null,
    })
    staffApi.dashboard()
    staffApi.orders()
    staffApi.products("branch & one")
    staffApi.branches()
    staffApi.adjustInventory("product-1", {
      branchId: "branch-1",
      quantityDelta: 2,
    })
    staffApi.users("Ada Lovelace")
    adminApi.dashboard()
    adminApi.orders()
    adminApi.users()
    adminApi.updateUserStatus("user-1", "inactive")
    adminApi.staff()
    adminApi.createStaff({ email: "staff@example.test" })
    adminApi.updateStaff("staff-1", { active: false })
    adminApi.branches()
    adminApi.createBranch({ code: "NEW" })
    adminApi.updateBranch("branch-1", { name: "Updated" })
    adminApi.products()
    adminApi.createProduct({ sku: "SKU-1" })
    adminApi.updateProduct("product-1", { name: "Updated" })
    adminApi.inventory("branch one")
    adminApi.adjustInventory("product-1", {
      branchId: "branch-1",
      quantityDelta: 1,
    })
    adminApi.addInventory({
      branchId: "branch-1",
      productId: "product-1",
      quantityOnHand: 3,
      lowStockThreshold: 1,
    })
    adminApi.tableZones("branch one")
    adminApi.tableFeatures()
    adminApi.tables("branch one")
    const table = {
      branchId: "branch-1",
      code: "A1",
      zoneId: "zone-1",
      minPlayers: 2,
      maxPlayers: 4,
      operationalStatus: "available",
      sortOrder: 1,
      active: true,
      featureIds: [],
    }
    adminApi.createTable(table)
    adminApi.updateTable("table-1", table)
    adminApi.deactivateTable("table-1")

    expect(apiClient.get).toHaveBeenCalledWith(
      "/products?search=party+game&category=family&maxPrice=1200&page=0&size=12",
    )
    expect(apiClient.get).toHaveBeenCalledWith("/products")
    expect(apiClient.get).toHaveBeenCalledWith(
      "/staff/users?search=Ada%20Lovelace",
    )
    expect(apiClient.get).toHaveBeenCalledWith(
      "/admin/inventory?branchId=branch%20one",
    )
    expect(apiClient.delete).toHaveBeenCalledWith("/admin/tables/table-1")
  })
})
