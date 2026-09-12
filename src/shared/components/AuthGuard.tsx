import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../modules/auth/store/authStore'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const location = useLocation()

  if (!isAuthenticated) {
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
