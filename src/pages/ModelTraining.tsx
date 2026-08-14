import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { usePipelines } from '../modules/pipelines/hooks/usePipelines'
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
import { trainingApi } from '../core/api/training.api'

interface AlgoOption {
  id: string
  label: string
  description: string
  isSlow?: boolean
}

const CLASSIFICATION_ALGOS: AlgoOption[] = [
  { id: 'logistic_regression', label: 'Logistic Regression', description: 'Fast baseline classification' },
  { id: 'random_forest', label: 'Random Forest', description: 'Robust ensemble tree model' },
  { id: 'xgboost', label: 'XGBoost', description: 'State-of-the-art gradient boosting' },
  { id: 'svm', label: 'SVM', description: 'Support Vector Machine', isSlow: true },
  { id: 'knn', label: 'KNN', description: 'K-Nearest Neighbors', isSlow: true },
]

const REGRESSION_ALGOS: AlgoOption[] = [
  { id: 'linear_regression', label: 'Linear Regression', description: 'Simple linear baseline' },
  { id: 'ridge', label: 'Ridge', description: 'L2-regularized linear model' },
  { id: 'lasso', label: 'Lasso', description: 'L1-regularized sparse model' },
  { id: 'random_forest_regressor', label: 'Random Forest Regressor', description: 'Ensemble tree regressor' },
  { id: 'xgboost_regressor', label: 'XGBoost Regressor', description: 'High-performance gradient booster' },
]

