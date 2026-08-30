import { apiClient } from './apiClient'

export interface AuthUser {
  id: string
  firstName: string
  lastName: string
  displayName: string | null
  email: string
  roles: string[]
  permissions: string[]
}

export interface AuthSessionResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export interface ForgotPasswordResponse {
  message: string
  devResetUrl?: string | null
}

export const authApi = {
  register: (body: {
    firstName: string
    lastName: string
    displayName?: string
    email: string
    phone?: string
    password: string
    acceptTerms: boolean
    acceptPrivacy: boolean
  }) => apiClient.post<AuthSessionResponse>('/auth/register', body),
  login: (body: { email: string; password: string; rememberMe: boolean }) =>
    apiClient.post<AuthSessionResponse>('/auth/login', body),
  refresh: (refreshToken: string) => apiClient.post<AuthSessionResponse>('/auth/refresh', { refreshToken }),
  logout: (refreshToken: string | null) => apiClient.post<void>('/auth/logout', { refreshToken }),
  me: () => apiClient.get<AuthUser>('/me'),
  forgotPassword: (email: string) => apiClient.post<ForgotPasswordResponse>('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) =>
    apiClient.post<{ message: string }>('/auth/reset-password', { token, newPassword }),
}
