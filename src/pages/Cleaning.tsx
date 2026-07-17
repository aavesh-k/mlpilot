import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDatasets } from '../modules/datasets/hooks/useDatasets'
import { useCleaningSuggestions, useExecuteCleaning, useCleaningRuns, useCleaningReport } from '../modules/cleaning/hooks/useCleaning'
import { PageHeader } from '../shared/components/PageHeader'
import { EmptyState } from '../shared/components/EmptyState'
import { ErrorState } from '../shared/components/ErrorState'
import { LoadingSpinner, SkeletonTable } from '../shared/components/LoadingSpinner'
import { Button } from '../shared/components/ui/button'
import { Badge } from '../shared/components/ui/badge'
import { formatPercentage, formatDate } from '../shared/utils/format'
import { cleaningApi, type ColumnSuggestion, type CleaningLogEntry, type ColumnChange, type SnapshotStats } from '../core/api/cleaning.api'

type MissingStrategy = 'drop_row' | 'drop_column' | 'mean' | 'median' | 'mode' | 'knn' | 'ffill' | 'bfill'
type OutlierStrategy = 'winsorize' | 'remove' | 'leave'

const MISSING_LABELS: Record<MissingStrategy, string> = {
  drop_row: 'Drop Row',
  drop_column: 'Drop Column',
  mean: 'Mean Impute',
  median: 'Median Impute',
  mode: 'Mode Impute',
  knn: 'KNN Impute',
  ffill: 'Forward Fill',
  bfill: 'Back Fill',
}

const OUTLIER_LABELS: Record<OutlierStrategy, string> = {
  winsorize: 'Cap (Winsorize)',
  remove: 'Remove Row',
  leave: 'Leave As-Is',
}

