import { useCallback, useEffect, useRef, useState } from 'react'
import { edaApi, type EDAReport, type EDAStatusResponse } from '../../../core/api/eda.api'

export function useEDA(datasetId: string | undefined) {
  const [status, setStatus] = useState<EDAStatusResponse | null>(null)
  const [report, setReport] = useState<EDAReport | null>(null)
  const [initialized, setInitialized] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasReportRef = useRef(false)

  const clearPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!datasetId) return
    setStatus(null)
    setReport(null)
    setInitialized(false)
    hasReportRef.current = false
    clearPolling()

    let cancelled = false

    const init = async () => {
      try {
        const resp = await edaApi.getEDAStatus(datasetId)
        if (cancelled) return
        setStatus(resp)

        if (resp.status === 'completed' && resp.report) {
          hasReportRef.current = true
          setReport(resp.report)
          setInitialized(true)
          return
        }

        if (resp.status === 'not_started') {
          const startResp = await edaApi.startEDA(datasetId)
          if (cancelled) return
          setStatus(startResp)
        }

        setInitialized(true)
      } catch {
        if (!cancelled) setInitialized(true)
      }
    }

    init()

    return () => {
      cancelled = true
      clearPolling()
    }
  }, [datasetId, clearPolling])

  useEffect(() => {
    if (!datasetId || !initialized) return
    // Report already available — nothing left to poll for
    if (hasReportRef.current) return

    const poll = async () => {
      try {
        const resp = await edaApi.getEDAStatus(datasetId)
        setStatus(resp)
        if (resp.status === 'completed') {
          if (resp.report) {
            hasReportRef.current = true
            setReport(resp.report)
          }
          clearPolling()
        } else if (resp.status === 'failed') {
          clearPolling()
        }
      } catch {
        clearPolling()
      }
    }

    pollingRef.current = setInterval(poll, 1500)
    poll()
    return clearPolling
  }, [datasetId, initialized, clearPolling])

  return { status, report, isProcessing: status?.status === 'processing' || status?.status === 'started' || status?.status === 'already_running' }
}
