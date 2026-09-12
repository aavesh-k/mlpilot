import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { clearAppQueryCache } from '../../../core/queryClient'

interface User {
  id: string
  email: string
  created_at: string
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
  isAuthenticated: boolean
  rememberMe: boolean
  setAuth: (tokens: { access_token: string; refresh_token: string }, user?: User | null, rememberMe?: boolean) => void
  setUser: (user: User | null) => void
  setRememberMe: (v: boolean) => void
  logout: () => void
}

// Mixed storage: localStorage if rememberMe true, sessionStorage if false
// getItem checks both so existing sessions survive migration
const mixedStorage = {
  getItem: (name: string): string | null => {
    try {
      const local = localStorage.getItem(name)
      if (local) return local
      return sessionStorage.getItem(name)
    } catch {
      return null
    }
  },
  setItem: (name: string, value: string | object): void => {
    try {
      const strValue = typeof value === 'string' ? value : JSON.stringify(value)
      const parsed = JSON.parse(strValue) as { state?: { rememberMe?: boolean } }
      const rememberMe = parsed?.state?.rememberMe ?? true
      if (rememberMe) {
        localStorage.setItem(name, strValue)
        try {
          sessionStorage.removeItem(name)
        } catch {}
      } else {
        sessionStorage.setItem(name, strValue)
        try {
          localStorage.removeItem(name)
        } catch {}
      }
    } catch {
      try {
        const strValue = typeof value === 'string' ? value : JSON.stringify(value)
        localStorage.setItem(name, strValue)
      } catch {}
    }
  },
  removeItem: (name: string): void => {
    try {
      localStorage.removeItem(name)
    } catch {}
    try {
      sessionStorage.removeItem(name)
    } catch {}
  },
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      rememberMe: true,
      setAuth: (tokens: { access_token: string; refresh_token: string }, user: User | null = null, rememberMe?: boolean) => {
        clearAppQueryCache()
        set((prev: AuthState) => ({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          user: user ?? prev.user,
          isAuthenticated: true,
          rememberMe: rememberMe ?? prev.rememberMe ?? true,
        }))
      },
      setUser: (user: User | null) =>
        set((prev: AuthState) => ({
          user,
          isAuthenticated: prev.accessToken ? true : !!user,
        })),
      setRememberMe: (v: boolean) => set({ rememberMe: v }),
      logout: () => {
        clearAppQueryCache()
        try {
          localStorage.removeItem('mlpilot_auth')
        } catch {}
        try {
          sessionStorage.removeItem('mlpilot_auth')
        } catch {}
        set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false })
      },
    }),
    {
      name: 'mlpilot_auth',
      // @ts-expect-error mixedStorage matches StateStorage but TS expects PersistStorage shape
      storage: mixedStorage,
      // @ts-expect-error partialize may return subset
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        rememberMe: state.rememberMe,
      }),
    }
  )
)

// Helper for remembered email (separate from auth tokens)
export const rememberedEmailStorage = {
  get(): string | null {
    try {
      return localStorage.getItem('mlpilot_remembered_email')
    } catch {
      return null
    }
  },
  set(email: string) {
    try {
      localStorage.setItem('mlpilot_remembered_email', email)
    } catch {}
  },
  clear() {
    try {
      localStorage.removeItem('mlpilot_remembered_email')
    } catch {}
  },
}
