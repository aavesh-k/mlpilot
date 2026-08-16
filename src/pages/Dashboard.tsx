import { NavLink } from 'react-router-dom'
import axios from 'axios'
import { useDatasets } from '../modules/datasets/hooks/useDatasets'
import { useModels } from '../modules/training/hooks/useTraining'
import { SkeletonCard } from '../shared/components/LoadingSpinner'
import { ErrorState } from '../shared/components/ErrorState'
import { useBackendReady } from '../core/hooks/useBackendReady'

export default function Dashboard() {
  const { ready } = useBackendReady()

  if (!ready) {
    return (
      <div className="flex-1 overflow-y-auto p-8 lg:p-12 flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl animate-pulse text-secondary">sync</span>
          <p className="font-headline font-black text-2xl uppercase mt-4 tracking-tighter">Connecting to backend…</p>
          <p className="text-sm text-on-surface-variant mt-1">
            Waiting for the MLPilot API to become available.
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
        <section className="mb-16">
          <div className="h-16 w-96 animate-pulse rounded bg-surface-variant mb-4" />
          <div className="h-6 w-72 animate-pulse rounded bg-surface-variant" />
        </section>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-16">
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
        <section className="mb-16">
          <h1 className="font-headline text-6xl md:text-8xl font-black uppercase leading-none mb-4 tracking-tighter">
            Welcome to <span className="text-black dark:text-white">ML</span><span className="text-secondary">Pilot</span>
          </h1>
          <p className="text-xl max-w-2xl text-on-surface-variant font-medium">
            Upload your first dataset to begin.
          </p>
        </section>
        <NavLink
          to="/datasets"
          className="bg-tertiary border-2 border-primary p-6 flex flex-col justify-center items-center group transition-all active:translate-x-1 active:translate-y-1 active:shadow-none neo-shadow w-full sm:max-w-md"
        >
          <div className="w-16 h-16 bg-white border-2 border-primary mb-4 flex items-center justify-center transition-transform group-hover:rotate-90">
            <span className="material-symbols-outlined text-4xl font-bold">add</span>
          </div>
          <span className="font-headline text-2xl font-black uppercase text-white tracking-tighter">Upload Dataset</span>
        </NavLink>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 lg:p-12">
      <section className="mb-16">
        <h1 className="font-headline text-6xl md:text-8xl font-black uppercase leading-none mb-4 tracking-tighter">
          Welcome,<br /><span className="text-tertiary">Engineer</span>
        </h1>
        <p className="text-xl max-w-2xl text-on-surface-variant font-medium">
          {bestModel
            ? `Best model: ${bestModel.name} — ${((bestModel.metrics?.accuracy ?? 0) * 100).toFixed(1)}% accuracy`
            : 'Upload a dataset and start training to see results.'}
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-16">
        {datasets.slice(0, 2).map((ds) => (
          <NavLink
            key={ds.id}
            to={`/datasets/${ds.id}`}
            className="bg-surface border-2 border-primary p-6 neo-shadow relative group block"
          >
            <h3 className="font-headline text-3xl font-bold mb-1 group-hover:text-tertiary transition-colors">{ds.name}</h3>
            <p className="text-on-surface-variant text-sm mb-6 font-medium">{ds.file_format} · {ds.status}</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="border-2 border-primary p-3">
                <span className="block font-headline text-[10px] font-bold uppercase text-on-surface-variant">Rows</span>
                <span className="text-2xl font-headline font-black">{ds.row_count?.toLocaleString() ?? '—'}</span>
              </div>
              <div className="border-2 border-primary p-3">
                <span className="block font-headline text-[10px] font-bold uppercase text-on-surface-variant">Columns</span>
                <span className="text-2xl font-headline font-black">{ds.column_count ?? '—'}</span>
              </div>
            </div>
          </NavLink>
        ))}

        <NavLink
          to="/datasets"
          className="bg-tertiary border-2 border-primary p-6 flex flex-col justify-center items-center group transition-all active:translate-x-1 active:translate-y-1 active:shadow-none neo-shadow"
        >
          <div className="w-16 h-16 bg-white border-2 border-primary mb-4 flex items-center justify-center transition-transform group-hover:rotate-90">
            <span className="material-symbols-outlined text-4xl font-bold">add</span>
          </div>
          <span className="font-headline text-2xl font-black uppercase text-white tracking-tighter">New Dataset</span>
          <span className="font-headline text-xs font-bold text-white/70 uppercase mt-2">Upload or import data</span>
        </NavLink>
      </div>
    </div>
  )
}
