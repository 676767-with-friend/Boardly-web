import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { MemoryRouter } from "react-router-dom"
import {
  CartPage,
  CheckoutPage,
  MyOrdersPage,
  OrderConfirmationPage,
} from "./CommercePages"
import { checkoutApi, ordersApi } from "@/services/checkoutApi"

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  reload: vi.fn(),
  updateItem: vi.fn(),
  removeItem: vi.fn(),
  orderNumber: "ORD-100",
  cartState: {} as Record<string, unknown>,
}))

vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  )),
  useNavigate: () => mocks.navigate,
  useParams: () => ({ orderNumber: mocks.orderNumber }),
}))

vi.mock("@/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { firstName: "Test", lastName: "User", email: "test@example.test" },
  }),
}))

vi.mock("@/commerce/CartProvider", () => ({
  useCart: () => mocks.cartState,
}))

vi.mock("@/services/checkoutApi", () => ({
  checkoutApi: { options: vi.fn(), checkout: vi.fn() },
  ordersApi: { get: vi.fn(), mine: vi.fn() },
}))

const fulfillment = (
  id: string,
  code: string,
  name: string,
  available: boolean,
  baseFee = 0,
) => ({
  id,
  code,
  name,
  baseFee,
  etaMinDays: null,
  etaMaxDays: null,
  storePickup: code === "pickup",
  checkoutAvailable: available,
  unavailableReason: available ? null : "Delivery is unavailable",
})

const cart = (quantity = 1) => ({
  id: "cart-1",
  items: [
    {
      id: "item-1",
      sku: "CATAN",
      name: "Catan",
      image: "/catan.jpg",
      quantity,
      lineTotal: 100 * quantity,
    },
  ],
  itemCount: quantity,
  subtotal: 100 * quantity,
  currency: "THB",
})

const checkoutOptions = (withBranches = true) => ({
  fulfillmentMethods: [
    fulfillment("pickup-id", "pickup", "Pickup", true, 20),
    fulfillment("express-id", "express", "Express", false),
    fulfillment("standard-id", "standard", "Standard", false),
  ],
  paymentMethods: [
    { id: "cash-id", code: "cash", name: "Cash" },
    { id: "card-id", code: "card", name: "Card" },
  ],
  eligiblePickupBranches: withBranches
    ? [
        {
          id: "branch-1",
          name: "Central",
          address: "1 Main Road",
          district: "Pathum Wan",
        },
      ]
    : [],
})

const order = {
  orderNumber: "ORD-100",
  status: "pending_pickup",
  fulfillmentMethod: "Pick Up",
  shippingFee: 0,
  totalAmount: 100,
  pickupBranchName: "Central",
  paymentStatus: "pending",
  items: [{ sku: "CATAN", name: "Catan", quantity: 1, lineTotal: 100 }],
}

function renderPage(page: React.ReactNode) {
  return render(<MemoryRouter>{page}</MemoryRouter>)
}

async function reachPickup() {
  const continueButton = await screen.findByRole("button", {
    name: "Continue to Pickup",
  })
  fireEvent.change(document.querySelector("input[type=tel]")!, {
    target: { value: "0812345678" },
  })
  fireEvent.click(continueButton)
}

async function selectBranchAndReachPayment() {
  await reachPickup()
  fireEvent.click(
    screen.getByRole("button", {
      name: "Select an eligible pickup branch",
    }),
  )
  fireEvent.click(screen.getByRole("option", { name: /Central/ }))
  fireEvent.click(screen.getByRole("button", { name: "Continue to Payment" }))
}

