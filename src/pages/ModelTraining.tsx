import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { usePipelines } from '../modules/pipelines/hooks/usePipelines'
import { useTrainModel, useJobs, useDeleteJob, useRecommendations } from '../modules/training/hooks/useTraining'
import type { AlgorithmInfo, RecommendationItem } from '../core/api/training.api'
import { PageHeader } from '../shared/components/PageHeader'
import { EmptyState } from '../shared/components/EmptyState'
import { ErrorState } from '../shared/components/ErrorState'
import { LoadingSpinner } from '../shared/components/LoadingSpinner'
import { Pagination } from '../shared/components/Pagination'
import { Button } from '../shared/components/ui/button'
import { Badge } from '../shared/components/ui/badge'
import { ConfirmDialog } from '../shared/components/ui/confirm-dialog'
import { ProgressBar } from '../shared/components/ui/progress-bar'
import { toApiError } from '../core/api/errors'
import { formatDate } from '../shared/utils/format'
import { trainModelSchema } from '../shared/schemas/training'
import { trainingApi } from '../core/api/training.api'
import WorkflowNextStep from '../shared/components/WorkflowNextStep'

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
  const navigate = useNavigate()
  const paramPipelineId = searchParams.get('pipelineId')
  const [page, setPage] = useState(1)
  const [selectedPipelineId, setSelectedPipelineId] = useState('')
  const [selectedAlgos, setSelectedAlgos] = useState<string[]>([])
  const [cvFolds, setCvFolds] = useState(5)
  const [tuningEnabled, setTuningEnabled] = useState(true)
  const [customName, setCustomName] = useState('')
  const [validationError, setValidationError] = useState('')
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [hyperparameters, setHyperparameters] = useState<Record<string, Record<string, unknown>>>({})
  const [showHyperparams, setShowHyperparams] = useState(false)

  const { data: pipelinesData, isLoading: pipelinesLoading } = usePipelines(1)
  const { data: jobsData, isLoading: jobsLoading, error, refetch } = useJobs(page)
  const trainMutation = useTrainModel()
  const deleteJob = useDeleteJob()
  const [confirmDeleteJobId, setConfirmDeleteJobId] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([])
  const [confirmBulkDeleteJobs, setConfirmBulkDeleteJobs] = useState(false)
  const [bulkDeletingJobs, setBulkDeletingJobs] = useState(false)
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)
  const [monitorExpanded, setMonitorExpanded] = useState(false)

  const toggleJobSelect = (id: string) => {
    setSelectedJobIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }
  const toggleSelectAllJobs = () => {
    const pageIds = jobs.map((j) => j.id)
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedJobIds.includes(id))
    if (allSelected) {
      setSelectedJobIds((prev) => prev.filter((id) => !pageIds.includes(id)))
    } else {
      setSelectedJobIds((prev) => Array.from(new Set([...prev, ...pageIds])))
    }
  }
  const handleBulkDeleteJobs = async () => {
    if (selectedJobIds.length === 0) return
    setBulkDeletingJobs(true)
    try {
      await Promise.all(selectedJobIds.map((id) => trainingApi.deleteJob(id)))
      setSelectedJobIds([])
      refetch()
    } catch (e) {
      setCancelError(toApiError(e).message)
    } finally {
      setBulkDeletingJobs(false)
      setConfirmBulkDeleteJobs(false)
    }
  }
  const { data: algorithmsData } = useQuery({
    queryKey: ['algorithms'],
    queryFn: () => trainingApi.getAlgorithms(),
  })
  const algorithmInfo: Record<string, AlgorithmInfo> = algorithmsData?.algorithms ?? {}

  const pipelines = pipelinesData?.items ?? []
  const completedPipelines = pipelines.filter((p) => p.status === 'completed')
  const jobs = jobsData?.items ?? []

  const { data: recommendationData, isLoading: recLoading } = useRecommendations(
    selectedPipelineId ? { pipeline_id: selectedPipelineId } : undefined
  )
  const recMap = new Map<string, RecommendationItem>(
    (recommendationData?.recommendations ?? []).map((r) => [r.algorithm, r])
  )

  useEffect(() => {
    if (!selectedPipelineId && completedPipelines.length > 0) {
      const match = paramPipelineId && completedPipelines.some((p) => p.id === paramPipelineId)
      setSelectedPipelineId(match ? paramPipelineId! : completedPipelines[0].id)
    }
  }, [completedPipelines, selectedPipelineId, paramPipelineId])

  // Resolve selected pipeline details
  const selectedPipeline = completedPipelines.find((p) => p.id === selectedPipelineId)
  const problemType = (recommendationData?.problem_type as string) ?? selectedPipeline?.problem_type ?? 'classification'

  const availableAlgos = problemType === 'classification' ? CLASSIFICATION_ALGOS : REGRESSION_ALGOS

  // Auto-select recommended algorithms when recommendations arrive (first load or pipeline switch)
  const [hasAutoApplied, setHasAutoApplied] = useState(false)
  useEffect(() => {
    if (recommendationData?.recommended_algorithms && selectedPipelineId) {
      // Only auto-apply on fresh pipeline switch or initial load, not after manual toggles
      const isAllSelected =
        selectedAlgos.length > 0 &&
        selectedAlgos.length === availableAlgos.length &&
        selectedAlgos.every((id) => availableAlgos.some((a) => a.id === id))
      const shouldApply = selectedAlgos.length === 0 || (isAllSelected && !hasAutoApplied)
      if (shouldApply) {
        setSelectedAlgos(recommendationData.recommended_algorithms)
        setHasAutoApplied(true)
      }
    }
  }, [recommendationData, selectedPipelineId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset auto-apply flag when pipeline changes
  const handleSelectPipeline = (id: string) => {
    setSelectedPipelineId(id)
    setHasAutoApplied(false)
    setSelectedAlgos([])
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
      hyperparameters: Object.keys(hyperparameters).length > 0 ? hyperparameters : undefined,
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
          <div className="lg:col-span-7 bg-surface border-2 border-primary p-6 brutal-shadow md:p-8 brutal-shadow">
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
                {/* Dataset-driven recommendations */}
                {recLoading && (
                  <div className="mb-6 border-2 border-dashed border-primary/30 p-4 flex items-center gap-2 text-xs font-headline font-bold uppercase text-on-surface-variant">
                    <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                    Analysing dataset to recommend models…
                  </div>
                )}
                {recommendationData && (
                  <div className="mb-6 border-2 border-primary bg-primary-container/15 p-4 brutal-shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-headline font-black text-xs uppercase tracking-tight flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm text-tertiary">lightbulb</span>
                          Recommended for your dataset
                        </h4>
                        <p className="text-[11px] font-body text-on-surface-variant mt-1 leading-snug">
                          {recommendationData.profile.rows.toLocaleString()} rows · {recommendationData.profile.columns} cols · {recommendationData.problem_type} · ranking by{' '}
                          <span className="font-bold text-primary">{recommendationData.recommended_metric}</span>
                          {recommendationData.profile.imbalanced && recommendationData.profile.imbalance_ratio ? ` · imbalanced ${recommendationData.profile.imbalance_ratio}:1` : ''}
                        </p>
                        {recommendationData.profile.notes.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {recommendationData.profile.notes.slice(0, 3).map((note) => (
                              <span key={note} className="inline-flex items-center border border-primary/40 bg-surface px-2 py-0.5 text-[9px] font-headline font-bold uppercase">
                                {note}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-[10px] font-body text-on-surface-variant mt-2">
                          Suggested: <span className="font-headline font-bold">{recommendationData.recommended_algorithms.join(', ').replaceAll('_', ' ')}</span>
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => setSelectedAlgos(recommendationData.recommended_algorithms)}
                        className="shrink-0 uppercase text-[11px] font-black px-3"
                      >
                        Use Recommended ({recommendationData.recommended_algorithms.length})
                      </Button>
                    </div>
                  </div>
                )}

                {/* Select Algorithms */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <label className="font-headline font-bold text-xs uppercase">Target Algorithms</label>
                    {recommendationData && (
                      <span className="text-[10px] font-body text-on-surface-variant">
                        {selectedAlgos.length}/{availableAlgos.length} selected · est. total {(() => {
                          const estMap: Record<string, number> = {'5-15s':10,'10-30s':20,'15-40s':28,'15-45s':30,'20-60s':40,'30-90s':60,'1-3m':120,'1-4m':150,'2-8m+':300,'3-10m+':400}
                          const total = selectedAlgos.reduce((acc, id) => acc + (estMap[recMap.get(id)?.estimated_time ?? '15-40s'] ?? 30), 0)
                          if (total < 60) return `${total}s`
                          return `${Math.round(total/60)}m`
                        })()}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {availableAlgos.map((algo) => {
                      const isSelected = selectedAlgos.includes(algo.id)
                      const rec = recMap.get(algo.id)
                      const suitability = rec?.suitability
                      const isNotRecommended = suitability === 'not_recommended'
                      return (
                        <div
                          key={algo.id}
                          onClick={() => handleToggleAlgo(algo.id)}
                          className={`border-2 p-4 cursor-pointer relative select-none transition-all duration-200 flex flex-col gap-1.5 ${
                            isSelected
                              ? suitability === 'recommended'
                                ? 'border-tertiary bg-tertiary/10 brutal-shadow-sm'
                                : suitability === 'not_recommended'
                                  ? 'border-primary bg-primary-container/5 brutal-shadow-sm opacity-80'
                                  : 'border-primary bg-primary-container/10 brutal-shadow-sm'
                              : isNotRecommended
                                ? 'border-primary/20 bg-surface/30 opacity-70 hover:opacity-90 hover:border-primary/40'
                                : 'border-primary/30 bg-surface/50 opacity-75 hover:opacity-100 hover:border-primary/80'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 flex-1">
                              <span className="material-symbols-outlined text-md font-bold mt-0.5">
                                {isSelected ? 'check_box' : 'check_box_outline_blank'}
                              </span>
                              <div className="flex-1 min-w-0">
                                <span className="font-headline font-bold text-sm block leading-tight">{algo.label}</span>
                                <span className="text-[10px] text-on-surface-variant font-medium block mt-0.5 leading-snug">{algo.description}</span>
                              </div>
                            </div>
                            {rec && (
                              <span
                                className={`shrink-0 text-[8px] font-headline font-black uppercase px-1.5 py-0.5 border leading-none tracking-wide ${
                                  suitability === 'recommended'
                                    ? 'bg-[#22c55e] text-white border-[#16a34a]'
                                    : suitability === 'consider'
                                      ? 'bg-[#facc15] text-black border-black'
                                      : 'bg-surface-variant text-on-surface-variant border-primary/30'
                                }`}
                              >
                                {suitability === 'recommended' ? 'Recommended' : suitability === 'consider' ? 'Consider' : 'Not ideal'}
                              </span>
                            )}
                          </div>
                          {rec && (
                            <div className="flex items-center gap-2 flex-wrap mt-1">
                              <span className="text-[10px] font-headline font-bold bg-surface border border-primary/30 px-1.5 py-0.5">
                                {rec.score}/100
                              </span>
                              <span className="text-[10px] font-body text-on-surface-variant flex items-center gap-1">
                                <span className="material-symbols-outlined text-[11px]">schedule</span>
                                {rec.estimated_time}
                              </span>
                              {algo.isSlow && rec.suitability === 'not_recommended' && (
                                <span className="text-[9px] font-headline font-bold uppercase text-secondary flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[10px]">warning</span>
                                  Slow on large data
                                </span>
                              )}
                            </div>
                          )}
                          {rec?.reasons && rec.reasons.length > 0 && (
                            <ul className="mt-1 space-y-0.5">
                              {rec.reasons.slice(0, 2).map((r) => (
                                <li key={r} className="text-[10px] font-body text-on-surface-variant leading-snug flex gap-1">
                                  <span className="text-tertiary mt-0.5">•</span>
                                  <span className="flex-1">{r}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => setSelectedAlgos(availableAlgos.map((a) => a.id))}
                      className="text-[10px] font-headline font-bold uppercase underline decoration-dotted underline-offset-4 hover:text-tertiary"
                    >
                      Select all
                    </button>
                    <span className="text-[10px] text-on-surface-variant">·</span>
                    <button
                      type="button"
                      onClick={() => setSelectedAlgos([])}
                      className="text-[10px] font-headline font-bold uppercase underline decoration-dotted underline-offset-4 hover:text-tertiary"
                    >
                      Clear
                    </button>
                    {recommendationData && (
                      <>
                        <span className="text-[10px] text-on-surface-variant">·</span>
                        <button
                          type="button"
                          onClick={() => setSelectedAlgos(recommendationData.recommended_algorithms)}
                          className="text-[10px] font-headline font-bold uppercase text-tertiary underline decoration-solid underline-offset-4"
                        >
                          Reset to recommended
                        </button>
                      </>
                    )}
                  </div>
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

                {/* Hyperparameter Configuration (US-17) */}
                <div className="mb-6">
                  <button
                    type="button"
                    onClick={() => setShowHyperparams((v) => !v)}
                    className="flex items-center gap-2 font-headline font-bold text-xs uppercase mb-2 hover:text-tertiary"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {showHyperparams ? 'expand_less' : 'tune'}
                    </span>
                    Configure Hyperparameters (Optional)
                  </button>
                  {showHyperparams && (
                    <div className="border-2 border-primary/40 bg-surface-variant/30 p-4 space-y-4">
                      {selectedAlgos.length === 0 && (
                        <p className="text-[11px] text-on-surface-variant">Select at least one algorithm to configure its hyperparameters.</p>
                      )}
                      {selectedAlgos.map((algoId) => {
                        const info = algorithmInfo[algoId]
                        const gridKeys = info ? Object.keys(info.tunable_grid) : []
                        if (gridKeys.length === 0) return null
                        return (
                          <div key={algoId}>
                            <div className="font-headline font-bold text-xs uppercase mb-2">{algoId.replace(/_/g, ' ')}</div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {gridKeys.map((param) => {
                                const def = info.defaults?.[param]
                                const current = hyperparameters[algoId]?.[param]
                                return (
                                  <div key={param}>
                                    <label className="block text-[10px] font-headline font-bold uppercase mb-1">{param}</label>
                                    <input
                                      type="number"
                                      step="any"
                                      placeholder={def != null ? String(def) : ''}
                                      value={current != null ? String(current) : ''}
                                      onChange={(e) => {
                                        const raw = e.target.value
                                        const num = raw === '' ? undefined : Number(raw)
                                        setHyperparameters((prev) => {
                                          const next = { ...prev }
                                          const algoParams = { ...(next[algoId] ?? {}) }
                                          if (num === undefined) delete algoParams[param]
                                          else algoParams[param] = num
                                          if (Object.keys(algoParams).length === 0) delete next[algoId]
                                          else next[algoId] = algoParams
                                          return next
                                        })
                                      }}
                                      className="border-2 border-primary bg-surface p-2 w-full font-body text-xs"
                                    />
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
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
                  <p className="text-error font-mono font-bold text-xs mb-4">{validationError}</p>
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
          <div className={`lg:col-span-5 flex flex-col bg-surface border-2 border-primary p-6 brutal-shadow ${monitorExpanded ? 'lg:row-span-2' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline font-black text-xl uppercase tracking-tight">Job Monitor</h3>
              {activeJob && (
                <button
                  onClick={() => setMonitorExpanded((v) => !v)}
                  className="border-2 border-black bg-white px-3 py-1 font-mono text-[10px] font-black uppercase tracking-widest hover:bg-[#ffd400] btn-press flex items-center gap-1.5 shrink-0"
                  aria-label={monitorExpanded ? 'Shrink logs' : 'Expand logs'}
                  title={monitorExpanded ? 'Shrink' : 'Expand to fit history'}
                >
                  <span className="material-symbols-outlined text-sm leading-none">{monitorExpanded ? 'collapse_content' : 'expand_content'}</span>
                  {monitorExpanded ? 'Shrink' : 'Expand'}
                </button>
              )}
            </div>
            {activeJob ? (
              <div className="flex-1 flex flex-col min-h-0">
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
                  <ProgressBar
                    value={activeJob.progress}
                    active={activeJob.status === 'running' || activeJob.status === 'queued'}
                  />
                  {activeJob.eta_seconds != null && activeJob.status === 'running' && (
                    <p className="font-headline font-bold text-[10px] uppercase mt-1 text-on-surface-variant">
                      Estimated time remaining: {Math.round(activeJob.eta_seconds)}s
                    </p>
                  )}
                </div>

                {/* Live logs terminal box - fitted, scrollable, expandable */}
                <div className={`bg-primary text-on-primary p-4 font-mono text-xs rounded-none border border-primary overflow-y-auto flex-1 min-h-[180px] ${monitorExpanded ? 'max-h-[65vh]' : 'max-h-[320px]'} flex flex-col`}>
                  <div className="text-tertiary-container font-bold mb-2 shrink-0">=== ENGINE LIVE LOGS ===</div>
                  <div className="flex-1 overflow-y-auto min-h-0">
                    {activeJob.log ? (
                      <pre className="whitespace-pre-wrap leading-relaxed break-words">{activeJob.log}</pre>
                    ) : (
                      <p className="opacity-50 italic">Waiting for logs...</p>
                    )}
                  </div>
                </div>
                <p className="text-[10px] font-mono text-black/40 mt-2 text-center">
                  {monitorExpanded ? 'Expanded — fitted to histories height' : 'Fitted — click Expand to enlarge with history'}
                </p>
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
      <div className="bg-surface border-2 border-primary p-6 brutal-shadow md:p-8 brutal-shadow">
        <h3 className="font-headline font-black text-xl uppercase mb-6 tracking-tight">Training Jobs History</h3>

        {selectedJobIds.length > 0 && (
          <div className="mb-4 bg-[#ffd400] border-2 border-black p-3 brutal-shadow-sm flex items-center justify-between gap-3">
            <span className="font-headline font-black text-xs uppercase flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">checklist</span>
              {selectedJobIds.length} selected
            </span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedJobIds([])} disabled={bulkDeletingJobs}>Clear</Button>
              <Button variant="danger" size="sm" onClick={() => setConfirmBulkDeleteJobs(true)} disabled={bulkDeletingJobs}>
                {bulkDeletingJobs ? 'Deleting…' : `Delete Selected (${selectedJobIds.length})`}
              </Button>
            </div>
          </div>
        )}

        {cancelError && (
          <div className="bg-error-container border-l-4 border-error p-3 text-xs font-body text-on-error-container mb-4">
            {cancelError}
          </div>
        )}

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
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={jobs.length > 0 && jobs.every((j) => selectedJobIds.includes(j.id))}
                        onChange={toggleSelectAllJobs}
                        className="w-4 h-4 border-2 border-black accent-black"
                      />
                    </th>
                    <th className="p-3 font-headline font-bold uppercase">Job ID</th>
                    <th className="p-3 font-headline font-bold uppercase">Pipeline</th>
                    <th className="p-3 font-headline font-bold uppercase">Started</th>
                    <th className="p-3 font-headline font-bold uppercase">Status</th>
                    <th className="p-3 font-headline font-bold uppercase">Progress</th>
                    <th className="p-3 font-headline font-bold uppercase">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => {
                    const isSelected = selectedJobIds.includes(job.id)
                    const isLogExpanded = expandedLogId === job.id
                    return (
                    <>
                    <tr key={job.id} className={`border-b border-primary last:border-b-0 transition-colors ${isSelected ? 'bg-[#ffd400]/20' : 'hover:bg-surface-variant/30'}`}>
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleJobSelect(job.id)}
                          className="w-4 h-4 border-2 border-black accent-black"
                        />
                      </td>
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
                        <div className="flex gap-2 flex-wrap">
                          <Button variant="ghost" size="sm" onClick={() => { setActiveJobId(job.id); setExpandedLogId(expandedLogId === job.id ? null : job.id) }}>{isLogExpanded ? "Hide Logs" : "Logs"}</Button>
                          <Button variant="ghost" size="sm" onClick={() => setActiveJobId(job.id)}>Monitor</Button>
                          {(job.status === 'queued' || job.status === 'running') && (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="text-error border-error"
                              onClick={async () => {
                                setCancelError(null)
                                try {
                                  await trainingApi.cancelJob(job.id)
                                  refetch()
                                } catch (e) {
                                  setCancelError(toApiError(e).message)
                                }
                              }}
                            >
                              Cancel
                            </Button>
                          )}
                          <Button variant="danger" size="sm" onClick={() => setConfirmDeleteJobId(job.id)}>
                            Delete
                          </Button>
                          {job.status === 'completed' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => navigate(`/compare?pipelineId=${job.pipeline_id ?? 'all'}`)}
                            >
                              Leaderboard
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isLogExpanded && (
                        <tr key={`${job.id}-logs`}>
                          <td colSpan={7} className="p-0 border-b-2 border-black">
                            <div className={`bg-primary text-on-primary p-4 font-mono text-xs border-t-2 border-black overflow-y-auto ${monitorExpanded ? 'max-h-[50vh]' : 'max-h-[280px]'} flex flex-col`}>
                              <div className="flex items-center justify-between mb-2 shrink-0">
                                <span className="text-tertiary-container font-bold">=== ENGINE LIVE LOGS — {job.id.slice(0, 8)} ===</span>
                                <button
                                  onClick={() => setMonitorExpanded((v) => !v)}
                                  className="border border-white/20 bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-colors"
                                >
                                  {monitorExpanded ? 'Shrink' : 'Expand'}
                                </button>
                              </div>
                              <div className="flex-1 overflow-y-auto min-h-0">
                                {job.log ? (
                                  <pre className="whitespace-pre-wrap leading-relaxed break-words">{job.log}</pre>
                                ) : (
                                  <p className="opacity-50 italic">No logs yet — waiting for engine…</p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={jobsData!.page} perPage={jobsData!.per_page} total={jobsData!.total} onPageChange={setPage} />
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmDeleteJobId !== null}
        title="Delete Training Job"
        message="Delete this training job and all models produced by it? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (confirmDeleteJobId) {
            try {
              await deleteJob.mutateAsync(confirmDeleteJobId)
            } catch {
              // surfaced via query refetch / error boundary
            }
          }
          setConfirmDeleteJobId(null)
        }}
        onCancel={() => setConfirmDeleteJobId(null)}
      />
      <ConfirmDialog
        open={confirmBulkDeleteJobs}
        title="Delete Selected Jobs"
        message={`Delete ${selectedJobIds.length} selected job(s) and all models they produced? This cannot be undone.`}
        confirmLabel={bulkDeletingJobs ? 'Deleting…' : `Delete ${selectedJobIds.length}`}
        onConfirm={handleBulkDeleteJobs}
        onCancel={() => setConfirmBulkDeleteJobs(false)}
      />
      <WorkflowNextStep />
    </div>
  )
}
