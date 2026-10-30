import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import App from "./App"

vi.mock("./auth/AuthProvider", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-provider">{children}</div>
  ),
}))

vi.mock("./commerce/CartProvider", () => ({
  CartProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="cart-provider">{children}</div>
  ),
}))

vi.mock("./app/router", () => ({
  AppRouter: () => <div>Boardly router</div>,
}))

describe("App", () => {
  it("composes authentication, cart state, and the application router", () => {
    render(<App />)

    expect(screen.getByTestId("auth-provider")).toContainElement(
      screen.getByTestId("cart-provider"),
    )
    expect(screen.getByTestId("cart-provider")).toHaveTextContent(
      "Boardly router",
    )
  })
})
