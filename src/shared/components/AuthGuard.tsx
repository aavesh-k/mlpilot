import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../modules/auth/store/authStore'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const location = useLocation()

  // Allow guest session (per-browser) as fallback so "Continue as Guest" works without login
  const hasGuest = (() => {
    try {
      return !!localStorage.getItem('mlpilot_guest_session')
    } catch {
      return false
    }
  })()

  if (!isAuthenticated && !hasGuest) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return <>{children}</>
}

export function PublicOnly({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }
  return <>{children}</>
}
