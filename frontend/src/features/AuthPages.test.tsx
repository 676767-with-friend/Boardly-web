import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { MemoryRouter } from "react-router-dom"
import {
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
} from "./AuthPages"
import { authApi } from "@/services/authApi"
import { THAI_PHONE_ERROR } from "@/utils/phone"

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  )),
  useNavigate: () => mocks.navigate,
}))

vi.mock("@/auth/AuthProvider", () => ({
  useAuth: () => ({ login: mocks.login, register: mocks.register }),
}))

vi.mock("@/services/authApi", () => ({
  authApi: { forgotPassword: vi.fn(), resetPassword: vi.fn() },
}))

function renderPage(page: React.ReactNode, entry: string | object = "/") {
  return render(<MemoryRouter initialEntries={[entry]}>{page}</MemoryRouter>)
}

function completeRegistration() {
  fireEvent.change(screen.getByLabelText("First Name"), {
    target: { value: "Test" },
  })
  fireEvent.change(screen.getByLabelText("Last Name"), {
    target: { value: "User" },
  })
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "test@example.test" },
  })
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "BoardlyPass123!" },
  })
  fireEvent.change(screen.getByLabelText("Confirm"), {
    target: { value: "BoardlyPass123!" },
  })
  fireEvent.click(screen.getByRole("checkbox"))
}

