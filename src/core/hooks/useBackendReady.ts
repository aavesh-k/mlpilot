import { useEffect, useState } from 'react'
import { apiClient } from '../api/client'

/**
 * Polls GET /api/v1/health until the FastAPI backend is reachable.
 * Used as a readiness gate so the dashboard shows "Connecting to backend..."
 * instead of a hard error while the backend is still starting up.
 *
 * Polls indefinitely (no hard timeout) so a cold-start on Render's free tier
 * self-heals: the first visitor's poll wakes the backend (~30–60s) and the
 * gate then opens automatically — no manual warm-up required.
 */
export function useBackendReady(pollMs = 2000) {
  const [ready, setReady] = useState(false)
  const [warming, setWarming] = useState(false)

  useEffect(() => {
    let cancelled = false
    const start = Date.now()

    const check = async () => {
      try {
        await apiClient.get('/health')
        if (!cancelled) setReady(true)
      } catch {
        if (cancelled) return
        if (Date.now() - start > 8000) setWarming(true)
        setTimeout(check, pollMs)
      }
    }

    check()
    return () => {
      cancelled = true
    }
  }, [pollMs])

  return { ready, warming }
}
