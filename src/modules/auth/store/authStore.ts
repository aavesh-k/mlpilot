import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
  setAuth: (tokens: { access_token: string; refresh_token: string }, user?: User | null) => void
  setUser: (user: User | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      setAuth: (tokens, user = null) =>
        set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          user,
          isAuthenticated: true,
        }),
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false }),
    }),
    {
      name: 'mlpilot_auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
