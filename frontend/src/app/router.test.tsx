import { render, screen } from "@testing-library/react"

import { describe, it, expect, vi } from "vitest"

import { AppRouter, legacyNavigate } from "./router"

// Mock Layouts ให้เรนเดอร์ children (Outlet) ออกมาด้วย

vi.mock("@/layouts", () => ({
  CustomerLayout: () => (
    <div data-testid="customer-layout">Customer Layout</div>
  ),

  StaffLayout: () => <div data-testid="staff-layout">Staff Layout</div>,

  ManagerLayout: () => <div data-testid="manager-layout">Manager Layout</div>,

  AdminLayout: () => <div data-testid="admin-layout">Admin Layout</div>,

  AuthLayout: () => (
    <div data-testid="auth-layout">
      <div data-testid="login-page">Login Page</div>
    </div>
  ),
}))

// Mock หน้าเพจต่างๆ

vi.mock("@/features/PublicReadPages", () => ({
  PublicHomePage: () => <div data-testid="public-home">Home Page</div>,

  PublicShopPage: () => <div data-testid="public-shop">Shop Page</div>,

  PublicProductPage: () => <div data-testid="public-product">Product Page</div>,

  PublicVisitStorePage: () => (
    <div data-testid="public-stores">Stores Page</div>
  ),
}))

vi.mock("@/features/AuthPages", () => ({
  LoginPage: () => <div data-testid="login-page">Login Page</div>,

  RegisterPage: () => <div data-testid="register-page">Register Page</div>,

  ForgotPasswordPage: () => (
    <div data-testid="forgot-password-page">Forgot Password</div>
  ),

  ResetPasswordPage: () => (
    <div data-testid="reset-password-page">Reset Password</div>
  ),
}))

describe("AppRouter & Navigation", () => {
  it("renders CustomerLayout on default root path", () => {
    window.history.pushState({}, "Home page", "/")

    render(<AppRouter />)

    expect(screen.getByTestId("customer-layout")).toBeInTheDocument()
  })

  it("renders LoginPage on /login path", () => {
    window.history.pushState({}, "Login page", "/login")

    render(<AppRouter />)

    expect(screen.getByTestId("login-page")).toBeInTheDocument()
  })

  it("renders CustomerLayout on /shop path", () => {
    window.history.pushState({}, "Shop page", "/shop")

    render(<AppRouter />)

    expect(screen.getByTestId("customer-layout")).toBeInTheDocument()
  })

  it("legacyNavigate maps page names correctly to paths", () => {
    const mockNavigate = vi.fn()

    const navigateFn = legacyNavigate(mockNavigate)

    navigateFn("home")

    expect(mockNavigate).toHaveBeenCalledWith("/")

    navigateFn("shop")

    expect(mockNavigate).toHaveBeenCalledWith("/shop")

    navigateFn("login")

    expect(mockNavigate).toHaveBeenCalledWith("/login")

    navigateFn("product:123")
    expect(mockNavigate).toHaveBeenCalledWith("/products/123")
  })

  it.each([
    ["product", "/shop"],
    ["cart", "/cart"],
    ["checkout", "/checkout"],
    ["order-confirm", "/order-confirm"],
    ["reserve", "/reserve"],
    ["reserve-confirm", "/reserve-confirm"],
    ["visit-store", "/stores"],
    ["register", "/register"],
    ["account", "/account"],
    ["my-orders", "/account/orders"],
    ["my-reservations", "/account/reservations"],
    ["staff-dashboard", "/staff"],
    ["staff-tables", "/staff/tables"],
    ["staff-checkin", "/staff/checkin"],
    ["staff-orders", "/staff/orders"],
    ["staff-products", "/staff/products"],
    ["admin-dashboard", "/admin"],
    ["admin-tables", "/admin/tables"],
    ["admin-users", "/admin/users"],
    ["admin-staff", "/admin/staff"],
    ["admin-branches", "/admin/branches"],
    ["unknown-page", "/"],
  ])("maps legacy %s navigation to %s", (page, path) => {
    const mockNavigate = vi.fn()
    legacyNavigate(mockNavigate)(page)
    expect(mockNavigate).toHaveBeenCalledWith(path)
  })
})
