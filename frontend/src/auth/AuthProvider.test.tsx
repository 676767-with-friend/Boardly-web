import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AuthProvider, useAuth } from "./AuthProvider"
import { apiClient } from "@/services/apiClient"
import {
  authApi,
  type AuthSessionResponse,
  type AuthUser,
} from "@/services/authApi"

vi.mock("@/services/apiClient", () => ({
  apiClient: { setAccessToken: vi.fn() },
}))

vi.mock("@/services/authApi", () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    me: vi.fn(),
  },
}))

const user: AuthUser = {
  id: "user-1",
  firstName: "Ada",
  lastName: "Lovelace",
  displayName: "Ada",
  email: "ada@example.test",
  roles: ["customer"],
  permissions: [],
}

const session: AuthSessionResponse = {
  accessToken: "access-new",
  refreshToken: "refresh-new",
  user,
}

function Probe() {
  const auth = useAuth()
  return (
    <div>
      <span data-testid="status">{auth.status}</span>
      <span data-testid="email">{auth.user?.email ?? "none"}</span>
      <span data-testid="role">{String(auth.hasRole("customer"))}</span>
      <button
        onClick={() => void auth.login("ada@example.test", "secret", true)}
      >
        login
      </button>
      <button
        onClick={() =>
          void auth.register({
            firstName: "Ada",
            lastName: "Lovelace",
            email: "ada@example.test",
            password: "secret",
            acceptTerms: true,
            acceptPrivacy: true,
          })
        }
      >
        register
      </button>
      <button onClick={() => void auth.refreshUser()}>refresh user</button>
      <button onClick={() => void auth.logout()}>logout</button>
    </div>
  )
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  it("starts anonymously and supports login, refresh, and logout", async () => {
    vi.mocked(authApi.login).mockResolvedValue(session)
    vi.mocked(authApi.me).mockResolvedValue({
      ...user,
      displayName: "Updated Ada",
    })
    vi.mocked(authApi.logout).mockResolvedValue(undefined)
    const browser = userEvent.setup()

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("anonymous"),
    )

    await browser.click(screen.getByRole("button", { name: "login" }))
    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated"),
    )
    expect(sessionStorage.getItem("boardly.access-token")).toBe("access-new")
    expect(screen.getByTestId("role")).toHaveTextContent("true")

    await browser.click(screen.getByRole("button", { name: "refresh user" }))
    await waitFor(() => expect(authApi.me).toHaveBeenCalled())

    await browser.click(screen.getByRole("button", { name: "logout" }))
    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("anonymous"),
    )
    expect(sessionStorage.getItem("boardly.access-token")).toBeNull()
    expect(apiClient.setAccessToken).toHaveBeenLastCalledWith(null)
  })

  it("restores an access token and falls back to refresh when it is rejected", async () => {
    sessionStorage.setItem("boardly.access-token", "access-old")
    sessionStorage.setItem("boardly.refresh-token", "refresh-old")
    vi.mocked(authApi.me).mockRejectedValue(new Error("expired"))
    vi.mocked(authApi.refresh).mockResolvedValue(session)

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated"),
    )
    expect(authApi.refresh).toHaveBeenCalledWith("refresh-old")
    expect(screen.getByTestId("email")).toHaveTextContent(user.email)
  })

  it("uses a refresh-only session and clears an invalid one", async () => {
    sessionStorage.setItem("boardly.refresh-token", "refresh-old")
    vi.mocked(authApi.refresh).mockResolvedValueOnce(session)
    const first = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated"),
    )
    first.unmount()

    sessionStorage.clear()
    sessionStorage.setItem("boardly.refresh-token", "revoked")
    vi.mocked(authApi.refresh).mockRejectedValueOnce(new Error("revoked"))
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("anonymous"),
    )
    expect(sessionStorage.getItem("boardly.refresh-token")).toBeNull()
  })

  it("stores a successful registration", async () => {
    vi.mocked(authApi.register).mockResolvedValue(session)
    const browser = userEvent.setup()
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("anonymous"),
    )

    await browser.click(screen.getByRole("button", { name: "register" }))

    await waitFor(() =>
      expect(screen.getByTestId("email")).toHaveTextContent(user.email),
    )
    expect(authApi.register).toHaveBeenCalledWith(
      expect.objectContaining({ acceptTerms: true, acceptPrivacy: true }),
    )
  })

  it("rejects useAuth outside the provider", () => {
    function Outside() {
      useAuth()
      return null
    }
    expect(() => render(<Outside />)).toThrow(
      "useAuth must be used inside AuthProvider",
    )
  })
})