describe("authentication pages", () => {
  beforeEach(() => {
    mocks.login.mockResolvedValue({ roles: ["customer"] })
    mocks.register.mockResolvedValue({ roles: ["customer"] })
    vi.mocked(authApi.forgotPassword).mockResolvedValue({
      message: "If the account exists, reset instructions are ready.",
    })
    vi.mocked(authApi.resetPassword).mockResolvedValue(undefined)
  })

  it("validates login credentials and reports authentication failures", async () => {
    mocks.login.mockRejectedValueOnce(new Error("Invalid credentials"))
    renderPage(<LoginPage />)
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }))
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter your email and password.",
    )

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.test" },
    })
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "wrong-password" },
    })
    fireEvent.click(screen.getByLabelText("Remember me"))
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }))
    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument()
    expect(mocks.login).toHaveBeenCalledWith(
      "user@example.test",
      "wrong-password",
      true,
    )
  })

  it.each([
    [["admin"], "/admin/users", "/admin/users"],
    [["admin"], "/staff/orders", "/admin"],
    [["staff"], "/staff/orders", "/staff/orders"],
    [["customer"], "/checkout", "/checkout"],
    [["manager"], undefined, "/manager"],
  ])("redirects %j login from %s to %s", async (roles, from, destination) => {
    mocks.login.mockResolvedValueOnce({ roles })
    renderPage(
      <LoginPage />,
      from ? { pathname: "/login", state: { from } } : "/login",
    )
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.test" },
    })
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "BoardlyPass123!" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }))
    await waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith(destination, {
        replace: true,
      }),
    )
  })

  it("blocks registration with an invalid phone before calling the API", () => {
    renderPage(<RegisterPage />)
    completeRegistration()
    fireEvent.change(screen.getByLabelText("Phone"), {
      target: { value: "invalid" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }))

    expect(screen.getByRole("alert")).toHaveTextContent(THAI_PHONE_ERROR)
    expect(mocks.register).not.toHaveBeenCalled()
  })

  it("registers the validated account with optional profile values", async () => {
    renderPage(<RegisterPage />)
    completeRegistration()
    fireEvent.change(screen.getByLabelText("Display Name"), {
      target: { value: "Tester" },
    })
    fireEvent.change(screen.getByLabelText("Phone"), {
      target: { value: "0812345678" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }))

    await waitFor(() =>
      expect(mocks.register).toHaveBeenCalledWith({
        firstName: "Test",
        lastName: "User",
        displayName: "Tester",
        email: "test@example.test",
        phone: "0812345678",
        password: "BoardlyPass123!",
        acceptTerms: true,
        acceptPrivacy: true,
      }),
    )
    expect(mocks.navigate).toHaveBeenCalledWith("/account", { replace: true })
  })

  it("keeps registration data visible after an API failure", async () => {
    mocks.register.mockRejectedValueOnce("network failure")
    renderPage(<RegisterPage />)
    completeRegistration()
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }))

    expect(
      await screen.findByText("Something went wrong. Please try again."),
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Email")).toHaveValue("test@example.test")
  })

  it("handles forgot-password validation, loading, and development reset links", async () => {
    let resolveRequest: (value: { message: string devResetUrl: string }) => void
    vi.mocked(authApi.forgotPassword).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve
      }),
    )
    renderPage(<ForgotPasswordPage />)
    fireEvent.click(screen.getByRole("button", { name: "Request reset" }))
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter your email address.",
    )

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.test" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Request reset" }))
    expect(screen.getByRole("button", { name: "Sending..." })).toBeDisabled()
    resolveRequest({
      message: "Check your reset link.",
      devResetUrl: "http://localhost:8443/reset-password?token=abc",
    })

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Check your reset link.",
    )
    expect(
      screen.getByRole("link", { name: "Continue to password reset" }),
    ).toHaveAttribute("href", "/reset-password?token=abc")
  })

  it("reports forgot-password API failures without exposing account existence", async () => {
    vi.mocked(authApi.forgotPassword).mockRejectedValueOnce(
      new Error("Request unavailable"),
    )
    renderPage(<ForgotPasswordPage />)
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "unknown@example.test" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Request reset" }))
    expect(await screen.findByText("Request unavailable")).toBeInTheDocument()
  })

  it("rejects incomplete reset links and validates the new password", async () => {
    const browser = userEvent.setup()
    const missing = renderPage(<ResetPasswordPage />, "/reset-password")
    expect(screen.getByRole("alert")).toHaveTextContent(
      "This reset link is invalid or incomplete.",
    )
    expect(
      screen.getByRole("button", { name: "Reset Password" }),
    ).toBeDisabled()
    missing.unmount()

    renderPage(<ResetPasswordPage />, "/reset-password?token=reset-token")
    await browser.type(screen.getByLabelText("New Password"), "short")
    await browser.type(screen.getByLabelText("Confirm Password"), "short")
    await browser.click(screen.getByRole("button", { name: "Reset Password" }))
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Password must be at least 12 characters.",
    )

    await browser.clear(screen.getByLabelText("New Password"))
    await browser.clear(screen.getByLabelText("Confirm Password"))
    await browser.type(screen.getByLabelText("New Password"), "BoardlyPass123!")
    await browser.type(
      screen.getByLabelText("Confirm Password"),
      "DifferentPass123!",
    )
    await browser.click(screen.getByRole("button", { name: "Reset Password" }))
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Passwords do not match.",
    )
  })

  it("resets a password and returns to sign in", async () => {
    const browser = userEvent.setup()
    renderPage(<ResetPasswordPage />, "/reset-password?token=reset-token")
    await browser.type(screen.getByLabelText("New Password"), "BoardlyPass123!")
    await browser.type(
      screen.getByLabelText("Confirm Password"),
      "BoardlyPass123!",
    )
    await browser.click(screen.getByRole("button", { name: "Reset Password" }))

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Your password has been reset successfully.",
    )
    expect(authApi.resetPassword).toHaveBeenCalledWith(
      "reset-token",
      "BoardlyPass123!",
    )
    await browser.click(
      screen.getByRole("button", { name: "Return to Sign In" }),
    )
    expect(mocks.navigate).toHaveBeenCalledWith("/login", { replace: true })
  })

  it("reports reset-password API errors and permits retry", async () => {
    vi.mocked(authApi.resetPassword).mockRejectedValueOnce(
      new Error("Reset token expired"),
    )
    const browser = userEvent.setup()
    renderPage(<ResetPasswordPage />, "/reset-password?token=expired")
    await browser.type(screen.getByLabelText("New Password"), "BoardlyPass123!")
    await browser.type(
      screen.getByLabelText("Confirm Password"),
      "BoardlyPass123!",
    )
    await browser.click(screen.getByRole("button", { name: "Reset Password" }))
    expect(await screen.findByText("Reset token expired")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Reset Password" })).toBeEnabled()
  })
})