export default function ModelTraining() {
  const [searchParams] = useSearchParams()
  const paramPipelineId = searchParams.get('pipelineId')
  const [page, setPage] = useState(1)
  const [selectedPipelineId, setSelectedPipelineId] = useState('')
  const [selectedAlgos, setSelectedAlgos] = useState<string[]>([])
  const [cvFolds, setCvFolds] = useState(5)
  const [tuningEnabled, setTuningEnabled] = useState(true)
  const [customName, setCustomName] = useState('')
  const [validationError, setValidationError] = useState('')
  const [activeJobId, setActiveJobId] = useState<string | null>(null)

  const { data: pipelinesData, isLoading: pipelinesLoading } = usePipelines(1)
  const { data: jobsData, isLoading: jobsLoading, error, refetch } = useJobs(page)
  const trainMutation = useTrainModel()

  const pipelines = pipelinesData?.items ?? []
  const completedPipelines = pipelines.filter((p) => p.status === 'completed')
  const jobs = jobsData?.items ?? []

  useEffect(() => {
    if (!selectedPipelineId && completedPipelines.length > 0) {
      const match = paramPipelineId && completedPipelines.some((p) => p.id === paramPipelineId)
      setSelectedPipelineId(match ? paramPipelineId! : completedPipelines[0].id)
    }
  }, [completedPipelines, selectedPipelineId, paramPipelineId])

  // Resolve selected pipeline details
  const selectedPipeline = completedPipelines.find((p) => p.id === selectedPipelineId)
  const problemType = selectedPipeline?.problem_type ?? 'classification'
  const rowCount = selectedPipeline?.train_rows ?? 0
  const isLargeDataset = rowCount > 10000

  const availableAlgos = problemType === 'classification' ? CLASSIFICATION_ALGOS : REGRESSION_ALGOS

  // Automatically check all by default when pipeline changes
  const handleSelectPipeline = (id: string) => {
    setSelectedPipelineId(id)
    const pipeline = completedPipelines.find((p) => p.id === id)
    if (pipeline) {
      const pType = pipeline.problem_type ?? 'classification'
      const algos = pType === 'classification'
        ? CLASSIFICATION_ALGOS.map((a) => a.id)
        : REGRESSION_ALGOS.map((a) => a.id)
      setSelectedAlgos(algos)
    } else {
      setSelectedAlgos([])
    }
    setValidationError('')
  }

  const handleToggleAlgo = (algoId: string) => {
    setSelectedAlgos((prev) =>
      prev.includes(algoId) ? prev.filter((id) => id !== algoId) : [...prev, algoId]
    )
  }

  const handleTrain = () => {
    setValidationError('')
    
    const requestData = {
      pipeline_id: selectedPipelineId,
      algorithms: selectedAlgos,
      cv_folds: cvFolds,
      tuning_enabled: tuningEnabled,
      name: customName || undefined,
    }

    const result = trainModelSchema.safeParse(requestData)
    if (!result.success) {
      setValidationError(result.error.errors.map((e) => e.message).join('; '))
      return
    }

    trainMutation.mutate(requestData, {
      onSuccess: (data) => {
        setPage(1)
        setCustomName('')
        if (data.job) {
          setActiveJobId(data.job.id)
        }
      },
    })
  }

  const jobBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
      completed: 'success',
      running: 'warning',
      queued: 'info',
      failed: 'danger',
      cancelled: 'default',
    }
    return <Badge variant={variants[status] ?? 'default'}>{status}</Badge>
  }

  const activeJob = jobs.find((j) => j.id === activeJobId)

  return (
    <div className="p-8 lg:p-12">
      <PageHeader title="Model" accent="Training" subtitle="Run training across multiple classifiers or regressors simultaneously." />

      {pipelinesLoading ? (
        <LoadingSpinner />
      ) : completedPipelines.length === 0 ? (
        <EmptyState icon="model_training" title="No Preprocessing Pipelines Ready" description="Complete and execute a Preprocessing Pipeline first in order to train models." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
          {/* Training Config Form */}
          <div className="lg:col-span-7 bg-surface border-2 border-primary p-6 md:p-8 neo-shadow">
            <h3 className="font-headline font-black text-xl uppercase mb-6 tracking-tight">Configuration</h3>
            
            {/* Select Preprocessed Pipeline */}
            <div className="mb-6">
              <label className="font-headline font-bold text-xs uppercase block mb-2">Preprocessing Pipeline</label>
              <select
                value={selectedPipelineId}
                onChange={(e) => handleSelectPipeline(e.target.value)}
                className="border-2 border-primary bg-surface p-3 w-full font-headline font-bold text-sm focus:outline-none focus:ring-2 focus:ring-tertiary"
              >
                <option value="">Select a pipeline…</option>
                {completedPipelines.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.problem_type} · {p.train_rows?.toLocaleString()} train rows)
                  </option>
                ))}
              </select>
            </div>

            {selectedPipelineId && (
              <>
                {/* Select Algorithms */}
                <div className="mb-6">
                  <label className="font-headline font-bold text-xs uppercase block mb-3">Target Algorithms</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {availableAlgos.map((algo) => {
                      const isSelected = selectedAlgos.includes(algo.id)
                      const showSlowWarning = algo.isSlow && isLargeDataset
                      return (
                        <div
                          key={algo.id}
                          onClick={() => handleToggleAlgo(algo.id)}
                          className={`border-2 p-4 cursor-pointer relative select-none transition-all duration-200 ${
                            isSelected
                              ? 'border-primary bg-primary-container/10 neo-shadow-sm'
                              : 'border-primary/30 bg-surface/50 opacity-60 hover:opacity-100 hover:border-primary/80'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span className="material-symbols-outlined text-md font-bold mt-0.5">
                              {isSelected ? 'check_box' : 'check_box_outline_blank'}
                            </span>
                            <div>
                              <span className="font-headline font-bold text-sm block">{algo.label}</span>
                              <span className="text-[10px] text-on-surface-variant font-medium block mt-0.5">{algo.description}</span>
                            </div>
                          </div>
                          {showSlowWarning && (
                            <div className="absolute top-2 right-2 flex items-center gap-1 bg-secondary text-white text-[9px] font-headline font-black px-1.5 py-0.5 uppercase">
                              <span className="material-symbols-outlined text-[10px]">warning</span>
                              Slow Model
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {isLargeDataset && (
                    <p className="text-[11px] text-secondary font-headline font-bold mt-2 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-xs">info</span>
                      Large dataset detected ({rowCount.toLocaleString()} rows). SVM and KNN are flagged due to potential long runtimes.
                    </p>
                  )}
                </div>

                {/* Additional Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="font-headline font-bold text-xs uppercase block mb-2">Cross Validation Folds</label>
                    <input
                      type="number"
                      min={2}
                      max={10}
                      value={cvFolds}
                      onChange={(e) => setCvFolds(Number(e.target.value))}
                      className="border-2 border-primary bg-surface p-3 w-full font-headline font-bold text-sm"
                    />
                  </div>
                  <div className="flex items-center mt-6">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={tuningEnabled}
                        onChange={(e) => setTuningEnabled(e.target.checked)}
                        className="w-4 h-4 border-2 border-primary accent-primary"
                      />
                      <span className="font-headline font-bold text-sm uppercase">Tune Hyperparameters (Top Models)</span>
                    </label>
                  </div>
                </div>

                {/* Job Name */}
                <div className="mb-8">
                  <label className="font-headline font-bold text-xs uppercase block mb-2">Custom Job Name (Optional)</label>
                  <input
                    type="text"
                    placeholder={`Automated Job - ${new Date().toLocaleDateString()}`}
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="border-2 border-primary bg-surface p-3 w-full font-body text-sm focus:outline-none"
                  />
                </div>

                {validationError && (
                  <p className="text-secondary font-headline font-bold text-xs mb-4">{validationError}</p>
                )}

                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleTrain}
                  disabled={trainMutation.isPending || selectedAlgos.length === 0}
                  className="w-full uppercase font-headline font-black text-lg py-4"
                >
                  {trainMutation.isPending ? 'Queuing Job...' : 'Start Pipeline Training'}
                </Button>
              </>
            )}
          </div>

          {/* Job Live Monitor / Terminal */}
          <div className="lg:col-span-5 flex flex-col h-full bg-surface border-2 border-primary p-6 neo-shadow">
            <h3 className="font-headline font-black text-xl uppercase mb-4 tracking-tight">Job Monitor</h3>
            {activeJob ? (
              <div className="flex-1 flex flex-col min-h-[300px]">
                <div className="flex items-center justify-between mb-3 border-b-2 border-primary pb-3">
                  <div>
                    <h4 className="font-headline font-bold text-sm uppercase">{activeJob.pipeline_id ? 'Pipeline Training Run' : 'Raw Model Run'}</h4>
                    <span className="text-[10px] font-mono text-on-surface-variant">{activeJob.id}</span>
                  </div>
                  {jobBadge(activeJob.status)}
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between font-headline font-bold text-xs uppercase mb-1">
                    <span>Progress</span>
                    <span>{activeJob.progress}%</span>
                  </div>
                  <div className="h-4 border-2 border-primary bg-surface-variant relative overflow-hidden">
                    <div className="h-full bg-secondary transition-all duration-300" style={{ width: `${activeJob.progress}%` }} />
                  </div>
                </div>

                {/* Live logs terminal box */}
                <div className="flex-1 bg-primary text-white p-4 font-mono text-xs rounded-none border border-primary overflow-y-auto h-64 max-h-72">
                  <div className="text-tertiary-container font-bold mb-2">=== ENGINE LIVE LOGS ===</div>
                  {activeJob.log ? (
                    <pre className="whitespace-pre-wrap leading-relaxed">{activeJob.log}</pre>
                  ) : (
                    <p className="opacity-50 italic">Waiting for logs...</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center items-center text-center p-8 border-2 border-dashed border-primary/20 min-h-[300px]">
                <span className="material-symbols-outlined text-5xl text-on-surface-variant opacity-40 mb-3">terminal</span>
                <span className="font-headline font-bold text-sm uppercase text-on-surface-variant">No Active Job Monitored</span>
                <p className="text-[11px] text-on-surface-variant max-w-xs mt-1">Configure and start a training job on the left to see live metrics and logs here.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Historical Training Jobs list */}
      <div className="bg-surface border-2 border-primary p-6 md:p-8 neo-shadow">
        <h3 className="font-headline font-black text-xl uppercase mb-6 tracking-tight">Training Jobs History</h3>

        {jobsLoading && <LoadingSpinner />}
        {error && <ErrorState message="Failed to load training jobs" onRetry={() => refetch()} />}
        {!jobsLoading && !error && jobs.length === 0 && (
          <EmptyState icon="history" title="No Training Jobs Yet" description="Execute a training run to save jobs to history." />
        )}
        {!jobsLoading && !error && jobs.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs mb-4">
                <thead>
                  <tr className="border-b-2 border-primary">
                    <th className="p-3 font-headline font-bold uppercase">Job ID</th>
                    <th className="p-3 font-headline font-bold uppercase">Pipeline</th>
                    <th className="p-3 font-headline font-bold uppercase">Started</th>
                    <th className="p-3 font-headline font-bold uppercase">Status</th>
                    <th className="p-3 font-headline font-bold uppercase">Progress</th>
                    <th className="p-3 font-headline font-bold uppercase">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id} className="border-b border-primary last:border-b-0 hover:bg-surface-variant/30 transition-colors">
                      <td className="p-3 font-mono font-bold">{job.id.slice(0, 8)}...</td>
                      <td className="p-3 font-headline font-bold">
                        {job.pipeline_id ? (
                          <span className="text-primary hover:text-tertiary underline">
                            {job.pipeline_id.slice(0, 8)}...
                          </span>
                        ) : (
                          'Raw Dataset'
                        )}
                      </td>
                      <td className="p-3 font-body">{job.started_at ? formatDate(job.started_at) : '—'}</td>
                      <td className="p-3">{jobBadge(job.status)}</td>
                      <td className="p-3 font-headline font-bold">{job.progress}%</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setActiveJobId(job.id)}>Monitor</Button>
                          {(job.status === 'queued' || job.status === 'running') && (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="text-secondary border-secondary"
                              onClick={async () => {
                                try {
                                  await trainingApi.cancelJob(job.id)
                                  refetch()
                                } catch (e) {
                                  alert('Failed to cancel job')
                                }
                              }}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={jobsData!.page} perPage={jobsData!.per_page} total={jobsData!.total} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  )
}
