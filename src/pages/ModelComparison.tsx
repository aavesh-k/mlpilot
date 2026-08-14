import { useState } from 'react'
import { useModels, useSetBestModel } from '../modules/training/hooks/useTraining'
import { usePipelines } from '../modules/pipelines/hooks/usePipelines'
import { PageHeader } from '../shared/components/PageHeader'
import { EmptyState } from '../shared/components/EmptyState'
import { ErrorState } from '../shared/components/ErrorState'
import { SkeletonTable } from '../shared/components/LoadingSpinner'
import { Button } from '../shared/components/ui/button'
import { Badge } from '../shared/components/ui/badge'
import { CONFIG } from '../core/config'

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
  const setBestMutation = useSetBestModel()

  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('all')
  const [selectedMetric, setSelectedMetric] = useState<string>('')

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

  const handleSetBest = (modelId: string) => {
    setBestMutation.mutate(modelId, {
      onSuccess: () => refetch()
    })
  }

  const isLoading = modelsLoading || pipelinesLoading

  if (isLoading) {
    return (
      <div className="p-8 lg:p-12">
        <PageHeader title="Model" accent="Leaderboard" subtitle="Compare and select the best model for deployment." />
        <SkeletonTable rows={4} cols={7} />
      </div>
    )
  }

  if (modelsError) {
    return (
      <div className="p-8 lg:p-12">
        <ErrorState title="Failed to load models" onRetry={() => refetch()} />
      </div>
    )
  }

  if (completedModels.length === 0) {
    return (
      <div className="p-8 lg:p-12">
        <PageHeader title="Model" accent="Leaderboard" subtitle="Compare and select the best model for deployment." />
        <EmptyState
          icon="leaderboard"
          title="No trained models yet"
          description="Complete a training run in Model Training to populate the leaderboard."
        />
      </div>
    )
  }

  return (
    <div className="p-8 lg:p-12">
      <PageHeader title="Model" accent="Leaderboard" subtitle="Compare and select the best model for deployment." />

      {/* Filters bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 bg-surface border-2 border-primary p-4 neo-shadow">
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
            <div className="border-2 border-primary p-6 neo-shadow mb-8 bg-primary-container/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                {!dynamicBestModel.is_best && (
                  <Button
                    variant="primary"
                    onClick={() => handleSetBest(dynamicBestModel.id)}
                    disabled={setBestMutation.isPending}
                  >
                    Deploy This Model
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Leaderboard Table */}
          <div className="bg-surface border-2 border-primary overflow-x-auto neo-shadow">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-primary bg-surface-variant/20">
                  <th className="p-4 font-headline font-bold text-xs uppercase w-12 text-center">Rank</th>
                  <th className="p-4 font-headline font-bold text-xs uppercase">Model Name</th>
                  <th className="p-4 font-headline font-bold text-xs uppercase text-center">Primary ({activeMetric})</th>
                  {metricsList
                    .filter((m) => m.id !== activeMetric)
                    .map((m) => (
                      <th key={m.id} className="p-4 font-headline font-bold text-xs uppercase text-center">
                        {m.label}
                      </th>
                    ))}
                  <th className="p-4 font-headline font-bold text-xs uppercase text-center">CV Score</th>
                  <th className="p-4 font-headline font-bold text-xs uppercase text-center">Status</th>
                  <th className="p-4 font-headline font-bold text-xs uppercase text-center">Actions</th>
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
                          {isActiveDeploy && (
                            <Badge variant="success" className="uppercase text-[9px]">Deployed</Badge>
                          )}
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
                        .map((mOpt) => (
                          <td key={mOpt.id} className="p-4 font-body text-sm text-center text-on-surface-variant">
                            {m.metrics?.[mOpt.id as keyof typeof m.metrics] ?? '—'}
                          </td>
                        ))}

                      {/* CV Score */}
                      <td className="p-4 font-body text-sm text-center">
                        {m.metrics?.cv_mean_score ?? '—'}
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center">
                        <Badge variant={m.status === 'completed' ? 'success' : 'danger'}>
                          {m.status}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-3">
                          <a
                            href={`${CONFIG.API_BASE_URL}/training/models/${m.id}/download`}
                            download
                            className="font-headline font-bold text-xs uppercase text-tertiary hover:text-primary underline underline-offset-2"
                          >
                            Download Zip
                          </a>
                          {!isActiveDeploy && (
                            <button
                              onClick={() => handleSetBest(m.id)}
                              disabled={setBestMutation.isPending}
                              className="font-headline font-bold text-xs uppercase text-primary hover:text-tertiary underline underline-offset-2"
                            >
                              Deploy
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}