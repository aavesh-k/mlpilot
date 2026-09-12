import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import axios from 'axios'
import { useDatasets } from '../modules/datasets/hooks/useDatasets'
import { useModels } from '../modules/training/hooks/useTraining'
import { SkeletonCard } from '../shared/components/LoadingSpinner'
import { ErrorState } from '../shared/components/ErrorState'
import { useBackendReady } from '../core/hooks/useBackendReady'

const WARMING_TIPS = [
  'Waking up the Render free-tier instance…',
  'First load can take 30–60s on the free plan — hang tight.',
  'Spinning up the ML engine…',
  'Demo datasets will be instant once we’re connected.',
]

export default function Dashboard() {
  const { ready, warming, elapsed, attempt } = useBackendReady()
  const [dots, setDots] = useState('')
  const [tipIndex, setTipIndex] = useState(0)

  useEffect(() => {
    if (ready) return
    const id = setInterval(() => setDots((d) => (d.length >= 3 ? '' : d + '.')), 420)
    return () => clearInterval(id)
  }, [ready])

  useEffect(() => {
    if (ready) return
    const id = setInterval(() => setTipIndex((i) => (i + 1) % WARMING_TIPS.length), 2800)
    return () => clearInterval(id)
  }, [ready])

  if (!ready) {
    // Gently advancing progress so the bar never stalls at 0. Cap at 92% until ready.
    const progress = Math.min(92, 12 + elapsed * 1.8 + attempt * 2.5)

    return (
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 xl:p-12 flex items-center justify-center">
        <div className="relative overflow-hidden text-center border-2 border-black bg-white brutal-shadow p-6 sm:p-8 max-w-md w-full">
          {/* Top shimmer bar */}
          <div className="absolute top-0 left-0 h-1 bg-[#ffd400] transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />

          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-black border-2 border-black flex items-center justify-center brutal-shadow-sm relative">
              <span className="material-symbols-outlined text-3xl text-[#ffd400] animate-spin" style={{ animationDuration: '1.2s' }}>
                sync
              </span>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#c8ff00] border-2 border-black animate-ping" aria-hidden />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#c8ff00] border-2 border-black" aria-hidden />
            </div>
          </div>

          <p className="font-headline font-black text-2xl uppercase tracking-tight text-black">
            Connecting to backend<span className="inline-block w-6 text-left">{dots}</span>
          </p>
          <p className="font-mono text-[11px] uppercase tracking-widest text-black/60 mt-1 min-h-4">
            {warming ? WARMING_TIPS[tipIndex] : 'Waiting for the MLPilot API to become available.'}
          </p>

          <div className="mt-5 space-y-3 text-left">
            <div className="h-2.5 w-full border-2 border-black bg-white overflow-hidden brutal-shadow-sm">
              <div
                className="h-full bg-[#ffd400] relative transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              >
                <span className="absolute inset-y-0 right-0 w-8 bg-gradient-to-r from-transparent to-white/60 animate-pulse" />
              </div>
            </div>

            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-black/60">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-[#c8ff00] border border-black animate-pulse" aria-hidden />
                {elapsed}s elapsed
              </span>
              <span>Attempt #{Math.max(1, attempt)}</span>
              <span className="hidden sm:inline">Retrying every 2s</span>
            </div>

            {/* Bouncing dots row — visual proof it isn't frozen */}
            <div className="flex justify-center gap-1 pt-1" aria-hidden>
              <span className="w-1.5 h-1.5 bg-black animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-black animate-bounce" style={{ animationDelay: '140ms' }} />
              <span className="w-1.5 h-1.5 bg-black animate-bounce" style={{ animationDelay: '280ms' }} />
            </div>

            <p className="font-mono text-[10px] uppercase tracking-widest text-black/40 text-center leading-relaxed">
              Free-tier cold start — this only happens after 15 min of inactivity.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return <DashboardContent />
}

function DashboardContent() {
  const { data: datasetsData, isLoading: dsLoading, error: dsError, refetch: dsRefetch } = useDatasets()
  const { data: modelsData, isLoading: modelsLoading, error: modelsError, refetch: modelsRefetch } = useModels()

  const isLoading = dsLoading || modelsLoading
  const error = dsError || modelsError
  const datasets = datasetsData?.items ?? []
  const models = modelsData?.items ?? []
  const bestModel = models
    .filter((m) => m.metrics)
    .sort((a, b) => (b.metrics?.accuracy ?? 0) - (a.metrics?.accuracy ?? 0))[0]

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 xl:p-12">
        <section className="mb-10">
          <div className="inline-flex bg-white border-2 border-black brutal-shadow-sm px-3 py-1 -rotate-1 mb-4">
            <span className="font-mono text-[10px] uppercase tracking-widest font-black text-black">// dashboard</span>
          </div>
          <div className="h-12 w-96 animate-pulse bg-white border-2 border-black brutal-shadow-sm mb-4" />
          <div className="h-5 w-72 animate-pulse bg-white border-2 border-black" />
        </section>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-16">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    )
  }

  if (error) {
    const isNetworkErr = axios.isAxiosError(error) && (!error.response || error.code === 'ERR_NETWORK')
    const errorMessage = isNetworkErr
      ? 'Cannot connect to the MLPilot backend API. Please ensure the backend service is running and reachable.'
      : 'Could not fetch your data. Please try again.'

    return (
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 xl:p-12">
        <ErrorState
          title="Failed to load dashboard"
          message={errorMessage}
          onRetry={() => { dsRefetch(); modelsRefetch() }}
        />
      </div>
    )
  }

  if (datasets.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 xl:p-12">
        <section className="mb-6 sm:mb-10">
          <div className="inline-flex bg-white border-2 border-black brutal-shadow-sm px-3 py-1 -rotate-1 mb-4">
            <span className="font-mono text-[10px] uppercase tracking-widest font-black text-black">// welcome</span>
          </div>
          <h1 className="font-headline text-3xl sm:text-5xl lg:text-7xl font-black uppercase leading-none tracking-tight text-black mb-4 break-words">
            Welcome to <span className="bg-[#ffd400] border-2 border-black px-1.5 sm:px-2 brutal-shadow inline-block -rotate-1">MLPilot</span>
          </h1>
          <p className="font-mono text-xs uppercase tracking-widest text-black/60 max-w-2xl break-words">
            Upload your first dataset to begin.
          </p>
        </section>
        <NavLink
          to="/datasets"
          className="bg-[#c8ff00] border-2 border-black p-6 sm:p-8 flex flex-col justify-center items-center group transition-all btn-press brutal-shadow w-full sm:max-w-md -rotate-1 hover:rotate-0"
        >
          <div className="w-16 h-16 bg-black border-2 border-black text-[#ffd400] mb-4 flex items-center justify-center brutal-shadow-sm transition-transform group-hover:rotate-12">
            <span className="material-symbols-outlined text-4xl font-bold">add</span>
          </div>
          <span className="font-headline text-2xl font-black uppercase tracking-tight text-black">Upload Dataset</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-black/60 mt-1">[csv • parquet • json • xlsx]</span>
        </NavLink>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 xl:p-12">
      <section className="mb-6 sm:mb-10">
        <div className="inline-flex bg-white border-2 border-black brutal-shadow-sm px-3 py-1 -rotate-1 mb-4">
          <span className="font-mono text-[10px] uppercase tracking-widest font-black text-black">// dashboard</span>
        </div>
        <h1 className="font-headline text-3xl sm:text-5xl lg:text-7xl font-black uppercase leading-none tracking-tight text-black mb-4 break-words">
          Welcome,<br /><span className="bg-[#ffd400] border-2 border-black px-1.5 sm:px-2 brutal-shadow inline-block -rotate-1">Engineer</span>
        </h1>
        <p className="font-mono text-xs uppercase tracking-widest text-black/60 max-w-2xl break-words">
          {bestModel
            ? `Best model: ${bestModel.name} — ${((bestModel.metrics?.accuracy ?? 0) * 100).toFixed(1)}% accuracy`
            : 'Upload a dataset and start training to see results.'}
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 mb-12 sm:mb-16">
        {datasets.slice(0, 2).map((ds) => (
          <NavLink
            key={ds.id}
            to={`/datasets/${ds.id}`}
            className="bg-white border-2 border-black p-4 sm:p-6 brutal-shadow relative group block hover:-translate-y-1 transition-transform"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-headline text-2xl font-black uppercase tracking-tight text-black group-hover:bg-[#ffd400] px-1 transition-colors">{ds.name}</h3>
              <span className="bg-black text-white font-mono text-[10px] font-black uppercase px-2 py-1 border-2 border-black">{ds.status}</span>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-black/60 mb-6">{ds.file_format} • {ds.status}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border-2 border-black p-3 brutal-shadow-sm">
                <span className="block font-mono text-[10px] font-black uppercase tracking-widest text-black/60">Rows</span>
                <span className="font-mono text-2xl font-black text-black">{ds.row_count?.toLocaleString() ?? '—'}</span>
              </div>
              <div className="bg-white border-2 border-black p-3 brutal-shadow-sm">
                <span className="block font-mono text-[10px] font-black uppercase tracking-widest text-black/60">Columns</span>
                <span className="font-mono text-2xl font-black text-black">{ds.column_count ?? '—'}</span>
              </div>
            </div>
          </NavLink>
        ))}

        <NavLink
          to="/datasets"
          className="bg-white border-2 border-black p-6 flex flex-col justify-center items-center group btn-press brutal-shadow hover:bg-[#ffd400] transition-colors"
        >
          <div className="w-16 h-16 bg-black border-2 border-black text-[#ffd400] mb-4 flex items-center justify-center brutal-shadow-sm transition-transform group-hover:rotate-12">
            <span className="material-symbols-outlined text-4xl font-bold">add</span>
          </div>
          <span className="font-headline text-xl font-black uppercase tracking-tight text-black">New Dataset</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-black/60 mt-1">Upload or import data</span>
        </NavLink>
      </div>
    </div>
  )
}
