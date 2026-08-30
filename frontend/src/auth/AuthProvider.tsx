import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { apiClient } from '@/services/apiClient'
import { authApi, type AuthSessionResponse, type AuthUser } from '@/services/authApi'

type AuthStatus = 'loading' | 'anonymous' | 'authenticated'

interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null
  login: (email: string, password: string, rememberMe: boolean) => Promise<AuthUser>
  register: (values: {
    firstName: string
    lastName: string
    displayName?: string
    email: string
    phone?: string
    password: string
    acceptTerms: boolean
    acceptPrivacy: boolean
  }) => Promise<AuthUser>
  logout: () => Promise<void>
  refreshUser: () => Promise<AuthUser>
  hasRole: (...roles: string[]) => boolean
}

const ACCESS_TOKEN_KEY = 'boardly.access-token'
const REFRESH_TOKEN_KEY = 'boardly.refresh-token'
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function storeSession(response: AuthSessionResponse) {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken)
  sessionStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken)
  apiClient.setAccessToken(response.accessToken)
}

function clearSession() {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  sessionStorage.removeItem(REFRESH_TOKEN_KEY)
  apiClient.setAccessToken(null)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    const restoreSession = async () => {
      const accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY)
      const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY)
      if (!accessToken && !refreshToken) {
        setStatus('anonymous')
        return
      }

      try {
        if (accessToken) {
          apiClient.setAccessToken(accessToken)
          setUser(await authApi.me())
        } else if (refreshToken) {
          const refreshed = await authApi.refresh(refreshToken)
          storeSession(refreshed)
          setUser(refreshed.user)
        }
        setStatus('authenticated')
      } catch {
        if (refreshToken && accessToken) {
          try {
            const refreshed = await authApi.refresh(refreshToken)
            storeSession(refreshed)
            setUser(refreshed.user)
            setStatus('authenticated')
            return
          } catch {
            // The expired or revoked session is cleared below.
          }
        }
        clearSession()
        setUser(null)
        setStatus('anonymous')
      }
    }
    void restoreSession()
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    status,
    user,
    login: async (email, password, rememberMe) => {
      const response = await authApi.login({ email, password, rememberMe })
      storeSession(response)
      setUser(response.user)
      setStatus('authenticated')
      return response.user
    },
    register: async values => {
      const response = await authApi.register(values)
      storeSession(response)
      setUser(response.user)
      setStatus('authenticated')
      return response.user
    },
    logout: async () => {
      const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY)
      try {
        await authApi.logout(refreshToken)
      } finally {
        clearSession()
        setUser(null)
        setStatus('anonymous')
      }
    },
    refreshUser: async () => {
      const refreshedUser = await authApi.me()
      setUser(refreshedUser)
      return refreshedUser
    },
    hasRole: (...roles) => Boolean(user && roles.some(role => user.roles.includes(role))),
  }), [status, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