describe("Commerce pages", () => {
  beforeEach(() => {
    mocks.orderNumber = "ORD-100"
    Object.assign(mocks.cartState, {
      cart: cart(),
      loading: false,
      error: null,
      reload: mocks.reload,
      updateItem: mocks.updateItem,
      removeItem: mocks.removeItem,
    })
    mocks.reload.mockResolvedValue(undefined)
    mocks.updateItem.mockResolvedValue(undefined)
    mocks.removeItem.mockResolvedValue(undefined)
    vi.mocked(checkoutApi.options).mockResolvedValue(checkoutOptions())
  })

  it("shows cart loading and empty states and returns shoppers to the catalog", () => {
    mocks.cartState.loading = true
    const view = renderPage(<CartPage />)
    expect(screen.getByText("Loading your cart...")).toBeInTheDocument()

    mocks.cartState.loading = false
    mocks.cartState.cart = { ...cart(), items: [], itemCount: 0, subtotal: 0 }
    view.rerender(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole("button", { name: "Shop Board Games" }))
    expect(mocks.navigate).toHaveBeenCalledWith("/shop")
  })

  it("updates and removes cart items and exposes action failures", async () => {
    mocks.cartState.cart = cart(2)
    renderPage(<CartPage />)

    fireEvent.click(screen.getByRole("button", { name: "Decrease quantity" }))
    fireEvent.click(screen.getByRole("button", { name: "Increase quantity" }))
    expect(mocks.updateItem).toHaveBeenNthCalledWith(1, "item-1", 1)
    expect(mocks.updateItem).toHaveBeenNthCalledWith(2, "item-1", 3)

    mocks.removeItem.mockRejectedValueOnce(new Error("Item is reserved"))
    fireEvent.click(screen.getByRole("button", { name: "Remove Catan" }))
    expect(await screen.findByText("Item is reserved")).toBeInTheDocument()

    mocks.updateItem.mockRejectedValueOnce("failure")
    fireEvent.click(screen.getByRole("button", { name: "Increase quantity" }))
    expect(
      await screen.findByText("Unable to update your cart."),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Checkout" }))
    expect(mocks.navigate).toHaveBeenCalledWith("/checkout")
  })

  it("does not decrement a single item and shows provider errors", () => {
    mocks.cartState.error = "Unable to load cart"
    renderPage(<CartPage />)
    fireEvent.click(screen.getByRole("button", { name: "Decrease quantity" }))
    expect(mocks.updateItem).not.toHaveBeenCalled()
    expect(screen.getByText("Unable to load cart")).toBeInTheDocument()
  })

  it("loads checkout options and reports option API failures", async () => {
    let rejectOptions: (reason: unknown) => void
    vi.mocked(checkoutApi.options).mockReturnValueOnce(
      new Promise((_, reject) => {
        rejectOptions = reject
      }),
    )
    renderPage(<CheckoutPage />)
    expect(screen.getByText("Loading checkout...")).toBeInTheDocument()

    await act(async () => rejectOptions(new Error("Checkout unavailable")))
    expect(await screen.findByText("Checkout unavailable")).toBeInTheDocument()
  })

  it("validates contact details and Thai phone numbers before pickup", async () => {
    renderPage(<CheckoutPage />)
    fireEvent.change(await screen.findByDisplayValue("Test"), {
      target: { value: "" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Continue to Pickup" }))
    expect(
      screen.getByText(
        "Enter your name and a valid email address to continue.",
      ),
    ).toBeInTheDocument()

    fireEvent.change(screen.getAllByRole("textbox")[0], {
      target: { value: "Test" },
    })
    fireEvent.change(document.querySelector("input[type=tel]")!, {
      target: { value: "123" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Continue to Pickup" }))
    expect(
      screen.getByText(/กรุณากรอกหมายเลขโทรศัพท์ไทย/),
    ).toBeInTheDocument()
  })

  it("orders fulfillment methods and blocks unsupported delivery and missing branches", async () => {
    vi.mocked(checkoutApi.options).mockResolvedValueOnce(checkoutOptions(false))
    renderPage(<CheckoutPage />)
    await reachPickup()

    const labels = ["Standard", "Express", "Pick Up"].map((label) =>
      screen.getByText(label),
    )
    expect(labels[0].compareDocumentPosition(labels[1])).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(labels[1].compareDocumentPosition(labels[2])).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(labels[0].closest("button")).toBeDisabled()
    expect(labels[1].closest("button")).toBeDisabled()
    expect(labels[2].closest("button")).toBeEnabled()
    expect(screen.getByText(/No pickup branch currently/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Continue to Payment" }))
    expect(
      screen.getByText("No eligible pickup branch is currently available."),
    ).toBeInTheDocument()
  })

  it("places a pickup order once with the selected contact, branch, and payment", async () => {
    let resolveOrder: (value: typeof order) => void
    vi.mocked(checkoutApi.checkout).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveOrder = resolve
      }),
    )
    renderPage(<CheckoutPage />)
    await selectBranchAndReachPayment()

    fireEvent.click(screen.getByRole("button", { name: "Card" }))
    fireEvent.click(screen.getByRole("button", { name: "Place Order" }))
    expect(
      screen.getByRole("button", { name: "Placing Order..." }),
    ).toBeDisabled()
    fireEvent.click(screen.getByRole("button", { name: "Placing Order..." }))
    expect(checkoutApi.checkout).toHaveBeenCalledTimes(1)
    expect(checkoutApi.checkout).toHaveBeenCalledWith({
      contactFirstName: "Test",
      contactLastName: "User",
      contactEmail: "test@example.test",
      contactPhone: "0812345678",
      fulfillmentMethodId: "pickup-id",
      pickupBranchId: "branch-1",
      paymentMethodId: "card-id",
    })

    await act(async () => resolveOrder(order))
    await waitFor(() => expect(mocks.reload).toHaveBeenCalled())
    expect(mocks.navigate).toHaveBeenCalledWith("/orders/ORD-100/confirmation")
  })

  it("keeps checkout recoverable after an unauthorized order response", async () => {
    vi.mocked(checkoutApi.checkout).mockRejectedValueOnce(
      new Error("Authentication required"),
    )
    renderPage(<CheckoutPage />)
    await selectBranchAndReachPayment()
    fireEvent.click(screen.getByRole("button", { name: "Place Order" }))

    expect(
      await screen.findByText("Authentication required"),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Place Order" })).toBeEnabled()
  })

  it("shows an empty checkout when the cart has no products", async () => {
    mocks.cartState.cart = { ...cart(), items: [], itemCount: 0, subtotal: 0 }
    renderPage(<CheckoutPage />)
    fireEvent.click(
      await screen.findByRole("button", { name: "Shop Board Games" }),
    )
    expect(mocks.navigate).toHaveBeenCalledWith("/shop")
  })

  it("renders an order confirmation and its navigation actions", async () => {
    vi.mocked(ordersApi.get).mockResolvedValueOnce(order)
    renderPage(<OrderConfirmationPage />)
    expect(screen.getByText("Loading your order...")).toBeInTheDocument()
    expect(await screen.findByText("Order Confirmed")).toBeInTheDocument()
    expect(screen.getByText("Order #ORD-100")).toBeInTheDocument()
    expect(screen.getByText("Catan x 1")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "View My Orders" }))
    fireEvent.click(screen.getByRole("button", { name: "Continue Shopping" }))
    expect(mocks.navigate).toHaveBeenCalledWith("/account/orders")
    expect(mocks.navigate).toHaveBeenCalledWith("/shop")
  })

  it("shows order lookup failures and links back to the order list", async () => {
    vi.mocked(ordersApi.get).mockRejectedValueOnce("network failure")
    renderPage(<OrderConfirmationPage />)
    expect(
      await screen.findByText("Unable to load this order."),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "View My Orders" }))
    expect(mocks.navigate).toHaveBeenCalledWith("/account/orders")
  })

  it("renders order history, pluralizes items, and opens an order", async () => {
    vi.mocked(ordersApi.mine).mockResolvedValueOnce([
      order,
      {
        ...order,
        orderNumber: "ORD-200",
        items: [
          ...order.items,
          { ...order.items[0], sku: "AZUL", name: "Azul" },
        ],
      },
    ])
    renderPage(<MyOrdersPage />)
    expect(screen.getByText("Loading your orders...")).toBeInTheDocument()
    expect(await screen.findByText("Order #ORD-100")).toBeInTheDocument()
    expect(screen.getByText(/1 game - Pick Up/)).toBeInTheDocument()
    expect(screen.getByText(/2 games - Pick Up/)).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole("button", { name: "View Order" })[1])
    expect(mocks.navigate).toHaveBeenCalledWith("/orders/ORD-200/confirmation")
  })

  it("handles empty and failed order histories", async () => {
    vi.mocked(ordersApi.mine).mockResolvedValueOnce([])
    const view = renderPage(<MyOrdersPage />)
    fireEvent.click(
      await screen.findByRole("button", { name: "Shop Board Games" }),
    )
    expect(mocks.navigate).toHaveBeenCalledWith("/shop")

    vi.mocked(ordersApi.mine).mockRejectedValueOnce(new Error("Orders offline"))
    view.unmount()
    renderPage(<MyOrdersPage />)
    expect(await screen.findByText("Orders offline")).toBeInTheDocument()
  })
})
