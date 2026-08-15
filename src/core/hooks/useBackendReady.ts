import { useEffect, useState } from 'react'
import { apiClient } from '../api/client'

/**
 * Polls GET /api/v1/health until the FastAPI backend is reachable.
 * Used as a readiness gate so the dashboard shows "Connecting to backend..."
 * instead of a hard error while the backend is still starting up.
 */
export function useBackendReady(pollMs = 1000, timeoutMs = 60_000) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    let elapsed = 0

    const check = async () => {
      try {
        await apiClient.get('/health')
        if (!cancelled) setReady(true)
      } catch {
        if (cancelled) return
        elapsed += pollMs
        if (elapsed < timeoutMs) {
          setTimeout(check, pollMs)
        }
      }
    }

    check()
    return () => {
      cancelled = true
    }
  }, [pollMs, timeoutMs])

  return { ready }
}