export default function Cleaning() {
  const navigate = useNavigate()
  const { data: datasetsData, isLoading: dsLoading } = useDatasets()
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const [viewRunId, setViewRunId] = useState<string | undefined>()

  const { data: suggestions, isLoading: suggestionsLoading } = useCleaningSuggestions(selectedId)
  const { data: cleaningRuns } = useCleaningRuns(selectedId)
  const { data: reportDetail } = useCleaningReport(selectedId, viewRunId)
  const executeMutation = useExecuteCleaning()

  const datasets = datasetsData?.items ?? []
  const readyDatasets = datasets.filter((d) => d.status === 'ready')

  const [removeDupes, setRemoveDupes] = useState(true)
  const [fixDtypes, setFixDtypes] = useState(true)
  const [standardizeCat, setStandardizeCat] = useState(true)
  const [dropConst, setDropConst] = useState(true)
  const [missingOverrides, setMissingOverrides] = useState<Record<string, MissingStrategy>>({})
  const [outlierOverrides, setOutlierOverrides] = useState<Record<string, OutlierStrategy>>({})

  const handleSelectDataset = useCallback((id: string) => {
    setSelectedId(id)
    setViewRunId(undefined)
    setRemoveDupes(true)
    setFixDtypes(true)
    setStandardizeCat(true)
    setDropConst(true)
    setMissingOverrides({})
    setOutlierOverrides({})
  }, [])

  const handleRunCleaning = useCallback(() => {
    if (!selectedId || !suggestions) return
    const missingStrategies = suggestions.columns
      .filter((c) => c.missing_count > 0)
      .map((c) => ({
        column: c.name,
        strategy: missingOverrides[c.name] ?? c.suggested_missing_strategy,
      }))
    const outlierStrategies = suggestions.columns
      .filter((c) => c.outlier_count != null && c.outlier_count > 0)
      .map((c) => ({
        column: c.name,
        strategy: outlierOverrides[c.name] ?? c.suggested_outlier_strategy,
      }))
    executeMutation.mutate({
      datasetId: selectedId,
      config: {
        remove_duplicates: removeDupes,
        missing_strategies: missingStrategies,
        outlier_strategies: outlierStrategies,
        fix_dtype_issues: fixDtypes,
        standardize_categorical: standardizeCat,
        drop_constant_columns: dropConst,
      },
    })
  }, [selectedId, suggestions, missingOverrides, outlierOverrides, removeDupes, fixDtypes, standardizeCat, dropConst, executeMutation])

  const latestRun = cleaningRuns?.[0]
  const report = viewRunId ? reportDetail : (executeMutation.data?.report ?? null)
  const isRunning = executeMutation.isPending

  return (
    <div className="p-8 lg:p-12">
      <PageHeader title="Data" accent="Cleaning" subtitle="Inspect and fix your data — every change is logged and reversible." />

      {readyDatasets.length === 0 && !dsLoading && (
        <EmptyState icon="cleaning_services" title="No datasets ready" description="Upload a dataset first to clean it." />
      )}

      {readyDatasets.length > 0 && (
        <div className="flex gap-2 mb-8 flex-wrap">
          {readyDatasets.map((ds) => (
            <Button key={ds.id} variant={selectedId === ds.id ? 'primary' : 'ghost'} size="sm" onClick={() => handleSelectDataset(ds.id)}>
              {ds.name}
            </Button>
          ))}
        </div>
      )}

      {suggestionsLoading && <LoadingSpinner />}

      {suggestions && !isRunning && !report && (
        <CleaningConfigPanel
          suggestions={suggestions.columns}
          removeDupes={removeDupes}
          onToggleRemoveDupes={setRemoveDupes}
          fixDtypes={fixDtypes}
          onToggleFixDtypes={setFixDtypes}
          standardizeCat={standardizeCat}
          onToggleStandardizeCat={setStandardizeCat}
          dropConst={dropConst}
          onToggleDropConst={setDropConst}
          missingOverrides={missingOverrides}
          onSetMissingOverride={(col, s) => setMissingOverrides((prev) => ({ ...prev, [col]: s }))}
          outlierOverrides={outlierOverrides}
          onSetOutlierOverride={(col, s) => setOutlierOverrides((prev) => ({ ...prev, [col]: s }))}
          onRun={handleRunCleaning}
          isRunning={isRunning}
        />
      )}

      {isRunning && (
        <div className="bg-surface border-2 border-primary p-8 neo-shadow mt-8">
          <div className="flex items-center gap-4">
            <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="font-headline font-bold text-lg uppercase">Running cleaning...</span>
          </div>
        </div>
      )}

      {executeMutation.isError && (
        <ErrorState title="Cleaning failed" message={(executeMutation.error as Error)?.message ?? 'Unknown error'} onRetry={handleRunCleaning} />
      )}

      {report && !isRunning && (
        <CleaningReportView
          report={report}
          onViewRun={(runId) => {
            setViewRunId(runId)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          latestRun={latestRun}
          onNewCleaning={() => {
            setViewRunId(undefined)
            executeMutation.reset()
          }}
          onUseCleanedData={() => {
            const cleanedId = executeMutation.data?.dataset?.id
            if (cleanedId) navigate(`/datasets/${cleanedId}`)
          }}
          downloadUrl={selectedId && report?.run_id ? cleaningApi.getDownloadUrl(selectedId, report.run_id) : undefined}
        />
      )}

      {cleaningRuns && cleaningRuns.length > 0 && !report && (
        <div className="mt-8 bg-surface border-2 border-primary p-6">
          <h3 className="font-headline font-black text-lg uppercase mb-4">Previous Cleaning Runs</h3>
          <div className="space-y-2">
            {cleaningRuns.map((r) => (
              <div key={r.run_id} className="flex items-center justify-between py-3 border-b border-primary last:border-b-0">
                <div>
                  <span className="font-headline font-bold text-sm">{formatDate(r.created_at)}</span>
                  <span className="text-xs text-on-surface-variant ml-3">{r.before.row_count} → {r.after.row_count} rows, {r.step_count} steps</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setViewRunId(r.run_id)}>View Report</Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CleaningConfigPanel({
  suggestions, removeDupes, onToggleRemoveDupes, fixDtypes, onToggleFixDtypes,
  standardizeCat, onToggleStandardizeCat, dropConst, onToggleDropConst,
  missingOverrides, onSetMissingOverride, outlierOverrides, onSetOutlierOverride,
  onRun, isRunning,
}: {
  suggestions: ColumnSuggestion[]
  removeDupes: boolean; onToggleRemoveDupes: (v: boolean) => void
  fixDtypes: boolean; onToggleFixDtypes: (v: boolean) => void
  standardizeCat: boolean; onToggleStandardizeCat: (v: boolean) => void
  dropConst: boolean; onToggleDropConst: (v: boolean) => void
  missingOverrides: Record<string, MissingStrategy>
  onSetMissingOverride: (col: string, s: MissingStrategy) => void
  outlierOverrides: Record<string, OutlierStrategy>
  onSetOutlierOverride: (col: string, s: OutlierStrategy) => void
  onRun: () => void; isRunning: boolean
}) {
  const colsWithMissing = suggestions.filter((c) => c.missing_count > 0)
  const colsWithOutliers = suggestions.filter((c) => c.outlier_count != null && c.outlier_count > 0)

  return (
    <div className="space-y-6">
      <div className="bg-surface border-2 border-primary p-6 neo-shadow">
        <h3 className="font-headline font-black text-xl uppercase mb-4">Cleaning Steps</h3>
        <p className="text-sm text-on-surface-variant mb-6">Toggle each step on or off. Configure per-column strategies where available.</p>

        <div className="space-y-4">
          <ToggleStep
            label="Remove Duplicate Rows"
            description="Drop exact duplicate rows from the dataset"
            enabled={removeDupes}
            onToggle={onToggleRemoveDupes}
          />

          <div className="border-2 border-primary p-4">
            <ToggleStep
              label="Handle Missing Values"
              description={`${colsWithMissing.length} column(s) with missing data`}
              enabled={true}
              onToggle={() => {}}
              hideToggle
            />
            {colsWithMissing.length > 0 && (
              <div className="mt-4 space-y-2">
                {colsWithMissing.map((c) => {
                  const current = missingOverrides[c.name] ?? c.suggested_missing_strategy as MissingStrategy
                  return (
                    <div key={c.name} className="flex items-center gap-3 text-sm flex-wrap">
                      <span className="font-headline font-bold text-xs uppercase w-40 truncate">{c.name}</span>
                      <span className="text-xs text-on-surface-variant w-24">{c.missing_count} miss. ({formatPercentage(c.missing_pct)})</span>
                      <select
                        value={current}
                        onChange={(e) => onSetMissingOverride(c.name, e.target.value as MissingStrategy)}
                        className="border border-primary bg-surface px-2 py-1 text-xs font-body"
                      >
                        {Object.entries(MISSING_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}{k === c.suggested_missing_strategy ? ' (default)' : ''}</option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>
            )}
            {colsWithMissing.length === 0 && (
              <p className="text-green-700 font-headline font-bold text-xs mt-3">No missing values detected.</p>
            )}
          </div>

          <div className="border-2 border-primary p-4">
            <ToggleStep
              label="Handle Outliers"
              description={`${colsWithOutliers.length} numeric column(s) with outlier flags`}
              enabled={true}
              onToggle={() => {}}
              hideToggle
            />
            {colsWithOutliers.length > 0 && (
              <div className="mt-4 space-y-2">
                {colsWithOutliers.map((c) => {
                  const current = outlierOverrides[c.name] ?? c.suggested_outlier_strategy as OutlierStrategy
                  return (
                    <div key={c.name} className="flex items-center gap-3 text-sm flex-wrap">
                      <span className="font-headline font-bold text-xs uppercase w-40 truncate">{c.name}</span>
                      <span className="text-xs text-on-surface-variant w-24">{c.outlier_count} out. ({formatPercentage(c.outlier_pct ?? 0)})</span>
                      <select
                        value={current}
                        onChange={(e) => onSetOutlierOverride(c.name, e.target.value as OutlierStrategy)}
                        className="border border-primary bg-surface px-2 py-1 text-xs font-body"
                      >
                        {Object.entries(OUTLIER_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}{k === c.suggested_outlier_strategy ? ' (default)' : ''}</option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>
            )}
            {colsWithOutliers.length === 0 && (
              <p className="text-green-700 font-headline font-bold text-xs mt-3">No outliers detected.</p>
            )}
          </div>

          <ToggleStep
            label="Fix Data Type Issues"
            description="Strip currency symbols, remove thousand separators, parse dates"
            enabled={fixDtypes}
            onToggle={onToggleFixDtypes}
          />

          <ToggleStep
            label="Standardize Categorical Text"
            description="Trim whitespace, lowercase, flag near-duplicate categories (e.g. 'USA' vs 'U.S.A')"
            enabled={standardizeCat}
            onToggle={onToggleStandardizeCat}
          />

          <ToggleStep
            label="Drop Constant / Near-Constant Columns"
            description="Remove columns with 0 or 1 unique values, or >99% same value"
            enabled={dropConst}
            onToggle={onToggleDropConst}
          />
        </div>

        <div className="mt-8 flex gap-4">
          <Button variant="primary" size="lg" onClick={onRun} disabled={isRunning} className="w-full sm:w-auto">
            {isRunning ? 'Running...' : 'Run Cleaning'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function ToggleStep({ label, description, enabled, onToggle, hideToggle }: {
  label: string; description: string; enabled: boolean; onToggle: (v: boolean) => void; hideToggle?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <h4 className="font-headline font-bold text-sm uppercase">{label}</h4>
        <p className="text-xs text-on-surface-variant">{description}</p>
      </div>
      {!hideToggle && (
        <button
          onClick={() => onToggle(!enabled)}
          className={`w-12 h-6 border-2 border-primary relative transition-colors ${enabled ? 'bg-primary' : 'bg-surface-variant'}`}
        >
          <div className={`absolute top-0.5 w-4 h-4 bg-white border border-primary transition-all ${enabled ? 'left-6' : 'left-0.5'}`} />
        </button>
      )}
    </div>
  )
}

function CleaningReportView({ report, onViewRun, latestRun, onNewCleaning, onUseCleanedData, downloadUrl }: {
  report: {
    steps: CleaningLogEntry[]
    before: SnapshotStats
    after: SnapshotStats
    column_changes: ColumnChange[]
    run_id: string
    created_at: string
  }
  onViewRun: (runId: string) => void
  latestRun?: { run_id: string }
  onNewCleaning: () => void
  onUseCleanedData?: () => void
  downloadUrl?: string
}) {
  const stepBadge = (step: string) => {
    const variants: Record<string, 'success' | 'warning' | 'info' | 'danger'> = {
      remove_duplicates: 'success',
      missing_values: 'warning',
      outliers: 'warning',
      dtype_fix: 'info',
      categorical_clean: 'info',
      drop_constant: 'danger',
    }
    return <Badge variant={variants[step] ?? 'info'}>{step.replace(/_/g, ' ')}</Badge>
  }

  return (
    <div className="space-y-8 mt-8">
      <div className="bg-surface border-2 border-primary p-6 neo-shadow">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="font-headline font-black text-xl uppercase">Cleaning Report</h3>
            <p className="text-sm text-on-surface-variant">Run completed · {report.steps.length} steps · {formatDate(report.created_at)}</p>
          </div>
          <div className="flex gap-2">
            {latestRun && report.run_id !== latestRun.run_id && (
              <Button variant="ghost" size="sm" onClick={() => onViewRun(latestRun.run_id)}>Latest Run</Button>
            )}
            <Button variant="primary" size="sm" onClick={onNewCleaning}>New Cleaning</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <SnapshotCard label="Rows" before={report.before.row_count} after={report.after.row_count} />
          <SnapshotCard label="Columns" before={report.before.column_count} after={report.after.column_count} />
          <SnapshotCard label="Missing Cells" before={report.before.total_missing} after={report.after.total_missing} />
          <SnapshotCard label="Duplicates" before={report.before.duplicate_count} after={report.after.duplicate_count} />
        </div>

        <h4 className="font-headline font-bold text-sm uppercase mb-4">Step Log</h4>
        <div className="space-y-3">
          {report.steps.map((log, i) => (
            <div key={i} className="border border-primary p-4 bg-surface-variant/20">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-primary text-white font-headline font-bold text-xs flex items-center justify-center">{i + 1}</span>
                  {stepBadge(log.step)}
                  <span className="font-headline font-bold text-sm uppercase">{log.description}</span>
                </div>
                <span className="text-xs font-headline font-bold text-on-surface-variant">
                  {log.rows_affected > 0 && `${log.rows_affected.toLocaleString()} rows`}
                  {log.rows_affected > 0 && log.cells_affected > 0 && ' · '}
                  {log.cells_affected > 0 && `${log.cells_affected.toLocaleString()} cells`}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant ml-10">{log.details}</p>
            </div>
          ))}
        </div>

        <h4 className="font-headline font-bold text-sm uppercase mt-8 mb-4">Column Changes</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b-2 border-primary">
                <th className="p-2 font-headline font-bold uppercase">Column</th>
                <th className="p-2 font-headline font-bold uppercase">Dtype</th>
                <th className="p-2 font-headline font-bold uppercase">Missing</th>
                <th className="p-2 font-headline font-bold uppercase">Changes</th>
              </tr>
            </thead>
            <tbody>
              {report.column_changes.map((cc) => (
                <tr key={cc.column} className="border-b border-primary last:border-b-0 hover:bg-surface-variant/30">
                  <td className="p-2 font-headline font-bold">{cc.column}</td>
                  <td className="p-2 font-body">
                    {cc.before_dtype !== cc.after_dtype ? (
                      <span><span className="line-through text-on-surface-variant">{cc.before_dtype}</span> → {cc.after_dtype}</span>
                    ) : (
                      cc.before_dtype
                    )}
                  </td>
                  <td className="p-2 font-body">
                    {cc.before_missing > 0 || cc.after_missing > 0 ? (
                      <span>{cc.before_missing.toLocaleString()} → {cc.after_missing.toLocaleString()}</span>
                    ) : (
                      <span className="text-green-700">0</span>
                    )}
                  </td>
                  <td className="p-2 font-body">
                    {cc.changes.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {cc.changes.map((ch, j) => (
                          <Badge key={j} variant="info">{ch}</Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-on-surface-variant">Unchanged</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {report.after.row_count > 0 && (
          <div className="mt-8 flex gap-4">
            <Button variant="primary" onClick={onUseCleanedData}>
              Use Cleaned Data
            </Button>
            {downloadUrl && (
              <Button variant="ghost" onClick={() => window.open(downloadUrl, '_blank')}>
                Download CSV
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function SnapshotCard({ label, before, after }: { label: string; before: number; after: number }) {
  const diff = after - before
  const pct = before > 0 ? Math.round((diff / before) * 100) : 0
  return (
    <div className="bg-surface-variant border-2 border-primary p-4">
      <span className="block font-headline text-[10px] font-bold uppercase text-on-surface-variant">{label}</span>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-2xl font-headline font-black">{after.toLocaleString()}</span>
        <span className="text-xs font-headline font-bold text-on-surface-variant">from {before.toLocaleString()}</span>
      </div>
      {diff !== 0 && (
        <span className={`text-xs font-headline font-bold ${diff < 0 ? 'text-green-700' : 'text-secondary'}`}>
          {diff < 0 ? '↓' : '↑'} {Math.abs(pct)}%
        </span>
      )}
    </div>
  )
}
