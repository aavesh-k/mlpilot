import { NavLink } from 'react-router-dom'
import axios from 'axios'
import { useDatasets } from '../modules/datasets/hooks/useDatasets'
import { useModels } from '../modules/training/hooks/useTraining'
import { SkeletonCard } from '../shared/components/LoadingSpinner'
import { ErrorState } from '../shared/components/ErrorState'
import { useBackendReady } from '../core/hooks/useBackendReady'

export default function Dashboard() {
  const { ready, warming } = useBackendReady()

  if (!ready) {
    return (
      <div className="flex-1 overflow-y-auto p-8 lg:p-12 flex items-center justify-center">
        <div className="text-center border-2 border-black bg-white brutal-shadow p-8 max-w-md">
          <span className="material-symbols-outlined text-4xl animate-pulse text-black">sync</span>
          <p className="font-headline font-black text-2xl uppercase mt-4 tracking-tight text-black">Connecting to backend…</p>
          <p className="font-mono text-xs uppercase tracking-widest text-black/60 mt-2">
            {warming
              ? 'First load? The free-tier backend is warming up (can take ~30–60s).'
              : 'Waiting for the MLPilot API to become available.'}
          </p>
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
      <div className="flex-1 overflow-y-auto p-8 lg:p-12">
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
      <div className="flex-1 overflow-y-auto p-8 lg:p-12">
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
      <div className="flex-1 overflow-y-auto p-8 lg:p-12">
        <section className="mb-10">
          <div className="inline-flex bg-white border-2 border-black brutal-shadow-sm px-3 py-1 -rotate-1 mb-4">
            <span className="font-mono text-[10px] uppercase tracking-widest font-black text-black">// welcome</span>
          </div>
          <h1 className="font-headline text-5xl md:text-7xl font-black uppercase leading-none tracking-tight text-black mb-4">
            Welcome to <span className="bg-[#ffd400] border-2 border-black px-2 brutal-shadow inline-block -rotate-1">MLPilot</span>
          </h1>
          <p className="font-mono text-xs uppercase tracking-widest text-black/60 max-w-2xl">
            Upload your first dataset to begin.
          </p>
        </section>
        <NavLink
          to="/datasets"
          className="bg-[#c8ff00] border-2 border-black p-8 flex flex-col justify-center items-center group transition-all btn-press brutal-shadow w-full sm:max-w-md -rotate-1 hover:rotate-0"
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
    <div className="flex-1 overflow-y-auto p-8 lg:p-12">
      <section className="mb-10">
        <div className="inline-flex bg-white border-2 border-black brutal-shadow-sm px-3 py-1 -rotate-1 mb-4">
          <span className="font-mono text-[10px] uppercase tracking-widest font-black text-black">// dashboard</span>
        </div>
        <h1 className="font-headline text-5xl md:text-7xl font-black uppercase leading-none tracking-tight text-black mb-4">
          Welcome,<br /><span className="bg-[#ffd400] border-2 border-black px-2 brutal-shadow inline-block -rotate-1">Engineer</span>
        </h1>
        <p className="font-mono text-xs uppercase tracking-widest text-black/60 max-w-2xl">
          {bestModel
            ? `Best model: ${bestModel.name} — ${((bestModel.metrics?.accuracy ?? 0) * 100).toFixed(1)}% accuracy`
            : 'Upload a dataset and start training to see results.'}
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-16">
        {datasets.slice(0, 2).map((ds) => (
          <NavLink
            key={ds.id}
            to={`/datasets/${ds.id}`}
            className="bg-white border-2 border-black p-6 brutal-shadow relative group block hover:-translate-y-1 transition-transform"
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
