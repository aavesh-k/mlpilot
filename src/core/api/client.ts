import axios from 'axios'
import { CONFIG } from '../config'

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
  // Auth token
  try {
    const raw = localStorage.getItem('mlpilot_auth')
    if (raw) {
      const parsed = JSON.parse(raw)
      const token = parsed?.state?.accessToken as string | undefined
      if (token) {
        ;(config.headers as Record<string, string>).Authorization = `Bearer ${token}`
      } else {
        // Guest fallback: per-browser session for demo without login
        let guest = localStorage.getItem('mlpilot_guest_session')
        if (!guest) {
          guest = `guest_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
          localStorage.setItem('mlpilot_guest_session', guest)
        }
        ;(config.headers as Record<string, string>)['X-Session-ID'] = guest
      }
    } else {
      // No auth store yet — guest fallback for demo
      let guest = localStorage.getItem('mlpilot_guest_session')
      if (!guest) {
        guest = `guest_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
        localStorage.setItem('mlpilot_guest_session', guest)
      }
      // Don't send guest header for auth endpoints themselves
      if (!config.url?.includes('/auth/')) {
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
  (error) => {
    const status = error?.response?.status
    const url: string = error?.config?.url || ''
    // On 401 from protected API (not auth endpoints), clear auth and redirect to login
    if (status === 401 && !url.includes('/auth/')) {
      try {
        localStorage.removeItem('mlpilot_auth')
      } catch {}
      const path = window.location.pathname
      if (path !== '/login' && path !== '/register' && path !== '/') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)
