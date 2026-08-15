import { useState, useEffect } from 'react'
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

// The single best model among a set, by the primary metric
// (accuracy for classification, R² for regression). This is what the
// crown should mark — NOT the per-run `is_best` flag.
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

export default function Results() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const { data, isLoading, error, refetch } = useModels(page)
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)

  // Advanced features states
  const [selectedTab, setSelectedTab] = useState<'exports' | 'explain' | 'score'>('exports')
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([])
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false)
  const [compareData, setCompareData] = useState<any>(null)
  const [compareLoading, setCompareLoading] = useState(false)

  // Explain states
  const [explainRowIdx, setExplainRowIdx] = useState(0)
  const [explainData, setExplainData] = useState<any>(null)
  const [explainLoading, setExplainLoading] = useState(false)
  const [explainError, setExplainError] = useState<string | null>(null)

  // Score states
  const [scoreFile, setScoreFile] = useState<File | null>(null)
  const [scoreResult, setScoreResult] = useState<any>(null)
  const [scoreLoading, setScoreLoading] = useState(false)

  const models = data?.items ?? []
  const completedModels = models.filter((m) => m.status === 'completed')
  const runningCount = models.filter((m) => m.status === 'running' || m.status === 'queued').length
  const failedCount = models.filter((m) => m.status === 'failed').length

  const overallBestId = bestModelId(completedModels)
  const bestModelRef = completedModels.find((m) => m.id === overallBestId)
  const bestMetricLabel =
    bestModelRef?.metrics && 'r2' in bestModelRef.metrics ? 'R²' : 'Accuracy'

  // Find currently selected model
  const selectedModel = models.find((m) => m.id === selectedModelId) || completedModels[0]

  // Resolve the target column from the pipeline when the model record lacks it
  const { data: selectedPipeline } = usePipeline(selectedModel?.pipeline_id)
  const resolvedTargetColumn = selectedModel?.target_column || selectedPipeline?.target_column

  // Fetch explanation when model, tab, or index changes
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
          console.error(err)
          setExplainError(
            err instanceof Error ? err.message : 'Failed to compute explanation for this row.',
          )
        })
        .finally(() => {
          setExplainLoading(false)
        })
    }
  }, [selectedModel?.id, selectedTab, explainRowIdx])

  const handleTabChange = (tab: 'exports' | 'explain' | 'score') => {
    setSelectedTab(tab)
    if (tab === 'score') {
      setScoreFile(null)
      setScoreResult(null)
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
    } catch (err) {
      console.error(err)
    } finally {
      setCompareLoading(false)
    }
  }

  const handlePredict = async () => {
    if (!selectedModel || !scoreFile) return
    setScoreLoading(true)
    setScoreResult(null)
    try {
      const res = await trainingApi.predict(selectedModel.id, scoreFile)
      setScoreResult(res)
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Scoring failed')
    } finally {
      setScoreLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 lg:p-12">
        <PageHeader title="Training" accent="Results" subtitle="Review completed training runs." />
        <SkeletonTable rows={5} cols={6} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 lg:p-12">
        <ErrorState title="Failed to load results" onRetry={() => refetch()} />
      </div>
    )
  }

  return (
    <div className="p-8 lg:p-12">
      <PageHeader
        title="Training"
        accent="Results"
        subtitle={`${completedModels.length} completed · ${runningCount} in progress · ${failedCount} failed`}
      />

      {!isLoading && !error && models.length > 0 && completedModels.length === 0 && (
        <p className="mb-6 text-on-surface-variant font-headline font-bold text-sm">
          No completed models yet — finish a training run to compare models side-by-side.
        </p>
      )}
      {!isLoading && !error && models.length > 0 && completedModels.length > 0 && selectedCompareIds.length < 2 && (
        <p className="mb-6 text-on-surface-variant font-headline font-bold text-sm">
          Select at least 2 completed models to compare them side-by-side.
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Models Table List */}
          <div className="lg:col-span-2 space-y-4">
            {selectedCompareIds.length >= 2 && (
              <div className="bg-primary-container/20 border-2 border-primary p-4 neo-shadow-sm flex items-center justify-between">
                <span className="font-headline font-bold text-xs uppercase">
                  {selectedCompareIds.length} models selected for comparison
                </span>
                <Button variant="primary" size="sm" onClick={handleOpenCompare}>
                  Compare Side-by-Side
                </Button>
              </div>
            )}

            <div className="bg-surface border-2 border-primary overflow-x-auto neo-shadow-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b-2 border-primary">
                    <th className="p-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedCompareIds.length === completedModels.length && completedModels.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCompareIds(completedModels.map(m => m.id))
                          } else {
                            setSelectedCompareIds([])
                          }
                        }}
                        className="w-4 h-4 border-2 border-primary accent-primary"
                      />
                    </th>
                    <th className="p-4 font-headline font-bold text-xs uppercase">Model Name</th>
                    <th className="p-4 font-headline font-bold text-xs uppercase">Algorithm</th>
                    <th className="p-4 font-headline font-bold text-xs uppercase text-center">Score</th>
                    <th className="p-4 font-headline font-bold text-xs uppercase">Status</th>
                    <th className="p-4 font-headline font-bold text-xs uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {models.map((m) => {
                    const isSelected = selectedModel?.id === m.id
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
                        className={`border-b border-primary last:border-b-0 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-primary-container/40'
                            : 'hover:bg-surface-variant/30'
                        }`}
                      >
                        <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                          {isCompleted && (
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCompareIds([...selectedCompareIds, m.id])
                                } else {
                                  setSelectedCompareIds(selectedCompareIds.filter(id => id !== m.id))
                                }
                              }}
                              className="w-4 h-4 border-2 border-primary accent-primary cursor-pointer"
                            />
                          )}
                        </td>
                        <td className="p-4 font-headline font-bold text-sm">
                          <div className="flex items-center gap-1.5">
                            {m.name}
                            {m.id === overallBestId && (
                              <>
                                <Crown className="w-3.5 h-3.5 text-yellow-600 fill-yellow-600" />
                                <span className="text-[9px] font-headline uppercase text-yellow-700">Best · {bestMetricLabel}</span>
                              </>
                            )}
                          </div>
                          <span className="text-[10px] text-on-surface-variant block font-mono">
                            {m.id.slice(0, 8)}
                          </span>
                        </td>
                        <td className="p-4 font-body text-sm capitalize">{m.algorithm.replace(/_/g, ' ')}</td>
                        <td className="p-4 font-body text-sm font-bold text-center">
                          {typeof scoreVal === 'number' ? scoreVal.toFixed(3) : '—'}
                        </td>
                        <td className="p-4">
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
                        <td className="p-4 text-right">
                          {m.status === 'completed' && (
                            <span className="inline-flex items-center gap-1 text-xs font-headline font-bold uppercase text-primary">
                              View Hub <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={data!.page} perPage={data!.per_page} total={data!.total} onPageChange={setPage} />
          </div>

          {/* Model Details Tab Panel */}
          <div className="lg:col-span-1">
            {selectedModel ? (
              <div className="bg-surface border-2 border-primary p-6 neo-shadow space-y-6">
                {/* Header */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                      <Badge variant={selectedModel.id === overallBestId ? 'success' : 'default'} className="text-[9px]">
                        {selectedModel.id === overallBestId ? '🏆 Best Model' : 'Candidate Model'}
                      </Badge>
                    <span className="text-[10px] font-mono text-on-surface-variant">{selectedModel.id.slice(0, 8)}</span>
                  </div>
                  <h3 className="font-headline font-black text-xl uppercase tracking-tight">{selectedModel.name}</h3>
                  <p className="text-xs text-on-surface-variant capitalize">
                    {selectedModel.algorithm.replace(/_/g, ' ')} estimator
                  </p>
                </div>

                {/* Neo-brutalism Tabs */}
                <div className="flex border-b-2 border-primary -mx-6">
                  {(['exports', 'explain', 'score'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => handleTabChange(tab)}
                      className={`flex-1 py-3 text-center text-[10px] font-headline font-bold uppercase transition-colors border-r last:border-r-0 border-primary ${
                        selectedTab === tab
                          ? 'bg-primary text-white'
                          : 'bg-surface hover:bg-surface-variant/30'
                      }`}
                    >
                      {tab === 'exports' ? 'Exports' : tab === 'explain' ? 'Explain' : 'Score'}
                    </button>
                  ))}
                </div>

                {/* Tab content 1: Exports & performance */}
                {selectedTab === 'exports' && (
                  <div className="space-y-6">
                    <div className="bg-yellow-100 border-l-4 border-primary p-4 text-xs font-body text-primary-dark">
                      <p className="font-headline font-black text-[10px] uppercase mb-1 tracking-wider">Executive Briefing</p>
                      This model was successfully trained on features extracted from target column{' '}
                      {resolvedTargetColumn ? (
                        <span className="font-bold">"{resolvedTargetColumn}"</span>
                      ) : (
                        <span className="font-bold">the configured target</span>
                      )}.{' '}
                      It ranked highest on metrics and is compiled with preprocessing rules.
                    </div>

                    <div className="border border-primary p-4">
                      <p className="font-headline font-black text-[10px] uppercase mb-3 tracking-wider text-on-surface-variant">Validation Performance</p>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(selectedModel.metrics || {}).map(([key, val]) => (
                          <div key={key} className="border border-primary/20 bg-surface-variant/20 p-2 text-center">
                            <span className="font-headline font-bold text-[9px] uppercase text-on-surface-variant block truncate">
                              {key.replace(/_/g, ' ')}
                            </span>
                            <span className="font-mono text-sm font-bold">
                              {typeof val === 'number' ? val.toFixed(3) : val}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="font-headline font-black text-[10px] uppercase tracking-wider text-on-surface-variant">Reporting & Export Hub</p>
                      
                      <a
                        href={`${CONFIG.API_BASE_URL}/training/models/${selectedModel.id}/export/report`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-3 border border-primary bg-surface hover:bg-surface-variant/20 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-indigo-600" />
                          <div className="text-left">
                            <p className="font-headline font-bold text-xs">Executive HTML Report</p>
                            <p className="text-[10px] text-on-surface-variant">Includes EDA log, leaderboard & base64 plots</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </a>

                      <a
                        href={`${CONFIG.API_BASE_URL}/training/models/${selectedModel.id}/export/cleaned`}
                        download
                        className="flex items-center justify-between p-3 border border-primary bg-surface hover:bg-surface-variant/20 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                          <div className="text-left">
                            <p className="font-headline font-bold text-xs">Cleaned Dataset (CSV)</p>
                            <p className="text-[10px] text-on-surface-variant">Outliers capped & missing cells imputed</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </a>

                      {selectedModel.pipeline_id && (
                        <a
                          href={`${CONFIG.API_BASE_URL}/training/models/${selectedModel.id}/export/preprocessed`}
                          download
                          className="flex items-center justify-between p-3 border border-primary bg-surface hover:bg-surface-variant/20 transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <FileArchive className="w-5 h-5 text-amber-600" />
                            <div className="text-left">
                              <p className="font-headline font-bold text-xs">Preprocessed splits (ZIP)</p>
                              <p className="text-[10px] text-on-surface-variant">Train/test splits in CSV format</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </a>
                      )}

                      <a
                        href={`${CONFIG.API_BASE_URL}/training/models/${selectedModel.id}/export/recipe`}
                        download
                        className="flex items-center justify-between p-3 border border-primary bg-surface hover:bg-surface-variant/20 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <Code className="w-5 h-5 text-violet-600" />
                          <div className="text-left">
                            <p className="font-headline font-bold text-xs">Python Inference Recipe</p>
                            <p className="text-[10px] text-on-surface-variant">Replicate pipeline cleaning & model execution</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </a>

                      <a
                        href={`${CONFIG.API_BASE_URL}/training/models/${selectedModel.id}/download`}
                        download
                        className="flex items-center justify-between p-3 border border-primary bg-surface hover:bg-surface-variant/20 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <Award className="w-5 h-5 text-blue-600" />
                          <div className="text-left">
                            <p className="font-headline font-bold text-xs">Trained Model bundle (ZIP)</p>
                            <p className="text-[10px] text-on-surface-variant">Pickled estimator and pipeline transformers</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </a>
                    </div>
                  </div>
                )}

                {/* Tab content 2: Explainability */}
                {selectedTab === 'explain' && (
                  <div className="space-y-4">
                    <div>
                      <label className="font-headline font-bold text-xs uppercase block mb-1">Select Row Index</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={0}
                          value={explainRowIdx}
                          onChange={(e) => setExplainRowIdx(parseInt(e.target.value) || 0)}
                          className="border-2 border-primary bg-surface px-3 py-1 w-24 text-sm font-mono"
                        />
                        <span className="text-[10px] text-on-surface-variant self-center font-body">
                          Test partition row index (0+)
                        </span>
                      </div>
                    </div>

                    {explainLoading && <div className="text-center py-8 font-headline font-bold text-xs uppercase">Calculating explainability values...</div>}

                    {!explainLoading && explainError && (
                      <div className="bg-red-100 border-l-4 border-red-500 p-4 text-xs font-body text-red-950">
                        <p className="font-headline font-black text-[10px] uppercase mb-1 tracking-wider">Explanation Unavailable</p>
                        {explainError}
                      </div>
                    )}

                    {!explainLoading && explainData && (
                      <div className="space-y-4">
                        <div className="border border-primary p-4">
                          <p className="font-headline font-black text-[10px] uppercase mb-1 tracking-wider text-on-surface-variant">
                            Local Waterfall Prediction Contributions
                          </p>
                          <p className="text-[10px] text-on-surface-variant mb-3">
                            Baseline pred: {explainData.local_explanation.baseline_value.toFixed(3)} → Final pred: {explainData.local_explanation.prediction_value.toFixed(3)}
                          </p>
                          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                            {explainData.local_explanation.attributions.slice(0, 10).map((attr: any) => {
                              const val = attr.contribution
                              const isPositive = val >= 0
                              return (
                                <div key={attr.name} className="text-xs font-body">
                                  <div className="flex justify-between font-mono text-[10px] mb-0.5">
                                    <span className="truncate max-w-[150px] font-bold" title={attr.name}>{attr.name}</span>
                                    <span className={isPositive ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                                      {isPositive ? '+' : ''}{val.toFixed(4)}
                                    </span>
                                  </div>
                                  <div className="w-full bg-surface-variant/30 h-1.5 border border-primary/20 relative">
                                    <div
                                      className={`h-full ${isPositive ? 'bg-green-500' : 'bg-red-500'}`}
                                      style={{
                                        width: `${Math.min(Math.abs(val) * 100, 100)}%`,
                                        marginLeft: isPositive ? '0' : 'auto'
                                      }}
                                    />
                                  </div>
                                  <span className="text-[9px] text-on-surface-variant font-mono">
                                    value: {attr.val_target} (baseline: {attr.val_base})
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {explainData.global_importance && explainData.global_importance.length > 0 && (
                          <div className="border border-primary p-4">
                            <p className="font-headline font-black text-[10px] uppercase mb-2 tracking-wider text-on-surface-variant">
                              Global Feature Importance (Top Features)
                            </p>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {explainData.global_importance.slice(0, 6).map((imp: any) => (
                                <div key={imp.feature} className="text-xs font-body">
                                  <div className="flex justify-between font-mono text-[10px] mb-0.5">
                                    <span className="truncate max-w-[160px] font-bold">{imp.feature}</span>
                                    <span>{imp.importance.toFixed(4)}</span>
                                  </div>
                                  <div className="w-full bg-surface-variant/30 h-1 border border-primary/20">
                                    <div
                                      className="h-full bg-primary"
                                      style={{ width: `${Math.min(imp.importance * 100, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab content 3: Scoring */}
                {selectedTab === 'score' && (
                  <div className="space-y-4">
                    <div>
                      <label className="font-headline font-bold text-xs uppercase block mb-2">Upload Fresh Dataset to Score</label>
                      <div className="border-2 border-dashed border-primary p-6 text-center bg-surface hover:bg-surface-variant/10 cursor-pointer relative transition-colors">
                        <input
                          type="file"
                          accept=".csv,.xlsx,.parquet,.json"
                          onChange={(e) => setScoreFile(e.target.files?.[0] || null)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Upload className="w-8 h-8 text-on-surface-variant mx-auto mb-2" />
                        <p className="font-headline font-bold text-xs uppercase truncate">
                          {scoreFile ? scoreFile.name : 'Select file to score'}
                        </p>
                        <p className="text-[10px] text-on-surface-variant mt-1">
                          CSV, Excel, Parquet, or JSON format
                        </p>
                      </div>
                    </div>

                    {scoreFile && (
                      <Button
                        variant="primary"
                        className="w-full"
                        onClick={handlePredict}
                        disabled={scoreLoading}
                      >
                        {scoreLoading ? 'Generating Predictions...' : 'Generate Predictions'}
                      </Button>
                    )}

                    {scoreResult && (
                      <div className="space-y-4">
                        <div className="bg-green-100 border-l-4 border-green-500 p-4 text-xs font-body text-green-950">
                          <p className="font-headline font-black text-[10px] uppercase mb-1 tracking-wider">Scoring Complete</p>
                          Successfully generated target predictions for {scoreResult.rows} rows.
                        </div>

                        <a
                          href={`${CONFIG.API_BASE_URL}/training/models/predictions/download?filename=${scoreResult.download_filename}`}
                          download
                          className="flex items-center justify-between p-3 border-2 border-primary bg-primary text-white hover:bg-primary-dark transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <Download className="w-5 h-5 text-white" />
                            <div className="text-left">
                              <p className="font-headline font-bold text-xs uppercase">Download Predictions</p>
                              <p className="text-[10px] opacity-80">Full dataset with prediction column appended</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform text-white" />
                        </a>

                        <div className="border border-primary p-3 bg-surface-variant/15">
                          <p className="font-headline font-black text-[10px] uppercase mb-2 tracking-wider text-on-surface-variant">Predictions Preview (Top 5 Rows)</p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left font-mono text-[10px]">
                              <thead>
                                <tr className="border-b border-primary/20">
                                  <th className="pb-1 font-bold">Prediction</th>
                                  {scoreResult.columns.filter((c: string) => c !== 'prediction' && c !== 'confidence').slice(0, 3).map((col: string) => (
                                    <th key={col} className="pb-1 pl-2 truncate max-w-[80px]" title={col}>{col}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {scoreResult.data.slice(0, 5).map((row: any, rIdx: number) => (
                                  <tr key={rIdx} className="border-b border-primary/10 last:border-0">
                                    <td className="py-1 font-bold text-primary">{row.prediction}</td>
                                    {scoreResult.columns.filter((c: string) => c !== 'prediction' && c !== 'confidence').slice(0, 3).map((col: string) => (
                                      <td key={col} className="py-1 pl-2 truncate max-w-[80px]">{String(row[col] ?? '')}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-surface border-2 border-primary border-dashed p-12 text-center neo-shadow">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant block mb-2">info</span>
                <span className="font-headline font-bold text-sm uppercase text-on-surface-variant">
                  Select a model to view details hub
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Comparison Modal */}
      {isCompareModalOpen && (
        <div className="fixed inset-0 bg-primary/25 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface border-4 border-primary p-8 w-full max-w-4xl neo-shadow max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 pb-2 border-b-2 border-primary">
              <h3 className="font-headline font-black text-2xl uppercase tracking-tight">Model Comparison Matrix</h3>
              <button
                onClick={() => setIsCompareModalOpen(false)}
                className="border-2 border-primary bg-surface w-8 h-8 flex items-center justify-center font-bold font-headline hover:bg-surface-variant"
              >
                ✕
              </button>
            </div>

            {compareLoading && <div className="text-center py-12 font-headline font-bold text-sm uppercase">Loading comparison matrix...</div>}

            {!compareLoading && compareData && (
              <div className="space-y-6">
                <div className="overflow-x-auto border-2 border-primary">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b-2 border-primary bg-surface-variant/20">
                        <th className="p-3 font-headline font-bold uppercase">Attribute</th>
                        {(() => {
                          const compareBestId = bestModelId(compareData.models)
                          const cBest = compareData.models.find((m: any) => m.id === compareBestId)
                          const cLabel = cBest?.metrics && 'r2' in cBest.metrics ? 'R²' : 'Accuracy'
                          return compareData.models.map((m: any) => (
                            <th key={m.id} className="p-3 font-headline font-black uppercase text-center border-l border-primary min-w-[200px]">
                              <div className="flex flex-col items-center gap-0.5">
                                <span>{m.name}</span>
                                {m.id === compareBestId && (
                                  <span className="text-[10px] font-headline normal-case font-bold text-yellow-700 flex items-center gap-1">
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
                      <tr className="border-b border-primary/30">
                        <td className="p-3 font-headline font-bold">Algorithm</td>
                        {compareData.models.map((m: any) => (
                          <td key={m.id} className="p-3 text-center border-l border-primary/30 font-body capitalize">
                            {m.algorithm.replace(/_/g, ' ')}
                          </td>
                        ))}
                      </tr>
                      
                      {/* Collect all metric names */}
                      {Array.from(new Set(compareData.models.flatMap((m: any) => Object.keys(m.metrics || {})))).map((metric: any) => (
                        <tr key={metric} className="border-b border-primary/30">
                          <td className="p-3 font-headline font-bold uppercase">{metric.replace(/_/g, ' ')}</td>
                          {compareData.models.map((m: any) => {
                            const val = m.metrics?.[metric]
                            return (
                              <td key={m.id} className="p-3 text-center border-l border-primary/30 font-mono font-bold">
                                {typeof val === 'number' ? val.toFixed(4) : val ?? '—'}
                              </td>
                            )
                          })}
                        </tr>
                      ))}

                      <tr className="border-b border-primary/30">
                        <td className="p-3 font-headline font-bold">Training Duration</td>
                        {compareData.models.map((m: any) => (
                          <td key={m.id} className="p-3 text-center border-l border-primary/30 font-mono">
                            {(m.training_time || 0).toFixed(2)}s
                          </td>
                        ))}
                      </tr>

                      <tr className="border-b border-primary/30">
                        <td className="p-3 font-headline font-bold">Scaling</td>
                        {compareData.models.map((m: any) => (
                          <td key={m.id} className="p-3 text-center border-l border-primary/30 capitalize font-body">
                            {m.pipeline?.scaling?.strategy ?? 'auto'}
                          </td>
                        ))}
                      </tr>

                      <tr className="border-b border-primary/30">
                        <td className="p-3 font-headline font-bold">Encoding</td>
                        {compareData.models.map((m: any) => (
                          <td key={m.id} className="p-3 text-center border-l border-primary/30 capitalize font-body">
                            {m.pipeline?.encoding?.strategy ?? 'auto'}
                          </td>
                        ))}
                      </tr>

                      <tr className="border-b border-primary/30">
                        <td className="p-3 font-headline font-bold">Class Imbalance</td>
                        {compareData.models.map((m: any) => (
                          <td key={m.id} className="p-3 text-center border-l border-primary/30 text-[10px] font-headline uppercase font-bold">
                            {m.pipeline?.use_smote && 'SMOTE'}
                            {m.pipeline?.use_class_weight && (m.pipeline?.use_smote ? ' + ' : '')}
                            {m.pipeline?.use_class_weight && 'Class Weights'}
                            {!m.pipeline?.use_smote && !m.pipeline?.use_class_weight && 'None'}
                          </td>
                        ))}
                      </tr>

                      <tr className="border-b border-primary/30">
                        <td className="p-3 font-headline font-bold">Feature Selection</td>
                        {compareData.models.map((m: any) => (
                          <td key={m.id} className="p-3 text-center border-l border-primary/30 font-body">
                            {m.pipeline?.feature_selection?.enabled ? '✓ Enabled' : '✗ Disabled'}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <div className="text-right">
                  <Button variant="primary" onClick={() => setIsCompareModalOpen(false)}>
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
