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
 *
 * Exposes elapsed/attempt so the UI can feel alive during the wait.
 */
export function useBackendReady(pollMs = 2000) {
  const [ready, setReady] = useState(false)
  const [warming, setWarming] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    const start = Date.now()

    const tick = setInterval(() => {
      if (!cancelled) setElapsed(Math.floor((Date.now() - start) / 1000))
    }, 1000)

    const check = async () => {
      if (cancelled) return
      setAttempt((a) => a + 1)
      try {
        await apiClient.get('/health')
        if (!cancelled) {
          clearInterval(tick)
          setReady(true)
        }
      } catch {
        if (cancelled) return
        if (Date.now() - start > 8000) setWarming(true)
        setTimeout(check, pollMs)
      }
    }

    check()
    return () => {
      cancelled = true
      clearInterval(tick)
    }
  }, [pollMs])

  return { ready, warming, elapsed, attempt }
}
