import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useModels } from '../modules/training/hooks/useTraining'
import { PageHeader } from '../shared/components/PageHeader'
import { EmptyState } from '../shared/components/EmptyState'
import { ErrorState } from '../shared/components/ErrorState'
import { SkeletonTable } from '../shared/components/LoadingSpinner'
import { Pagination } from '../shared/components/Pagination'
import { Badge } from '../shared/components/ui/badge'
import { Button } from '../shared/components/ui/button'
import { CONFIG } from '../core/config'
import { trainingApi } from '../core/api/training.api'
import WorkflowNextStep from '../shared/components/WorkflowNextStep'
import { toApiError } from '../core/api/errors'
import { usePipeline } from '../modules/pipelines/hooks/usePipelines'
import {
  FileSpreadsheet,
  FileArchive,
  Code,
  Award,
  FileText,
  ChevronRight,
  Crown,
  Upload,
  Download
} from 'lucide-react'

type CompareModelLike = { id: string; metrics?: Record<string, unknown> }

function bestModelId(models: CompareModelLike[]): string | null {
  const scored = models.filter(
    (m) => m.metrics && typeof (m.metrics.accuracy ?? m.metrics.r2) === 'number',
  )
  if (scored.length === 0) return null
  const metric: 'accuracy' | 'r2' = 'r2' in scored[0].metrics! ? 'r2' : 'accuracy'
  let bestId: string | null = null
  let bestVal = -Infinity
  for (const m of scored) {
    const v = m.metrics?.[metric]
    if (typeof v === 'number' && v > bestVal) {
      bestVal = v
      bestId = m.id
    }
  }
  return bestId
}

function orderedMetricEntries(metrics: Record<string, unknown> | undefined): [string, unknown][] {
  if (!metrics) return []
  const entries = Object.entries(metrics)
  const priority = ['accuracy', 'r2', 'f1_score', 'f1', 'roc_auc', 'precision', 'recall', 'rmse', 'mae', 'mape', 'cv_mean_score']
  return entries.sort((a, b) => {
    const ia = priority.indexOf(a[0])
    const ib = priority.indexOf(b[0])
    if (ia === -1 && ib === -1) return a[0].localeCompare(b[0])
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })
}

