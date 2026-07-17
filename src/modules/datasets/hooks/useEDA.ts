import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { edaApi, type EDAReport, type EDAStatusResponse } from '../../../core/api/eda.api'

export function useEDA(datasetId: string | undefined) {
  const [status, setStatus] = useState<EDAStatusResponse | null>(null)
  const [report, setReport] = useState<EDAReport | null>(null)
  const [initialized, setInitialized] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
    clearPolling()

    let cancelled = false

    const init = async () => {
      try {
        const resp = await edaApi.getEDAStatus(datasetId)
        if (cancelled) return
        setStatus(resp)

        if (resp.status === 'completed' && resp.report) {
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

    const poll = async () => {
      try {
        const resp = await edaApi.getEDAStatus(datasetId)
        setStatus(resp)
        if (resp.status === 'completed' && resp.report) {
          setReport(resp.report)
          clearPolling()
        } else if (resp.status === 'failed') {
          clearPolling()
        }
      } catch {
        clearPolling()
      }
    }

    poll()
    pollingRef.current = setInterval(poll, 1500)
    return clearPolling
  }, [datasetId, initialized, clearPolling])

  return { status, report, isProcessing: status?.status === 'processing' || status?.status === 'started' || status?.status === 'already_running' }
}

export function useColumns(datasetId: string | undefined) {
  return useQuery({
    queryKey: ['columns', datasetId],
    queryFn: async () => {
      const resp = await edaApi.getEDAStatus(datasetId!)
      if (resp.status === 'completed' && resp.report) {
        return resp.report.numeric_summary.map((n) => ({
          name: n.column,
          ordinal_position: 0,
          dtype: '',
          is_numeric: true,
          is_categorical: false,
          missing_count: 0,
          missing_ratio: 0,
          unique_count: 0,
          mean: n.mean ?? undefined,
          std: n.std ?? undefined,
          min: n.min ?? undefined,
          max: n.max ?? undefined,
          p25: n.q1 ?? undefined,
          p50: n.median ?? undefined,
          p75: n.q3 ?? undefined,
          skewness: n.skewness ?? undefined,
          kurtosis: n.kurtosis ?? undefined,
        }))
      }
      return []
    },
    enabled: !!datasetId,
  })
}
