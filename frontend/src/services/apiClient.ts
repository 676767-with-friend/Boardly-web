/**
 * Centralized API client for Boardly backend.
 * Uses the VITE_API_BASE_URL environment variable.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api"

interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
  headers?: Record<string, string>
}

interface ApiError {
  timestamp: string
  status: number
  code: string
  message: string
  errors?: Record<string, string>
}

class ApiClient {
  private baseUrl: string
  private accessToken: string | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async request<T,>(
    endpoint: string,
    options: ApiRequestOptions = {},
  ): Promise<T> {
    const { method = "GET", body, headers = {} } = options

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(this.accessToken
          ? { Authorization: `Bearer ${this.accessToken}` }
          : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error = (await response.json().catch(() => ({
        status: response.status,
        code: "REQUEST_FAILED",
        message: "The request could not be completed.",
      }))) as ApiError
      throw error
    }

    if (response.status === 204) return undefined as T

    return response.json()
  }

  setAccessToken(accessToken: string | null) {
    this.accessToken = accessToken
  }

  get<T,>(endpoint: string) {
    return this.request<T>(endpoint)
  }

  post<T,>(endpoint: string, body: unknown) {
    return this.request<T>(endpoint, { method: "POST", body })
  }

  put<T,>(endpoint: string, body: unknown) {
    return this.request<T>(endpoint, { method: "PUT", body })
  }

  patch<T,>(endpoint: string, body: unknown) {
    return this.request<T>(endpoint, { method: "PATCH", body })
  }

  delete<T,>(endpoint: string) {
    return this.request<T>(endpoint, { method: "DELETE" })
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
export default apiClient
