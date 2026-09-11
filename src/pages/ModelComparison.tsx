import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useModels } from '../modules/training/hooks/useTraining'
import { usePipelines } from '../modules/pipelines/hooks/usePipelines'
import { PageHeader } from '../shared/components/PageHeader'
import { EmptyState } from '../shared/components/EmptyState'
import { ErrorState } from '../shared/components/ErrorState'
import { SkeletonTable } from '../shared/components/LoadingSpinner'
import { Badge } from '../shared/components/ui/badge'
import { CONFIG } from '../core/config'
import WorkflowNextStep from '../shared/components/WorkflowNextStep'

const CLASSIFICATION_METRICS = [
  { id: 'accuracy', label: 'Accuracy' },
  { id: 'f1_score', label: 'F1 Score' },
  { id: 'precision', label: 'Precision' },
  { id: 'recall', label: 'Recall' },
  { id: 'roc_auc', label: 'ROC-AUC' },
]

const REGRESSION_METRICS = [
  { id: 'r2', label: 'R² Score' },
  { id: 'rmse', label: 'RMSE' },
  { id: 'mae', label: 'MAE' },
  { id: 'mape', label: 'MAPE' },
]

export default function ModelComparison() {
  const { data: modelsData, isLoading: modelsLoading, error: modelsError, refetch } = useModels(1)
  const { data: pipelinesData, isLoading: pipelinesLoading } = usePipelines(1)
  const [searchParams] = useSearchParams()
  const paramPipelineId = searchParams.get('pipelineId')

  const [selectedPipelineId, setSelectedPipelineId] = useState<string>(paramPipelineId || 'all')
  const [selectedMetric, setSelectedMetric] = useState<string>('')

  useEffect(() => {
    if (paramPipelineId) setSelectedPipelineId(paramPipelineId)
  }, [paramPipelineId])

  const allModels = modelsData?.items ?? []
  const completedModels = allModels.filter((m) => m.metrics)
  const pipelines = pipelinesData?.items ?? []

  // Filter models based on selected pipeline
  const filteredModels = completedModels.filter((m) => 
    selectedPipelineId === 'all' || m.pipeline_id === selectedPipelineId
  )

  // Determine if we are working with classification or regression
  // Look at filtered models or fallback to the first model
  const sampleModel = filteredModels[0] || completedModels[0]
  const isRegression = sampleModel ? ('r2' in (sampleModel.metrics ?? {})) : false

  const metricsList = isRegression ? REGRESSION_METRICS : CLASSIFICATION_METRICS
  const defaultMetric = isRegression ? 'r2' : 'accuracy'
  const activeMetric = selectedMetric || defaultMetric

  // Helper: check if a metric is lower-is-better (e.g. RMSE, MAE, MAPE)
  const isLowerBetter = ['rmse', 'mae', 'mape'].includes(activeMetric)

  // Sort models dynamically based on active metric
  const sortedModels = [...filteredModels].sort((a, b) => {
    const valA = a.metrics?.[activeMetric as keyof typeof a.metrics] ?? (isLowerBetter ? Infinity : -Infinity)
    const valB = b.metrics?.[activeMetric as keyof typeof b.metrics] ?? (isLowerBetter ? Infinity : -Infinity)
    
    if (isLowerBetter) {
      return (valA as number) - (valB as number)
    } else {
      return (valB as number) - (valA as number)
    }
  })

  // The dynamic best model (first in sorted list)
  const dynamicBestModel = sortedModels[0]

  const isLoading = modelsLoading || pipelinesLoading

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 xl:p-12">
        <PageHeader title="Model" accent="Leaderboard" subtitle="Compare and select the best model." />
        <SkeletonTable rows={4} cols={7} />
      </div>
    )
  }

  if (modelsError) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 xl:p-12">
        <ErrorState title="Failed to load models" onRetry={() => refetch()} />
      </div>
    )
  }

  const hasRunningModels = allModels.some((m) => m.status === "running" || m.status === "queued")

  if (completedModels.length === 0) {
    if (hasRunningModels) {
      return (
        <div className="p-4 sm:p-6 lg:p-8 xl:p-12">
          <PageHeader title="Model" accent="Leaderboard" subtitle="Compare and select the best model." />
          <div className="bg-surface border-2 border-primary p-8 brutal-shadow flex items-center gap-4">
            <div className="w-6 h-6 border-[3px] border-black border-t-transparent animate-spin" />
            <div>
              <p className="font-headline font-black text-sm uppercase">Training in progress</p>
              <p className="text-xs text-on-surface-variant">Models are being trained. Leaderboard will populate as they complete — this page auto-refreshes.</p>
            </div>
          </div>
        </div>
      )
    }
    return (
      <div className="p-4 sm:p-6 lg:p-8 xl:p-12">
        <PageHeader title="Model" accent="Leaderboard" subtitle="Compare and select the best model." />
        <EmptyState
          icon="leaderboard"
          title="No trained models yet"
          description="Complete a training run in Model Training to populate the leaderboard."
        />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 xl:p-12">
      <PageHeader title="Model" accent="Leaderboard" subtitle="Compare and select the best model." />

      {/* Filters bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 bg-surface border-2 border-primary p-4 brutal-shadow">
        <div className="flex-1">
          <label className="font-headline font-bold text-[10px] uppercase block mb-1">Filter by Pipeline</label>
          <select
            value={selectedPipelineId}
            onChange={(e) => {
              setSelectedPipelineId(e.target.value)
              setSelectedMetric('') // reset metric type logic
            }}
            className="border border-primary bg-surface p-2 w-full font-headline font-bold text-xs"
          >
            <option value="all">All Pipelines</option>
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.problem_type})
              </option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-64">
          <label className="font-headline font-bold text-[10px] uppercase block mb-1">Rank by Metric</label>
          <select
            value={activeMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="border border-primary bg-surface p-2 w-full font-headline font-bold text-xs"
          >
            {metricsList.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {sortedModels.length === 0 ? (
        <EmptyState
          icon="search"
          title="No models found"
          description="Try changing the filter options above."
        />
      ) : (
        <>
          {/* Best Model Showcase */}
          {dynamicBestModel && (
            <div className="border-2 border-primary p-4 sm:p-6 brutal-shadow mb-8 bg-primary-container/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">🏆</span>
                  <span className="font-headline font-black text-xl uppercase">Leaderboard Winner</span>
                </div>
                <h4 className="font-headline font-bold text-lg">{dynamicBestModel.name}</h4>
                <p className="text-xs text-on-surface-variant font-medium mt-1">
                  Algorithm: <span className="font-bold">{dynamicBestModel.algorithm.replace(/_/g, ' ')}</span> · 
                  Job: <span className="font-mono">{dynamicBestModel.job_id?.slice(0, 8) ?? 'Baseline'}</span>
                </p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="block font-headline text-[10px] font-bold uppercase text-on-surface-variant">
                    {metricsList.find((m) => m.id === activeMetric)?.label}
                  </span>
                  <span className="text-3xl font-headline font-black text-secondary">
                    {activeMetric === 'accuracy' || activeMetric === 'f1_score'
                      ? `${((dynamicBestModel.metrics?.[activeMetric as keyof typeof dynamicBestModel.metrics] as number) * 100).toFixed(1)}%`
                      : dynamicBestModel.metrics?.[activeMetric as keyof typeof dynamicBestModel.metrics]}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Leaderboard Table */}
          <div className="bg-surface border-2 border-primary brutal-shadow overflow-hidden">
            <div className="overflow-x-auto scrollbar-none -mx-4 sm:mx-0">
              <div className="px-4 sm:px-0 min-w-[720px]">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-primary bg-surface-variant/20">
                  <th className="p-2 sm:p-4 font-headline font-bold text-xs uppercase w-12 text-center">Rank</th>
                  <th className="p-2 sm:p-4 font-headline font-bold text-xs uppercase">Model Name</th>
                  <th className="p-2 sm:p-4 font-headline font-bold text-xs uppercase text-center">Primary ({activeMetric})</th>
                  {metricsList
                    .filter((m) => m.id !== activeMetric)
                    .slice(0, 2)
                    .map((m) => (
                      <th key={m.id} className="p-2 sm:p-4 font-headline font-bold text-xs uppercase text-center hidden lg:table-cell">
                        {m.label}
                      </th>
                    ))}
                  <th className="p-2 sm:p-4 font-headline font-bold text-xs uppercase text-center hidden sm:table-cell">CV Score</th>
                  <th className="p-2 sm:p-4 font-headline font-bold text-xs uppercase text-center">Status</th>
                  <th className="p-2 sm:p-4 font-headline font-bold text-xs uppercase text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedModels.map((m, index) => {
                  const isDeployCandidate = m.id === dynamicBestModel?.id
                  const isActiveDeploy = m.is_best

                  return (
                    <tr
                      key={m.id}
                      className={`border-b border-primary last:border-b-0 hover:bg-surface-variant/30 transition-colors ${
                        isActiveDeploy ? 'bg-primary-container/10' : ''
                      }`}
                    >
                      {/* Rank number */}
                      <td className="p-4 font-headline font-black text-sm text-center border-r border-primary/20">
                        #{index + 1}
                      </td>

                      {/* Model Details */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-headline font-bold text-sm">{m.name}</span>
                          {isDeployCandidate && !isActiveDeploy && (
                            <Badge variant="warning" className="uppercase text-[9px]">Auto Winner</Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-on-surface-variant block capitalize">
                          {m.algorithm.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Primary Metric Score */}
                      <td className="p-4 font-headline font-black text-sm text-center bg-surface-variant/10">
                        {m.metrics?.[activeMetric as keyof typeof m.metrics] ?? '—'}
                      </td>

                      {/* Other Metrics Score */}
                      {metricsList
                        .filter((mOpt) => mOpt.id !== activeMetric)
                        .slice(0,2)
                        .map((mOpt) => (
                          <td key={mOpt.id} className="p-2 sm:p-4 font-body text-sm text-center text-on-surface-variant hidden lg:table-cell">
                            {m.metrics?.[mOpt.id as keyof typeof m.metrics] ?? '—'}
                          </td>
                        ))}

                      {/* CV Score */}
                      <td className="p-2 sm:p-4 font-body text-sm text-center hidden sm:table-cell">
                        {m.metrics?.cv_mean_score ?? '—'}
                      </td>

                      {/* Status */}
                      <td className="p-2 sm:p-4 text-center">
                        <Badge variant={m.status === 'completed' ? 'success' : 'danger'} className="text-[10px]">
                          {m.status}
                        </Badge>
                      </td>

                       {/* Actions */}
                      <td className="p-2 sm:p-4">
                        <div className="flex items-center justify-center gap-2">
                          <a
                            href={`${CONFIG.API_BASE_URL}/training/models/${m.id}/download`}
                            download
                            className="font-headline font-bold text-[11px] sm:text-xs uppercase text-tertiary hover:text-primary underline underline-offset-2 whitespace-nowrap"
                          >
                            Download
                          </a>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
              </div>
            </div>
          </div>
          </>
      )}
      <WorkflowNextStep />
    </div>
  )
}