function parsePredictError(msg: string): { highlight: string; features: string[] | null; missing: string[] | null; hint: string | null } {
  const highlightMatch = msg.match(/the uploaded dataset does not match[\s\S]*?following features:/i)
  const highlight = highlightMatch
    ? highlightMatch[0].replace(/^Cannot score:\s*/i, '').replace(/\s*\(raw mode\)|\s*\(preprocessed mode\)/gi, '').trim()
    : msg.slice(0, 160).replace(/\s*\(raw mode\)|\s*\(preprocessed mode\)/gi, '').trim()
  const featuresMatch = msg.match(/following features:\s*(\[.*?\])/s)
  let features: string[] | null = null
  if (featuresMatch) {
    try {
      features = JSON.parse(featuresMatch[1].replace(/'/g, '"')) as string[]
    } catch {
      features = null
    }
  }
  const missingMatch = msg.match(/Missing required columns:\s*(\[.*?\])/s)
  let missing: string[] | null = null
  if (missingMatch) {
    try {
      missing = JSON.parse(missingMatch[1].replace(/'/g, '"')) as string[]
    } catch {
      missing = null
    }
  }
  const hintMatch = msg.match(/Upload a dataset[^.]*\.?/)
  const hint = hintMatch ? hintMatch[0] : null
  return { highlight, features, missing, hint }
}

export default function Results() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const { data, isLoading, error, refetch } = useModels(page)
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)

  const [selectedTab, setSelectedTab] = useState<'exports' | 'explain' | 'predict'>('exports')
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([])
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false)
  const [compareData, setCompareData] = useState<any>(null)
  const [compareLoading, setCompareLoading] = useState(false)

  const [explainRowIdx, setExplainRowIdx] = useState(0)
  const [explainData, setExplainData] = useState<any>(null)
  const [explainLoading, setExplainLoading] = useState(false)
  const [explainError, setExplainError] = useState<string | null>(null)

  const [scoreFile, setScoreFile] = useState<File | null>(null)
  const [scorePreprocessed, setScorePreprocessed] = useState(false)
  const [scoreResult, setScoreResult] = useState<any>(null)
  const [scoreLoading, setScoreLoading] = useState(false)
  const [scoreError, setScoreError] = useState<string | null>(null)

  const models = data?.items ?? []
  const completedModels = models.filter((m) => m.status === 'completed')
  const runningCount = models.filter((m) => m.status === 'running' || m.status === 'queued').length
  const failedCount = models.filter((m) => m.status === 'failed').length

  const overallBestId = bestModelId(completedModels)

  const selectedModel = models.find((m) => m.id === selectedModelId) || completedModels[0]

  const { data: selectedPipeline } = usePipeline(selectedModel?.pipeline_id)
  const resolvedTargetColumn = selectedModel?.target_column || selectedPipeline?.target_column

  const selectedMetricsOrdered = useMemo(
    () => orderedMetricEntries(selectedModel?.metrics as Record<string, unknown> | undefined),
    [selectedModel?.metrics],
  )
  const primaryMetric = useMemo(() => {
    if (!selectedModel?.metrics) return null
    const m = selectedModel.metrics as Record<string, number>
    if ('accuracy' in m) return { key: 'accuracy', val: m.accuracy, label: 'Accuracy' }
    if ('r2' in m) return { key: 'r2', val: m.r2, label: 'R²' }
    const first = selectedMetricsOrdered[0]
    if (first && typeof first[1] === 'number') return { key: first[0], val: first[1] as number, label: first[0].replace(/_/g, ' ') }
    return null
  }, [selectedModel?.metrics, selectedMetricsOrdered])

  useEffect(() => {
    if (selectedModel && selectedTab === 'explain') {
      setExplainLoading(true)
      setExplainData(null)
      setExplainError(null)
      trainingApi.explain(selectedModel.id, explainRowIdx)
        .then((res) => {
          setExplainData(res)
        })
        .catch((err) => {
          setExplainError(toApiError(err).message)
        })
        .finally(() => {
          setExplainLoading(false)
        })
    }
  }, [selectedModel?.id, selectedTab, explainRowIdx])

  const handleTabChange = (tab: 'exports' | 'explain' | 'predict') => {
    setSelectedTab(tab)
    if (tab === 'predict') {
      setScoreFile(null)
      setScoreResult(null)
      setScoreError(null)
    }
  }

  const handleOpenCompare = async () => {
    if (selectedCompareIds.length < 2) return
    setCompareLoading(true)
    setIsCompareModalOpen(true)
    setCompareData(null)
    try {
      const res = await trainingApi.compare(selectedCompareIds)
      setCompareData(res)
    } catch {
      // handled via compareData null + loading state; no console noise in prod
    } finally {
      setCompareLoading(false)
    }
  }

  const handlePredict = async () => {
    if (!selectedModel || !scoreFile) return
    setScoreLoading(true)
    setScoreResult(null)
    setScoreError(null)
    try {
      const res = await trainingApi.predict(selectedModel.id, scoreFile, scorePreprocessed)
      setScoreResult(res)
    } catch (err) {
      setScoreError(toApiError(err).message)
    } finally {
      setScoreLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 xl:p-12">
        <PageHeader title="Training" accent="Results" subtitle="Review completed training runs." />
        <SkeletonTable rows={5} cols={6} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 xl:p-12">
        <ErrorState title="Failed to load results" onRetry={() => refetch()} />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 xl:p-12">
      <PageHeader
        title="Training"
        accent="Results"
        subtitle={`${completedModels.length} completed · ${runningCount} in progress · ${failedCount} failed`}
      />

      {!isLoading && !error && models.length > 0 && completedModels.length === 0 && (
        <div className="mb-6 bg-warning-container border-l-4 border-warning p-4 text-sm font-body text-on-warning-container">
          <p className="font-headline font-black text-xs uppercase tracking-wider">No completed models yet</p>
          <p className="mt-1">Finish a training run to compare models side-by-side and unlock exports.</p>
        </div>
      )}
      {!isLoading && !error && models.length > 0 && completedModels.length > 0 && selectedCompareIds.length < 2 && (
        <p className="mb-6 text-on-surface-variant font-headline font-bold text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">compare_arrows</span>
          Tip: select 2+ completed models via the checkboxes to compare side-by-side.
        </p>
      )}

      {models.length === 0 ? (
        <EmptyState
          icon="summarize"
          title="No results yet"
          description="Complete a training run to see results here."
          action={<Button onClick={() => navigate('/training')}>Go to Training</Button>}
        />
      ) : (
        <div className="space-y-6">
          <div className="space-y-4">
            {selectedCompareIds.length >= 2 && (
              <div className="bg-[#ffd400] border-2 border-black p-3 brutal-shadow-sm flex items-center justify-between gap-3">
                <span className="font-headline font-black text-xs uppercase tracking-tight flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">analytics</span>
                  {selectedCompareIds.length} selected
                </span>
                <Button variant="primary" size="sm" onClick={handleOpenCompare} className="shrink-0">
                  Compare Side-by-Side
                </Button>
              </div>
            )}

            <div className="bg-white border-2 border-black brutal-shadow-sm overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b-2 border-black bg-white flex items-center justify-between gap-3">
                <h2 className="font-headline font-black text-sm uppercase tracking-tight flex items-center gap-2">
                  <span className="w-2 h-2 bg-black border border-black" aria-hidden />
                  Models
                  <span className="font-mono text-[10px] font-bold bg-black text-white px-1.5 py-0.5">{models.length}</span>
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-widest text-black/60 hidden sm:inline">
                  click row → view hub
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b-2 border-black bg-black text-white">
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          aria-label="Select all completed models"
                          checked={selectedCompareIds.length === completedModels.length && completedModels.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCompareIds(completedModels.map(m => m.id))
                            } else {
                              setSelectedCompareIds([])
                            }
                          }}
                          className="w-4 h-4 border-2 border-white accent-[#ffd400]"
                        />
                      </th>
                      <th className="p-3 font-headline font-black text-[10px] uppercase tracking-widest">Model</th>
                      <th className="p-3 font-headline font-black text-[10px] uppercase tracking-widest hidden sm:table-cell">Algo</th>
                      <th className="p-3 font-headline font-black text-[10px] uppercase tracking-widest text-center">Score</th>
                      <th className="p-3 font-headline font-black text-[10px] uppercase tracking-widest hidden md:table-cell">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {models.map((m) => {
                      const isSelected = selectedModel?.id === m.id
                      const isBest = m.id === overallBestId
                      const isRegression = m.metrics && ('r2' in m.metrics)
                      const scoreVal = m.metrics
                        ? (isRegression ? m.metrics.r2 : m.metrics.accuracy)
                        : null
                      const isChecked = selectedCompareIds.includes(m.id)
                      const isCompleted = m.status === 'completed'

                      return (
                        <tr
                          key={m.id}
                          onClick={() => m.status === 'completed' && setSelectedModelId(m.id)}
                          className={`border-b border-black/20 last:border-b-0 cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[#ffd400] '
                              : isBest
                                ? 'bg-[#ffd400]/15 hover:bg-[#ffd400]/25'
                                : 'bg-white hover:bg-black/[0.04]'
                          }`}
                        >
                          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                            {isCompleted ? (
                              <input
                                type="checkbox"
                                aria-label={`Select ${m.name} for comparison`}
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedCompareIds([...selectedCompareIds, m.id])
                                  } else {
                                    setSelectedCompareIds(selectedCompareIds.filter(id => id !== m.id))
                                  }
                                }}
                                className="w-4 h-4 border-2 border-black accent-black cursor-pointer"
                              />
                            ) : (
                              <span className="w-4 h-4 inline-block border border-black/20 bg-black/5" aria-hidden />
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-headline font-black text-sm leading-none tracking-tight">{m.name}</span>
                              {isBest && (
                                <span className="inline-flex items-center gap-1 bg-black text-[#ffd400] border border-black px-1.5 py-0.5 text-[10px] font-headline font-black uppercase tracking-widest">
                                  <Crown className="w-3 h-3 fill-[#ffd400] text-[#ffd400]" /> Best
                                </span>
                              )}
                              {isSelected && !isBest && (
                                <span className="inline-flex bg-white border border-black px-1 py-0.5 text-[9px] font-mono font-black uppercase">Selected</span>
                              )}
                            </div>
                            <span className="text-[11px] text-black/60 font-mono block mt-1 truncate max-w-[180px]">
                              {m.id.slice(0, 8)} · {m.algorithm.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-xs font-bold capitalize hidden sm:table-cell">{m.algorithm.replace(/_/g, ' ')}</td>
                          <td className="p-3 text-center">
                            {typeof scoreVal === 'number' ? (
                              <span className={`inline-block font-mono text-sm font-black px-2 py-1 border-2 ${isBest ? 'bg-black text-white border-black' : 'bg-white border-black'}`}>
                                {scoreVal.toFixed(3)}
                              </span>
                            ) : (
                              <span className="font-mono text-xs text-black/40">—</span>
                            )}
                            {isSelected && m.status === 'completed' && (
                              <span className="inline-flex ml-2 text-[10px] font-headline font-black uppercase text-black/60 items-center gap-1">
                                Hub <ChevronRight className="w-3 h-3" />
                              </span>
                            )}
                          </td>
                          <td className="p-3 hidden md:table-cell">
                            <Badge
                              variant={
                                m.status === 'completed' ? 'success' :
                                m.status === 'failed' ? 'danger' :
                                m.status === 'running' ? 'warning' : 'info'
                              }
                            >
                              {m.status}
                            </Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-3 border-t-2 border-black bg-white">
                <Pagination page={data!.page} perPage={data!.per_page} total={data!.total} onPageChange={setPage} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {selectedModel ? (
              <div className="bg-white border-2 border-black brutal-shadow overflow-hidden">
                <div className="p-5 border-b-2 border-black bg-white">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <Badge variant={selectedModel.id === overallBestId ? 'success' : 'default'} className="text-[11px] font-black uppercase tracking-widest">
                      {selectedModel.id === overallBestId ? '🏆 Best Model' : 'Candidate Model'}
                    </Badge>
                    <span className="font-mono text-[11px] bg-black text-white px-2 py-1 border border-black">{selectedModel.id.slice(0, 8)}</span>
                  </div>
                  <h3 className="font-headline font-black text-2xl uppercase tracking-tight leading-none">{selectedModel.name}</h3>
                  <p className="font-mono text-[11px] uppercase tracking-widest text-black/60 mt-2 flex items-center gap-2 flex-wrap">
                    <span className="bg-[#ffd400] border border-black px-2 py-1 font-black text-black">{selectedModel.algorithm.replace(/_/g, ' ')}</span>
                    <span>· {selectedModel.status}</span>
                    {primaryMetric && (
                      <span className="inline-flex items-center gap-1 bg-black text-white px-2 py-1 font-black">
                        {primaryMetric.label}: {primaryMetric.val.toFixed(3)}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex border-b-2 border-black">
                  {(['exports', 'explain', 'predict'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => handleTabChange(tab)}
                      aria-selected={selectedTab === tab}
                      role="tab"
                      className={`flex-1 py-3 text-center text-[11px] font-headline font-black uppercase tracking-widest transition-colors border-r last:border-r-0 border-black ${
                        selectedTab === tab
                          ? 'bg-black text-white'
                          : 'bg-white text-black hover:bg-[#ffd400]'
                      }`}
                    >
                      {tab === 'exports' ? 'Overview & Exports' : tab === 'explain' ? 'Explain' : 'Predict'}
                    </button>
                  ))}
                </div>

                <div className="p-5">
                  {selectedTab === 'exports' && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                        <div className="lg:col-span-2 bg-black text-white border-2 border-black p-4 flex flex-col justify-center">
                          <span className="font-mono text-[10px] uppercase tracking-widest text-white/60 font-black">Primary Metric</span>
                          {primaryMetric ? (
                            <>
                              <span className="font-headline font-black text-4xl leading-none mt-1 tracking-tight">{primaryMetric.val.toFixed(3)}</span>
                              <span className="font-mono text-xs uppercase tracking-widest text-[#ffd400] font-black mt-1">{primaryMetric.label}</span>
                              {selectedModel.id === overallBestId && (
                                <span className="mt-3 inline-flex items-center gap-1 bg-[#ffd400] text-black border border-black px-2 py-1 text-[10px] font-headline font-black uppercase">
                                  <Crown className="w-3 h-3" /> Leader
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="font-mono text-sm text-white/60">No metrics yet</span>
                          )}
                        </div>
                        <div className="lg:col-span-3 bg-[#ffd400]/15 border-2 border-black p-4">
                          <p className="font-headline font-black text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 bg-black" aria-hidden /> Executive Briefing
                          </p>
                          <p className="font-body text-sm leading-relaxed text-black/80">
                            Trained on <span className="font-black bg-white border border-black px-1">“{resolvedTargetColumn ?? 'target'}”</span> with preprocessing
                            {selectedPipeline ? ` (${selectedPipeline.problem_type})` : ''}. {selectedModel.id === overallBestId ? 'This is the current leader — highest primary metric.' : 'Compare against the leader via checkboxes above.'}
                          </p>
                        </div>
                      </div>

                      <div className="border-2 border-black bg-white">
                        <div className="px-4 py-3 border-b-2 border-black bg-black text-white flex items-center justify-between">
                          <p className="font-headline font-black text-xs uppercase tracking-widest">Validation Performance</p>
                          <span className="font-mono text-[10px] uppercase tracking-widest text-white/60">{selectedMetricsOrdered.length} metrics</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-0 divide-x divide-y divide-black/15">
                          {selectedMetricsOrdered.map(([key, val]) => {
                            const isPrimary = primaryMetric?.key === key
                            return (
                              <div key={key} className={`p-3 text-center ${isPrimary ? 'bg-[#ffd400] border-black' : 'bg-white'}`}>
                                <span className="font-mono text-[10px] font-black uppercase tracking-widest text-black/60 block truncate" title={key}>
                                  {key.replace(/_/g, ' ')}
                                </span>
                                <span className={`font-mono font-black block mt-1 ${isPrimary ? 'text-lg' : 'text-sm'}`}>
                                  {typeof val === 'number' ? (val as number).toFixed(3) : String(val)}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-black" aria-hidden />
                          <h4 className="font-headline font-black text-xs uppercase tracking-widest">Export Hub</h4>
                          <span className="h-[2px] flex-1 bg-black/20" aria-hidden />
                        </div>

                        <a
                          href={`${CONFIG.API_BASE_URL}/training/models/${selectedModel.id}/export/report`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between p-4 border-2 border-black bg-[#ffd400] hover:bg-[#ffeb3b] transition-colors group brutal-shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-black text-[#ffd400] border-2 border-black flex items-center justify-center">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                              <p className="font-headline font-black text-sm uppercase tracking-tight">Executive HTML Report</p>
                              <p className="font-mono text-[11px] uppercase tracking-widest text-black/60">EDA log + leaderboard + embedded plots (opens in new tab)</p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform shrink-0" />
                        </a>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <a
                            href={`${CONFIG.API_BASE_URL}/training/models/${selectedModel.id}/export/cleaned`}
                            download
                            className="flex items-center justify-between p-3 border-2 border-black bg-white hover:bg-black hover:text-white transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <FileSpreadsheet className="w-5 h-5" />
                              <div className="text-left">
                                <p className="font-headline font-black text-xs uppercase leading-none">Cleaned CSV</p>
                                <p className="font-mono text-[10px] uppercase tracking-widest opacity-60">Outliers capped, missing imputed</p>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform shrink-0" />
                          </a>

                          {selectedModel.pipeline_id && (
                            <a
                              href={`${CONFIG.API_BASE_URL}/training/models/${selectedModel.id}/export/preprocessed`}
                              download
                              className="flex items-center justify-between p-3 border-2 border-black bg-white hover:bg-black hover:text-white transition-colors group"
                            >
                              <div className="flex items-center gap-3">
                                <FileArchive className="w-5 h-5" />
                                <div className="text-left">
                                  <p className="font-headline font-black text-xs uppercase leading-none">Splits ZIP</p>
                                  <p className="font-mono text-[10px] uppercase tracking-widest opacity-60">Train/test CSVs</p>
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform shrink-0" />
                            </a>
                          )}

                          <a
                            href={`${CONFIG.API_BASE_URL}/training/models/${selectedModel.id}/export/recipe`}
                            download
                            className="flex items-center justify-between p-3 border-2 border-black bg-white hover:bg-black hover:text-white transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <Code className="w-5 h-5" />
                              <div className="text-left">
                                <p className="font-headline font-black text-xs uppercase leading-none">Inference Recipe</p>
                                <p className="font-mono text-[10px] uppercase tracking-widest opacity-60">recipe.json + recipe.py</p>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform shrink-0" />
                          </a>

                          <a
                            href={`${CONFIG.API_BASE_URL}/training/models/${selectedModel.id}/download`}
                            download
                            className="flex items-center justify-between p-3 border-2 border-black bg-white hover:bg-black hover:text-white transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <Award className="w-5 h-5" />
                              <div className="text-left">
                                <p className="font-headline font-black text-xs uppercase leading-none">Model Bundle ZIP</p>
                                <p className="font-mono text-[10px] uppercase tracking-widest opacity-60">.pkl + pipeline</p>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform shrink-0" />
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedTab === 'explain' && (
                    <div className="space-y-4">
                      <div className="bg-white border-2 border-black p-4">
                        <label className="font-headline font-black text-xs uppercase tracking-widest block mb-2">Test Row Index</label>
                        <div className="flex gap-3 items-center">
                          <input
                            type="number"
                            min={0}
                            value={explainRowIdx}
                            onChange={(e) => setExplainRowIdx(parseInt(e.target.value) || 0)}
                            className="border-2 border-black bg-white px-3 py-2 w-28 font-mono text-sm focus:outline-none focus:bg-[#ffd400]/20"
                          />
                          <span className="font-mono text-[11px] uppercase tracking-widest text-black/60">
                            0 = first test row · SHAP waterfall
                          </span>
                        </div>
                      </div>

                      {explainLoading && (
                        <div className="border-2 border-black border-dashed p-8 text-center">
                          <span className="w-6 h-6 border-2 border-black border-t-transparent animate-spin inline-block mb-3" aria-hidden />
                          <p className="font-headline font-black text-xs uppercase tracking-widest">Calculating SHAP…</p>
                        </div>
                      )}

                      {!explainLoading && explainError && (
                         <div className="bg-white border-l-[6px] border-black border-2 border-black p-4">
                          <p className="font-headline font-black text-xs uppercase tracking-widest">Explanation Unavailable</p>
                          <p className="font-mono text-xs mt-1 text-black/70">{explainError}</p>
                        </div>
                      )}

                      {!explainLoading && explainData && (
                        <div className="space-y-4">
                          <div className="border-2 border-black bg-white overflow-hidden">
                            <div className="px-4 py-3 border-b-2 border-black bg-black text-white flex items-center justify-between">
                              <p className="font-headline font-black text-xs uppercase tracking-widest">Local Waterfall</p>
                              <span className="font-mono text-[10px] uppercase tracking-widest text-white/60">
                                {explainData.local_explanation.baseline_value.toFixed(3)} → {explainData.local_explanation.prediction_value.toFixed(3)}
                              </span>
                            </div>
                            <div className="p-4">
                              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-black/60 mb-3">
                                <span className="w-3 h-3 bg-[#16a34a] border border-black" /> Positive
                                <span className="w-3 h-3 bg-[#dc2626] border border-black ml-2" /> Negative
                              </div>
                              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                                {(() => {
                                  const maxAbs = Math.max(...explainData.local_explanation.attributions.slice(0, 10).map((a: any) => Math.abs(a.contribution)), 1)
                                  return explainData.local_explanation.attributions.slice(0, 10).map((attr: any) => {
                                    const val = attr.contribution as number
                                    const isPositive = val >= 0
                                    const pct = Math.min((Math.abs(val) / maxAbs) * 100, 100)
                                    return (
                                      <div key={attr.name} className="border border-black/15 p-2 bg-white">
                                        <div className="flex justify-between font-mono text-xs mb-1">
                                          <span className="truncate max-w-[160px] font-black" title={attr.name}>{attr.name}</span>
                                          <span className={`font-black ${isPositive ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>
                                            {isPositive ? '+' : ''}{val.toFixed(4)}
                                          </span>
                                        </div>
                                        <div className="w-full bg-black/5 h-2 border border-black/20">
                                          <div
                                            className={`h-full ${isPositive ? 'bg-[#16a34a]' : 'bg-[#dc2626]'}`}
                                            style={{ width: `${pct}%`, marginLeft: isPositive ? '0' : 'auto' }}
                                          />
                                        </div>
                                        <span className="font-mono text-[10px] text-black/60">
                                          value: {attr.val_target} → base {attr.val_base}
                                        </span>
                                      </div>
                                    )
                                  })
                                })()}
                              </div>
                            </div>
                          </div>

                          {explainData.global_importance && explainData.global_importance.length > 0 && (
                            <div className="border-2 border-black bg-white overflow-hidden">
                              <div className="px-4 py-3 border-b-2 border-black bg-[#ffd400]">
                                <p className="font-headline font-black text-xs uppercase tracking-widest">Global Importance · Top 6</p>
                              </div>
                              <div className="p-4 space-y-2">
                                {(() => {
                                  const maxImp = Math.max(...explainData.global_importance.slice(0, 6).map((i: any) => i.importance), 1)
                                  return explainData.global_importance.slice(0, 6).map((imp: any) => (
                                    <div key={imp.feature} className="border border-black/15 p-2">
                                      <div className="flex justify-between font-mono text-xs mb-1">
                                        <span className="truncate max-w-[160px] font-black">{imp.feature}</span>
                                        <span className="font-black">{imp.importance.toFixed(4)}</span>
                                      </div>
                                      <div className="w-full bg-black/5 h-2 border border-black/20">
                                        <div className="h-full bg-black" style={{ width: `${(imp.importance / maxImp) * 100}%` }} />
                                      </div>
                                    </div>
                                  ))
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {selectedTab === 'predict' && (
                    <div className="space-y-4">
                      <div className="border-2 border-black bg-white p-4">
                        <label className="font-headline font-black text-xs uppercase tracking-widest block mb-3">Upload Fresh Dataset to Predict</label>
                        <label className="border-2 border-dashed border-black p-6 text-center bg-[#ffd400]/10 hover:bg-[#ffd400]/20 cursor-pointer relative flex flex-col items-center gap-2 transition-colors block">
                          <input
                            type="file"
                            accept=".csv,.xlsx,.parquet,.json"
                            onChange={(e) => setScoreFile(e.target.files?.[0] || null)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <Upload className="w-8 h-8" />
                          <span className="font-headline font-black text-xs uppercase truncate max-w-full">
                            {scoreFile ? scoreFile.name : 'Select file to predict'}
                          </span>
                          <span className="font-mono text-[11px] uppercase tracking-widest text-black/60">CSV · Excel · Parquet · JSON</span>
                        </label>

                        <label className="flex items-start gap-2 mt-4 font-mono text-xs cursor-pointer border border-black/15 p-3 bg-white">
                          <input
                            type="checkbox"
                            checked={scorePreprocessed}
                            onChange={(e) => setScorePreprocessed(e.target.checked)}
                            className="mt-1 w-4 h-4 accent-black border-2 border-black"
                          />
                          <span>
                            <span className="font-headline font-black uppercase text-xs">Input is already preprocessed</span>
                            <br />
                            <span className="text-black/60 normal-case">Skips scaling/encoding — use for exported splits.</span>
                          </span>
                        </label>
                      </div>

                      {scoreFile && (
                        <Button variant="primary" className="w-full brutal-shadow" onClick={handlePredict} disabled={scoreLoading} title={scoreLoading ? 'Generating predictions — please wait' : undefined} aria-busy={scoreLoading}>
                          {scoreLoading ? 'Generating Predictions…' : 'Generate Predictions'}
                        </Button>
                      )}

                      {scoreError && (() => {
                        const parsed = parsePredictError(scoreError)
                        const showFeatures = !!parsed.features?.length
                        const showMissing = !!parsed.missing?.length
                        return (
                          <div className="border-2 border-black bg-white overflow-hidden">
                            <div className="bg-[#DC2626] text-white px-4 py-2.5 border-b-2 border-black flex items-center gap-2">
                              <span className="w-6 h-6 bg-white text-[#DC2626] border-2 border-black flex items-center justify-center font-black text-sm leading-none">!</span>
                              <p className="font-headline font-black text-xs uppercase tracking-widest">Prediction Failed</p>
                            </div>
                            <div className="p-4 space-y-3">
                              <div className="bg-[#ffd400] border-2 border-black p-3 brutal-shadow-sm">
                                <p className="font-headline font-black text-[11px] uppercase tracking-widest flex items-center gap-2">
                                  <span className="w-2 h-2 bg-black" aria-hidden /> Dataset mismatch
                                </p>
                                <p className="font-body text-sm font-black leading-snug mt-2">
                                  {parsed.highlight}
                                </p>
                              </div>
                              {showFeatures && (
                                <div>
                                  <p className="font-mono text-[10px] font-black uppercase tracking-widest text-black/60 mb-2">Expected features ({parsed.features!.length})</p>
                                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto border-2 border-black/15 p-2 bg-black/[0.02]">
                                    {parsed.features!.map((f) => (
                                      <span key={f} className="font-mono text-[11px] bg-white border border-black px-2 py-0.5 whitespace-nowrap">{f}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {showMissing && (
                                <div>
                                  <p className="font-mono text-[10px] font-black uppercase tracking-widest text-[#DC2626] mb-2">Missing required columns ({parsed.missing!.length})</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {parsed.missing!.map((m) => (
                                      <span key={m} className="font-mono text-[11px] bg-[#DC2626] text-white border border-black px-2 py-0.5 whitespace-nowrap">{m}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {parsed.hint && (
                                <p className="font-mono text-xs bg-black text-white border-2 border-black p-3 leading-relaxed">
                                  {parsed.hint}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })()}

                      {scoreResult && (
                        <div className="space-y-4">
                          <div className="bg-black text-white border-2 border-black p-4 flex items-center gap-3">
                            <span className="w-8 h-8 bg-[#ffd400] text-black border-2 border-black flex items-center justify-center font-black">✓</span>
                            <div>
                              <p className="font-headline font-black text-xs uppercase tracking-widest">Prediction Complete</p>
                              <p className="font-mono text-xs text-white/70">{scoreResult.rows} rows predicted</p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => trainingApi.downloadPredictions(scoreResult.download_filename)}
                            className="w-full flex items-center justify-between p-4 border-2 border-black bg-black text-white hover:bg-[#ffd400] hover:text-black transition-colors group brutal-shadow-sm"
                          >
                            <span className="flex items-center gap-3">
                              <Download className="w-5 h-5" />
                              <span className="text-left">
                                <span className="font-headline font-black text-xs uppercase block">Download Predictions</span>
                                <span className="font-mono text-[10px] uppercase tracking-widest opacity-70">Full dataset + prediction column</span>
                              </span>
                            </span>
                            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                          </button>

                          <div className="border-2 border-black bg-white overflow-hidden">
                            <div className="px-4 py-3 border-b-2 border-black bg-black text-white">
                              <p className="font-headline font-black text-xs uppercase tracking-widest">Preview · Top 5</p>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left font-mono text-xs">
                                <thead>
                                  <tr className="border-b-2 border-black bg-[#ffd400]">
                                    <th className="p-2 font-black uppercase text-[11px]">Predicted</th>
                                    {scoreResult.columns
                                      .filter((c: string) => c !== 'prediction' && c !== 'confidence' && !c.endsWith('(predicted)') && c !== 'diff')
                                      .slice(0, 5)
                                      .map((col: string) => (
                                      <th key={col} className="p-2 truncate max-w-[100px] font-black uppercase text-[11px]" title={col}>{col}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {scoreResult.data.slice(0, 5).map((row: any, rIdx: number) => {
                                    const predCol = scoreResult.columns.find((c: string) => c.endsWith('(predicted)')) || 'prediction'
                                    return (
                                    <tr key={rIdx} className="border-b border-black/10 last:border-0 even:bg-black/[0.03]">
                                      <td className="p-2 font-black bg-black text-white border-r-2 border-black">{String(row[predCol] ?? '')}</td>
                                      {scoreResult.columns
                                        .filter((c: string) => c !== 'prediction' && c !== 'confidence' && !c.endsWith('(predicted)') && c !== 'diff')
                                        .slice(0, 5)
                                        .map((col: string) => (
                                          <td key={col} className="p-2 truncate max-w-[100px]">{String(row[col] ?? '')}</td>
                                        ))}
                                    </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white border-2 border-black border-dashed p-10 text-center brutal-shadow">
                <div className="w-14 h-14 bg-black text-[#ffd400] border-2 border-black flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-2xl">info</span>
                </div>
                <p className="font-headline font-black text-sm uppercase tracking-tight">Select a model to view hub</p>
                <p className="font-mono text-xs text-black/60 mt-1">Choose a completed row above. Use checkboxes to compare 2+.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <WorkflowNextStep />
      {isCompareModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border-[3px] border-black p-6 md:p-8 w-full max-w-5xl brutal-shadow max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 pb-3 border-b-[3px] border-black">
              <h3 className="font-headline font-black text-xl md:text-2xl uppercase tracking-tight flex items-center gap-2">
                <span className="w-2 h-8 bg-black hidden md:block" aria-hidden />
                Model Comparison Matrix
              </h3>
              <button
                onClick={() => setIsCompareModalOpen(false)}
                aria-label="Close comparison"
                className="border-2 border-black bg-white w-10 h-10 flex items-center justify-center font-black hover:bg-black hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {compareLoading && <div className="text-center py-12 font-headline font-black text-sm uppercase tracking-widest flex flex-col items-center gap-3"><span className="w-6 h-6 border-2 border-black border-t-transparent animate-spin block" /> Loading comparison…</div>}

            {!compareLoading && compareData && (
              <div className="space-y-6">
                <div className="overflow-x-auto border-2 border-black">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b-2 border-black bg-black text-white">
                        <th className="p-3 font-headline font-black uppercase tracking-widest">Attribute</th>
                        {(() => {
                          const compareBestId = bestModelId(compareData.models)
                          const cBest = compareData.models.find((m: any) => m.id === compareBestId)
                          const cLabel = cBest?.metrics && 'r2' in cBest.metrics ? 'R²' : 'Accuracy'
                          return compareData.models.map((m: any) => (
                            <th key={m.id} className={`p-3 font-headline font-black uppercase text-center border-l-2 border-white/20 min-w-[180px] ${m.id === compareBestId ? 'bg-[#ffd400] text-black' : ''}`}>
                              <div className="flex flex-col items-center gap-1">
                                <span>{m.name}</span>
                                {m.id === compareBestId && (
                                  <span className="text-[10px] font-black bg-black text-[#ffd400] border border-black px-1.5 py-0.5 flex items-center gap-1">
                                    👑 Best by {cLabel}
                                  </span>
                                )}
                              </div>
                            </th>
                          ))
                        })()}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-black/15 bg-[#ffd400]/10">
                        <td className="p-3 font-headline font-black uppercase text-xs">Algorithm</td>
                        {compareData.models.map((m: any) => (
                          <td key={m.id} className="p-3 text-center border-l border-black/15 font-mono text-xs font-black capitalize">
                            {m.algorithm.replace(/_/g, ' ')}
                          </td>
                        ))}
                      </tr>
                      
                      {Array.from(new Set(compareData.models.flatMap((m: any) => Object.keys(m.metrics || {})))).map((metric: any) => (
                        <tr key={metric} className="border-b border-black/10 even:bg-black/[0.02]">
                          <td className="p-3 font-headline font-black uppercase text-xs">{metric.replace(/_/g, ' ')}</td>
                          {compareData.models.map((m: any) => {
                            const val = m.metrics?.[metric]
                            const isBestVal = Math.max(...compareData.models.map((x: any) => typeof x.metrics?.[metric] === 'number' ? x.metrics[metric] : -Infinity)) === val
                            return (
                              <td key={m.id} className={`p-3 text-center border-l border-black/15 font-mono font-black ${isBestVal ? 'bg-[#ffd400] border-black' : ''}`}>
                                {typeof val === 'number' ? val.toFixed(4) : val ?? '—'}
                              </td>
                            )
                          })}
                        </tr>
                      ))}

                      <tr className="border-b border-black/15">
                        <td className="p-3 font-headline font-black uppercase text-xs">Training Duration</td>
                        {compareData.models.map((m: any) => (
                          <td key={m.id} className="p-3 text-center border-l border-black/15 font-mono text-xs">
                            {(m.training_time || 0).toFixed(2)}s
                          </td>
                        ))}
                      </tr>

                      <tr className="border-b border-black/15">
                        <td className="p-3 font-headline font-black uppercase text-xs">Scaling</td>
                        {compareData.models.map((m: any) => (
                          <td key={m.id} className="p-3 text-center border-l border-black/15 font-mono text-xs capitalize">
                            {m.pipeline?.scaling?.strategy ?? 'auto'}
                          </td>
                        ))}
                      </tr>

                      <tr className="border-b border-black/15">
                        <td className="p-3 font-headline font-black uppercase text-xs">Encoding</td>
                        {compareData.models.map((m: any) => (
                          <td key={m.id} className="p-3 text-center border-l border-black/15 font-mono text-xs capitalize">
                            {m.pipeline?.encoding?.strategy ?? 'auto'}
                          </td>
                        ))}
                      </tr>

                      <tr className="border-b border-black/15">
                        <td className="p-3 font-headline font-black uppercase text-xs">Imbalance</td>
                        {compareData.models.map((m: any) => (
                          <td key={m.id} className="p-3 text-center border-l border-black/15 font-mono text-[11px] font-black uppercase">
                            {m.pipeline?.use_smote && 'SMOTE'}
                            {m.pipeline?.use_class_weight && (m.pipeline?.use_smote ? ' + ' : '')}
                            {m.pipeline?.use_class_weight && 'Class Weights'}
                            {!m.pipeline?.use_smote && !m.pipeline?.use_class_weight && 'None'}
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td className="p-3 font-headline font-black uppercase text-xs">Feature Selection</td>
                        {compareData.models.map((m: any) => (
                          <td key={m.id} className="p-3 text-center border-l border-black/15 font-mono text-xs">
                            {m.pipeline?.feature_selection?.enabled ? '✓ Enabled' : '✗ Disabled'}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <div className="flex justify-end">
                  <Button variant="primary" className="brutal-shadow-sm" onClick={() => setIsCompareModalOpen(false)}>
                    Close Comparison
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
