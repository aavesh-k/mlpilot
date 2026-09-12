import axios from 'axios'
import { CONFIG } from '../config'
import { useAuthStore } from '../../modules/auth/store/authStore'

export const apiClient = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 120_000,
})

// Attach JWT + guest session + FormData handling
apiClient.interceptors.request.use((config) => {
  // FormData: let browser set multipart boundary
  if (config.data instanceof FormData) {
    delete (config.headers as Record<string, unknown>)['Content-Type']
  }

  // Auth token resolution: first in-memory Zustand store, then storage fallback
  try {
    let token = useAuthStore.getState().accessToken
    if (!token) {
      const raw = localStorage.getItem('mlpilot_auth') || sessionStorage.getItem('mlpilot_auth')
      if (raw) {
        const parsed = JSON.parse(raw)
        token = parsed?.state?.accessToken ?? parsed?.accessToken ?? null
      }
    }

    if (token) {
      ;(config.headers as Record<string, string>).Authorization = `Bearer ${token}`
      delete (config.headers as Record<string, unknown>)['X-Session-ID']
    } else {
      // Guest fallback: per-browser session for demo without login
      let guest: string | null = null
      try {
        guest = localStorage.getItem('mlpilot_guest_session')
        if (!guest) {
          guest = `guest_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
          localStorage.setItem('mlpilot_guest_session', guest)
        }
      } catch {}

      // Don't send guest header for login or forgot-password
      if (guest && !config.url?.includes('/auth/login') && !config.url?.includes('/auth/forgot-password')) {
        ;(config.headers as Record<string, string>)['X-Session-ID'] = guest
      }
    }
  } catch {
    // ignore storage errors
  }
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status
    const url: string = error?.config?.url || ''
    const originalConfig = error?.config

    // Never auto-logout or redirect on auth attempt errors (login/register/forgot-password)
    // to allow user forms to display inline validation/credential errors.
    const isAuthAttempt =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/forgot-password')

    if (status === 401 && !isAuthAttempt) {
      // If refresh token failed or no refresh available, clear auth
      if (url.includes('/auth/refresh')) {
        useAuthStore.getState().logout()
        const path = window.location.pathname
        if (path !== '/login' && path !== '/register' && path !== '/') {
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }

      // Try refresh if we have a refresh token and haven't retried yet
      const refreshToken = useAuthStore.getState().refreshToken
      if (refreshToken && originalConfig && !originalConfig._retry) {
        originalConfig._retry = true
        try {
          const refreshResp = await axios.post(
            `${CONFIG.API_BASE_URL}/auth/refresh`,
            null,
            { params: { refresh_token: refreshToken } }
          )
          const newTokens = refreshResp.data
          const currentUser = useAuthStore.getState().user
          const rememberMe = useAuthStore.getState().rememberMe
          useAuthStore.getState().setAuth(newTokens, currentUser, rememberMe)
          originalConfig.headers.Authorization = `Bearer ${newTokens.access_token}`
          return apiClient(originalConfig)
        } catch {
          useAuthStore.getState().logout()
          const path = window.location.pathname
          if (path !== '/login' && path !== '/register' && path !== '/') {
            window.location.href = '/login'
          }
          return Promise.reject(error)
        }
      }

      // Protected endpoint got 401 and no refresh token: clean logout
      useAuthStore.getState().logout()
      const path = window.location.pathname
      if (path !== '/login' && path !== '/register' && path !== '/') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)
