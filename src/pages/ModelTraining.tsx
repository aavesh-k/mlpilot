import { useState } from 'react'
import { useDatasets } from '../modules/datasets/hooks/useDatasets'
import { useTrainModel, useJobs } from '../modules/training/hooks/useTraining'
import { PageHeader } from '../shared/components/PageHeader'
import { EmptyState } from '../shared/components/EmptyState'
import { ErrorState } from '../shared/components/ErrorState'
import { LoadingSpinner } from '../shared/components/LoadingSpinner'
import { Pagination } from '../shared/components/Pagination'
import { Button } from '../shared/components/ui/button'
import { Badge } from '../shared/components/ui/badge'
import { formatDate } from '../shared/utils/format'
import { trainModelSchema } from '../shared/schemas/training'

const ALGORITHMS = [
  { id: 'random_forest', label: 'Random Forest' },
  { id: 'svm', label: 'SVM' },
  { id: 'logistic_regression', label: 'Logistic Regression' },
  { id: 'xgboost', label: 'XGBoost' },
]

export default function ModelTraining() {
  const [page, setPage] = useState(1)
  const [selectedAlgo, setSelectedAlgo] = useState('random_forest')
  const [selectedDatasetId, setSelectedDatasetId] = useState('')
  const [validationError, setValidationError] = useState('')
  const { data: datasetsData } = useDatasets()
  const { data: jobsData, isLoading, error, refetch } = useJobs(page)
  const trainMutation = useTrainModel()

  const datasets = datasetsData?.items ?? []
  const jobs = jobsData?.items ?? []
  const readyDatasets = datasets.filter((d) => d.status === 'ready')

  const handleTrain = () => {
    setValidationError('')
    const result = trainModelSchema.safeParse({
      dataset_id: selectedDatasetId,
      algorithm: selectedAlgo,
    })
    if (!result.success) {
      setValidationError(result.error.errors.map((e) => e.message).join('; '))
      return
    }
    trainMutation.mutate(
      { dataset_id: selectedDatasetId, algorithm: selectedAlgo },
      {
        onSuccess: () => setPage(1),
      },
    )
  }

  const jobBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
      completed: 'success', running: 'warning', queued: 'info', failed: 'danger', cancelled: 'default',
    }
    return <Badge variant={variants[status] ?? 'default'}>{status}</Badge>
  }

  return (
    <div className="p-8 lg:p-12">
      <PageHeader title="Model" accent="Training" subtitle="Configure and dispatch training jobs." />

      {readyDatasets.length === 0 && (
        <EmptyState icon="model_training" title="No datasets ready" description="Upload and process a dataset first to start training." />
      )}

      {readyDatasets.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          {ALGORITHMS.map((algo) => (
            <div
              key={algo.id}
              onClick={() => setSelectedAlgo(algo.id)}
              className={`bg-surface border-2 p-6 neo-shadow group cursor-pointer transition-all ${
                selectedAlgo === algo.id ? 'border-primary bg-primary-container/10' : 'border-primary'
              }`}
            >
              <h3 className="font-headline text-2xl font-bold group-hover:text-tertiary transition-colors">{algo.label}</h3>
              <p className="text-on-surface-variant text-sm mt-1 font-medium capitalize">{algo.id.replace(/_/g, ' ')}</p>
            </div>
          ))}
        </div>
      )}

      {readyDatasets.length > 0 && (
        <div className="bg-surface border-2 border-primary p-8 neo-shadow mb-10">
          <h3 className="font-headline font-black text-xl uppercase mb-4">Training Config</h3>
          <div className="mb-4">
            <label className="font-headline font-bold text-xs uppercase block mb-1">Dataset</label>
            <select
              value={selectedDatasetId}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="border-2 border-primary bg-surface p-3 w-full max-w-md font-body text-sm"
            >
              <option value="">Select a dataset…</option>
              {readyDatasets.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <p className="text-sm text-on-surface-variant mb-4">
            Algorithm: <span className="font-bold">{ALGORITHMS.find((a) => a.id === selectedAlgo)?.label}</span>
          </p>
          {validationError && (
            <p className="text-secondary font-headline font-bold text-xs mb-3">{validationError}</p>
          )}
          <Button
            variant="primary"
            size="lg"
            onClick={handleTrain}
            disabled={trainMutation.isPending || !selectedDatasetId}
            className="w-full"
          >
            {trainMutation.isPending ? 'Training...' : 'Dispatch Training'}
          </Button>
          {trainMutation.isError && (
            <p className="mt-2 text-secondary font-headline font-bold text-sm">
              Training failed: {(trainMutation.error as Error)?.message ?? 'Unknown error'}
            </p>
          )}
        </div>
      )}

      <div className="bg-surface border-2 border-primary p-8 neo-shadow">
        <h3 className="font-headline font-black text-xl uppercase mb-6">Training Jobs</h3>

        {isLoading && <LoadingSpinner />}
        {error && <ErrorState message="Failed to load jobs" onRetry={() => refetch()} />}
        {!isLoading && !error && jobs.length === 0 && (
          <EmptyState icon="history" title="No training jobs yet" description="Dispatch a training job to see results here." />
        )}
        {!isLoading && !error && jobs.length > 0 && (
          <>
            {jobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between py-4 border-b-2 border-primary last:border-b-0"
              >
                <div>
                  <p className="font-headline font-bold text-sm">Job {job.id.slice(0, 8)}</p>
                  <p className="text-xs text-on-surface-variant">
                    {job.started_at ? formatDate(job.started_at) : 'Pending'} · Progress: {job.progress}%
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {jobBadge(job.status)}
                  {job.status === 'running' && (
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
              </div>
            ))}
            <Pagination page={jobsData!.page} perPage={jobsData!.per_page} total={jobsData!.total} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  )
}
