import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDatasets } from '../modules/datasets/hooks/useDatasets'
import { useEDA } from '../modules/datasets/hooks/useEDA'
import { edaApi, type PotentialTarget } from '../core/api/eda.api'
import { PageHeader } from '../shared/components/PageHeader'
import { EmptyState } from '../shared/components/EmptyState'
import { ErrorState } from '../shared/components/ErrorState'
import { Button } from '../shared/components/ui/button'
import { Badge } from '../shared/components/ui/badge'
import type { EDAReport, MissingRow, NumericSummaryRow, OutlierRow, CategoricalSummaryRow, DistributionPlot, Finding, DataTypeIssue, ConstantColumn, HighCorrelation, MissingnessMatrix } from '../core/api/eda.api'

export default function EDA() {
  const [searchParams] = useSearchParams()
  const paramDatasetId = searchParams.get('datasetId')
  const { data: datasetsData, isLoading: dsLoading } = useDatasets()
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const { status, report, isProcessing } = useEDA(selectedId)

  const datasets = datasetsData?.items ?? []
  const readyDatasets = datasets.filter((d) => d.status === 'ready')

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id)
  }, [])

  useEffect(() => {
    if (!selectedId && readyDatasets.length > 0) {
      const match = paramDatasetId && readyDatasets.some((d) => d.id === paramDatasetId)
      setSelectedId(match ? paramDatasetId! : readyDatasets[0].id)
    }
  }, [readyDatasets, selectedId, paramDatasetId])

  useEffect(() => {
    if (selectedId && status?.status === 'not_started') {
      edaApi.startEDA(selectedId)
    }
  }, [selectedId, status?.status])

  const progressPct = status ? Math.round((status.progress ?? 0) * 100) : 0

  return (
    <div className="p-8 lg:p-12">
      <PageHeader title="Exploratory" accent="Data Analysis" subtitle="Automated insights from your dataset." />

      {readyDatasets.length === 0 && !dsLoading && (
        <EmptyState icon="query_stats" title="No datasets ready" description="Upload and process a dataset first to run EDA." />
      )}

      {readyDatasets.length > 0 && (
        <div className="flex gap-2 mb-8 flex-wrap">
          {readyDatasets.map((ds) => (
            <Button key={ds.id} variant={selectedId === ds.id ? 'primary' : 'ghost'} size="sm" onClick={() => handleSelect(ds.id)}>
              {ds.name}
            </Button>
          ))}
        </div>
      )}

      {isProcessing && (
        <div className="bg-surface border-2 border-primary p-8 mb-8">
          <h3 className="font-headline font-black text-lg uppercase mb-4">Analyzing Dataset...</h3>
          <div className="h-4 border-2 border-primary bg-surface-variant relative">
            <div className="h-full bg-secondary transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="mt-2 text-sm text-on-surface-variant font-headline font-bold">{status?.step ?? 'Starting...'} ({progressPct}%)</p>
        </div>
      )}

      {status?.status === 'failed' && (
        <ErrorState title="EDA Failed" message={status.error ?? 'An error occurred during analysis.'} onRetry={() => selectedId && edaApi.startEDA(selectedId)} />
      )}

      {report && !isProcessing && <EDAReportView report={report} />}
    </div>
  )
}

function EDAReportView({ report }: { report: EDAReport }) {
  return (
    <div className="space-y-10">
      <AutomatedInsightsSection findings={report.findings} />
      <DatasetOverviewSection report={report} />
      <HeadTailSection head={report.head} tail={report.tail} columns={report.columns} />
      <MissingnessSection missingness={report.missingness} matrix={report.missingness_matrix} />
      <NumericSummarySection summary={report.numeric_summary} />
      <OutliersSection outliers={report.outliers} />
      <CategoricalSection categories={report.categorical_summary} />
      <CorrelationSection matrix={report.correlation_matrix} highPairs={report.high_correlations} />
      <PotentialTargetsSection targets={report.potential_targets ?? []} />
      <DistributionSection plots={report.distribution_plots} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DuplicatesCard duplicates={report.duplicates} totalRows={report.shape.rows} />
        <MemoryCard memory={report.memory_usage} />
        <ShapeCard shape={report.shape} />
      </div>
      <DataTypeIssuesSection issues={report.data_type_issues} />
      <ConstantColumnsSection columns={report.constant_columns} />
      <FindingsSection findings={report.findings} />
    </div>
  )
}

function AutomatedInsightsSection({ findings }: { findings: any[] }) {
  if (!findings || findings.length === 0) return null

  // Sort findings by severity priority: critical -> warning -> info
  const sortedFindings = [...findings].sort((a, b) => {
    const priority = { critical: 0, warning: 1, info: 2 }
    const pa = priority[a.severity as keyof typeof priority] ?? 3
    const pb = priority[b.severity as keyof typeof priority] ?? 3
    return pa - pb
  })

  return (
    <div className="bg-surface border-2 border-primary p-6 neo-shadow space-y-4">
      <h3 className="font-headline font-black text-xl uppercase tracking-tight flex items-center gap-2">
        <span>💡 Automated Data Science Insights</span>
      </h3>
      <p className="text-xs font-body text-on-surface-variant">
        Automated recommendations generated from dataset characteristics, outliers, correlations, and skewness profile.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedFindings.map((finding, idx) => {
          const isCritical = finding.severity === 'critical'
          const isWarning = finding.severity === 'warning'
          const badgeVariant = isCritical ? 'danger' : isWarning ? 'warning' : 'info'
          const borderClass = isCritical ? 'border-red-500 bg-red-50/50' : isWarning ? 'border-amber-500 bg-amber-50/50' : 'border-blue-500 bg-blue-50/50'
          const textClass = isCritical ? 'text-red-950' : isWarning ? 'text-amber-950' : 'text-blue-950'

          return (
            <div key={idx} className={`border-2 p-4 neo-shadow-sm flex flex-col justify-between ${borderClass} ${textClass}`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-headline font-black text-sm uppercase tracking-tight">{finding.title}</span>
                  <Badge variant={badgeVariant} className="text-[9px] font-bold uppercase">{finding.severity}</Badge>
                </div>
                <p className="text-xs font-body mb-3">{finding.description}</p>
              </div>
              {finding.recommendation && (
                <div className="mt-auto pt-3 border-t border-primary/10">
                  <p className="font-headline font-bold text-[9px] uppercase tracking-wider text-on-surface-variant mb-1">Recommendation</p>
                  <p className="text-[11px] font-body italic font-bold">{finding.recommendation}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DatasetOverviewSection({ report }: { report: EDAReport }) {
  return (
    <div className="bg-surface border-2 border-primary p-6">
      <h3 className="font-headline font-black text-xl uppercase mb-4">Dataset Overview</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Rows" value={report.shape.rows.toLocaleString()} />
        <StatCard label="Columns" value={report.shape.columns.toLocaleString()} />
        <StatCard label="Memory" value={report.memory_usage.formatted} />
        <StatCard label="Computed" value={new Date(report.computed_at).toLocaleDateString()} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b-2 border-primary">
              <th className="p-3 font-headline font-bold text-xs uppercase text-on-surface-variant">#</th>
              <th className="p-3 font-headline font-bold text-xs uppercase text-on-surface-variant">Column</th>
              <th className="p-3 font-headline font-bold text-xs uppercase text-on-surface-variant">Data Type</th>
            </tr>
          </thead>
          <tbody>
            {report.columns.map((col) => (
              <tr key={col.name} className="border-b border-primary last:border-b-0 hover:bg-surface-variant/30 transition-colors">
                <td className="p-3 font-body text-sm text-on-surface-variant">{col.ordinal_position}</td>
                <td className="p-3 font-headline font-bold text-sm">{col.name}</td>
                <td className="p-3 font-body text-sm"><Badge variant="info">{col.dtype}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-variant border-2 border-primary p-4">
      <span className="block font-headline text-[10px] font-bold uppercase text-on-surface-variant">{label}</span>
      <span className="text-2xl font-headline font-black">{value}</span>
    </div>
  )
}

function HeadTailSection({ head, tail, columns }: { head: Record<string, unknown>[]; tail: Record<string, unknown>[]; columns: { name: string }[] }) {
  if (head.length === 0) return null
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-surface border-2 border-primary p-6 overflow-x-auto">
        <h3 className="font-headline font-black text-lg uppercase mb-3">Head (first 10 rows)</h3>
        <DataTable rows={head} columns={columns.map((c) => c.name)} />
      </div>
      <div className="bg-surface border-2 border-primary p-6 overflow-x-auto">
        <h3 className="font-headline font-black text-lg uppercase mb-3">Tail (last 5 rows)</h3>
        <DataTable rows={tail} columns={columns.map((c) => c.name)} />
      </div>
    </div>
  )
}

function DataTable({ rows, columns }: { rows: Record<string, unknown>[]; columns: string[] }) {
  if (rows.length === 0) return <p className="text-on-surface-variant text-sm">No data</p>
  return (
    <table className="w-full text-left text-xs">
      <thead>
        <tr className="border-b-2 border-primary">
          {columns.map((col) => (
            <th key={col} className="p-2 font-headline font-bold uppercase text-on-surface-variant whitespace-nowrap">{col}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-primary last:border-b-0 hover:bg-surface-variant/30">
            {columns.map((col) => (
              <td key={col} className="p-2 font-body whitespace-nowrap max-w-[200px] truncate">
                {formatCellValue(row[col])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function formatCellValue(val: unknown): string {
  if (val === null || val === undefined) return '—'
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return val.toLocaleString()
    return val.toFixed(4)
  }
  return String(val)
}

function MissingnessSection({ missingness, matrix }: { missingness: MissingRow[]; matrix: MissingnessMatrix }) {
  return (
    <div className="bg-surface border-2 border-primary p-6">
      <h3 className="font-headline font-black text-xl uppercase mb-4">Missing Values</h3>
      {missingness.length === 0 ? (
        <p className="text-green-700 font-headline font-bold">No missing values detected.</p>
      ) : (
        <>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-primary">
                  <th className="p-3 font-headline font-bold text-xs uppercase text-on-surface-variant">Column</th>
                  <th className="p-3 font-headline font-bold text-xs uppercase text-on-surface-variant">Missing Count</th>
                  <th className="p-3 font-headline font-bold text-xs uppercase text-on-surface-variant">Missing %</th>
                  <th className="p-3 font-headline font-bold text-xs uppercase text-on-surface-variant">Bar</th>
                </tr>
              </thead>
              <tbody>
                {missingness.map((m) => {
                  const pct = m.percent * 100
                  return (
                    <tr key={m.column} className="border-b border-primary last:border-b-0 hover:bg-surface-variant/30">
                      <td className="p-3 font-headline font-bold text-sm">{m.column}</td>
                      <td className="p-3 font-body text-sm">{m.count.toLocaleString()}</td>
                      <td className="p-3 font-body text-sm">{pct.toFixed(1)}%</td>
                      <td className="p-3">
                        <div className="h-3 w-full border border-primary bg-surface-variant relative">
                          <div className="h-full bg-secondary" style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <h4 className="font-headline font-bold text-sm uppercase mb-2">Missingness Heatmap (first {matrix.rows} rows)</h4>
          <div className="overflow-x-auto">
            <MissingnessHeatmap matrix={matrix} />
          </div>
        </>
      )}
    </div>
  )
}

function MissingnessHeatmap({ matrix }: { matrix: MissingnessMatrix }) {
  const cols = matrix.columns
  const rows = Math.min(matrix.rows, 50)
  if (rows === 0 || cols.length === 0) return <p className="text-on-surface-variant text-sm">No data</p>
  const cellSize = Math.max(4, Math.min(12, 600 / cols.length))
  return (
    <svg width={cols.length * cellSize + 120} height={rows * cellSize + 40} className="border border-primary">
      {cols.map((col, ci) => (
        <text key={`label-${ci}`} x={ci * cellSize + 4} y={rows * cellSize + 16} fontSize="8" fill="currentColor" transform={`rotate(-45, ${ci * cellSize + 4}, ${rows * cellSize + 16})`}>
          {col.length > 10 ? col.slice(0, 10) + '…' : col}
        </text>
      ))}
      {Array.from({ length: rows }).map((_, ri) =>
        cols.map((col, ci) => {
          const val = matrix.data[col]?.[ri] ?? 0
          return (
            <rect
              key={`${ci}-${ri}`}
              x={ci * cellSize + 2}
              y={ri * cellSize + 2}
              width={cellSize - 2}
              height={cellSize - 2}
              fill={val === 1 ? '#dc2626' : '#e5e7eb'}
              stroke="#d1d5db"
              strokeWidth={0.5}
            />
          )
        })
      )}
    </svg>
  )
}

function NumericSummarySection({ summary }: { summary: NumericSummaryRow[] }) {
  if (summary.length === 0) return null
  return (
    <div className="bg-surface border-2 border-primary p-6 overflow-x-auto">
      <h3 className="font-headline font-black text-xl uppercase mb-4">Numeric Summary</h3>
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b-2 border-primary">
            {['Column', 'Count', 'Mean', 'Median', 'Std', 'Min', 'Max', 'Q1', 'Q3', 'IQR', 'Skewness', 'Kurtosis'].map((h) => (
              <th key={h} className="p-2 font-headline font-bold uppercase text-on-surface-variant whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {summary.map((row) => (
            <tr key={row.column} className="border-b border-primary last:border-b-0 hover:bg-surface-variant/30">
              <td className="p-2 font-headline font-bold whitespace-nowrap">{row.column}</td>
              <td className="p-2 font-body">{row.count.toLocaleString()}</td>
              <td className="p-2 font-body">{row.mean?.toFixed(4) ?? '—'}</td>
              <td className="p-2 font-body">{row.median?.toFixed(4) ?? '—'}</td>
              <td className="p-2 font-body">{row.std?.toFixed(4) ?? '—'}</td>
              <td className="p-2 font-body">{row.min?.toFixed(2) ?? '—'}</td>
              <td className="p-2 font-body">{row.max?.toFixed(2) ?? '—'}</td>
              <td className="p-2 font-body">{row.q1?.toFixed(4) ?? '—'}</td>
              <td className="p-2 font-body">{row.q3?.toFixed(4) ?? '—'}</td>
              <td className="p-2 font-body">{row.iqr?.toFixed(4) ?? '—'}</td>
              <td className="p-2 font-body">{row.skewness?.toFixed(4) ?? '—'}</td>
              <td className="p-2 font-body">{row.kurtosis?.toFixed(4) ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function OutliersSection({ outliers }: { outliers: OutlierRow[] }) {
  if (outliers.length === 0) return null
  return (
    <div className="bg-surface border-2 border-primary p-6">
      <h3 className="font-headline font-black text-xl uppercase mb-4">Outlier Detection (IQR 1.5x Rule)</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {outliers.map((o) => {
          const pct = o.percent * 100
          return (
            <div key={o.column} className="border-2 border-primary p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-headline font-bold text-sm uppercase">{o.column}</h4>
                <Badge variant={pct > 5 ? 'warning' : 'info'}>{o.count} outliers ({pct.toFixed(1)}%)</Badge>
              </div>
              <div className="text-xs text-on-surface-variant mb-3">
                Fences: [{o.lower_bound?.toFixed(2) ?? '—'}, {o.upper_bound?.toFixed(2) ?? '—'}]
              </div>
              <BoxPlotSVG stats={o.stats} width={240} height={40} />
              <div className="flex justify-between text-[10px] font-headline font-bold text-on-surface-variant mt-1">
                <span>{o.stats.min?.toFixed(1) ?? '—'}</span>
                <span>Median: {o.stats.median?.toFixed(1) ?? '—'}</span>
                <span>{o.stats.max?.toFixed(1) ?? '—'}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BoxPlotSVG({ stats, width, height }: { stats: { min: number | null; q1: number | null; median: number | null; q3: number | null; max: number | null }; width: number; height: number }) {
  const { min, q1, median, q3, max } = stats
  if (min == null || q1 == null || median == null || q3 == null || max == null) return null
  const range = max - min || 1
  const scale = (v: number) => ((v - min) / range) * (width - 20) + 10
  const cy = height / 2
  return (
    <svg width={width} height={height} className="w-full">
      <line x1={scale(min)} y1={cy} x2={scale(max)} y2={cy} stroke="currentColor" strokeWidth={2} />
      <line x1={scale(min)} y1={cy - 8} x2={scale(min)} y2={cy + 8} stroke="currentColor" strokeWidth={2} />
      <line x1={scale(max)} y1={cy - 8} x2={scale(max)} y2={cy + 8} stroke="currentColor" strokeWidth={2} />
      <rect x={scale(q1)} y={cy - 10} width={scale(q3) - scale(q1)} height={20} fill="rgba(0,85,255,0.3)" stroke="currentColor" strokeWidth={2} />
      <line x1={scale(median)} y1={cy - 12} x2={scale(median)} y2={cy + 12} stroke="#dc2626" strokeWidth={2} />
    </svg>
  )
}

function CategoricalSection({ categories }: { categories: CategoricalSummaryRow[] }) {
  if (categories.length === 0) return null
  return (
    <div className="bg-surface border-2 border-primary p-6">
      <h3 className="font-headline font-black text-xl uppercase mb-4">Categorical Columns</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((cat) => (
          <div key={cat.column} className="border-2 border-primary p-4">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-headline font-bold text-sm uppercase">{cat.column}</h4>
              <Badge variant={cat.high_cardinality ? 'warning' : 'info'}>
                {cat.cardinality.toLocaleString()} unique
              </Badge>
            </div>
            {cat.high_cardinality && (
              <p className="text-xs text-on-surface-variant mb-2">High cardinality — may be an ID or free-text column.</p>
            )}
            {cat.top_values.length > 0 && (
              <div className="space-y-1">
                {cat.top_values.map(([val, count], i) => {
                  const maxCount = cat.top_values[0][1]
                  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="w-1/2 truncate font-body">{val}</span>
                      <div className="flex-1 h-3 border border-primary bg-surface-variant relative">
                        <div className="h-full bg-tertiary" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-16 text-right font-headline font-bold">{count.toLocaleString()}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function CorrelationSection({ matrix, highPairs }: { matrix: Record<string, Record<string, number>>; highPairs: HighCorrelation[] }) {
  const cols = Object.keys(matrix)
  if (cols.length < 2) {
    return (
      <div className="bg-surface border-2 border-primary p-6">
        <h3 className="font-headline font-black text-xl uppercase mb-4">Correlation Matrix</h3>
        <p className="text-on-surface-variant text-sm">Not enough numeric columns for correlation analysis.</p>
      </div>
    )
  }
  const size = Math.min(40, Math.max(20, Math.floor(600 / cols.length)))
  return (
    <div className="bg-surface border-2 border-primary p-6">
      <h3 className="font-headline font-black text-xl uppercase mb-4">Correlation Matrix (Pearson)</h3>
      <div className="overflow-x-auto mb-6">
        <svg width={cols.length * size + 120} height={cols.length * size + 40}>
          {cols.map((col, i) => (
            <text key={`row-${i}`} x={0} y={i * size + size / 2 + 4} fontSize="10" fill="currentColor" textAnchor="end" className="font-headline font-bold">
              {col.length > 8 ? col.slice(0, 8) + '…' : col}
            </text>
          ))}
          {cols.map((col, j) => (
            <text key={`col-${j}`} x={j * size + size / 2 + 100} y={12} fontSize="10" fill="currentColor" textAnchor="middle" transform={`rotate(-45, ${j * size + size / 2 + 100}, 12)`}>
              {col.length > 8 ? col.slice(0, 8) + '…' : col}
            </text>
          ))}
          {cols.map((col_a, i) =>
            cols.map((col_b, j) => {
              const val = matrix[col_a]?.[col_b] ?? 0
              const intensity = Math.abs(val)
              const r = intensity * 0.8 + 0.1
              const isHigh = Math.abs(val) > 0.85 && col_a !== col_b
              return (
                <rect
                  key={`${i}-${j}`}
                  x={j * size + 100}
                  y={i * size + 20}
                  width={size - 1}
                  height={size - 1}
                  fill={val >= 0 ? `rgba(0,85,255,${r})` : `rgba(220,38,38,${r})`}
                  stroke={isHigh ? '#f59e0b' : '#d1d5db'}
                  strokeWidth={isHigh ? 2 : 0.5}
                />
              )
            })
          )}
        </svg>
      </div>
      <div className="flex gap-4 text-[10px] font-headline font-bold text-on-surface-variant mb-4">
        <span>Red = negative</span>
        <span>Blue = positive</span>
        <span>Darker = stronger</span>
        <span>Yellow border = |r| &gt; 0.85</span>
      </div>
      {highPairs.length > 0 && (
        <>
          <h4 className="font-headline font-bold text-sm uppercase mb-2">Potential Multicollinearity (|r| &gt; 0.85)</h4>
          <div className="space-y-1">
            {highPairs.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-sm font-body">
                <Badge variant="warning">{p.value.toFixed(4)}</Badge>
                <span>{p.col_a} ↔ {p.col_b}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function DistributionSection({ plots }: { plots: DistributionPlot[] }) {
  if (plots.length === 0) return null
  return (
    <div className="bg-surface border-2 border-primary p-6">
      <h3 className="font-headline font-black text-xl uppercase mb-4">Distribution Plots (Histogram + KDE)</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {plots.map((plot) => (
          <div key={plot.column} className="border-2 border-primary p-4">
            <h4 className="font-headline font-bold text-sm uppercase mb-2">{plot.column}</h4>
            <HistogramKDEChart plot={plot} width={300} height={120} />
          </div>
        ))}
      </div>
    </div>
  )
}

function HistogramKDEChart({ plot, width, height }: { plot: DistributionPlot; width: number; height: number }) {
  const { bins, counts } = plot.histogram
  const kde = plot.kde
  if (counts.length === 0) return <p className="text-xs text-on-surface-variant">Insufficient data</p>
  const maxCount = Math.max(...counts, 1)
  const binWidth = width / bins.length
  const histHeight = height * 0.7
  const pad = 4
  const scaleH = (v: number) => (v / maxCount) * histHeight
  const dataMin = bins[0]
  const dataMax = bins[bins.length - 1]
  const dataRange = dataMax - dataMin || 1
  const scaleX = (v: number) => ((v - dataMin) / dataRange) * (width - pad * 2) + pad
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
      {counts.map((c, i) => (
        <rect
          key={i}
          x={scaleX(bins[i])}
          y={histHeight - scaleH(c)}
          width={Math.max(binWidth - 1, 1)}
          height={scaleH(c)}
          fill="rgba(0,85,255,0.3)"
          stroke="rgba(0,85,255,0.6)"
          strokeWidth={0.5}
        />
      ))}
      {kde.y.length > 1 && (
        <polyline
          points={kde.x.map((x, i) => `${scaleX(x)},${histHeight - (kde.y[i] / Math.max(...kde.y, 0.001)) * histHeight}`).join(' ')}
          fill="none"
          stroke="#dc2626"
          strokeWidth={2}
        />
      )}
    </svg>
  )
}

function DuplicatesCard({ duplicates, totalRows }: { duplicates: { count: number; percent: number }; totalRows: number }) {
  const pct = duplicates.percent * 100
  return (
    <div className="bg-surface border-2 border-primary p-6">
      <h3 className="font-headline font-black text-sm uppercase mb-2">Duplicate Rows</h3>
      {duplicates.count > 0 ? (
        <>
          <span className="text-3xl font-headline font-black">{duplicates.count.toLocaleString()}</span>
          <span className="block text-sm text-on-surface-variant font-body">{pct.toFixed(2)}% of {totalRows.toLocaleString()} rows</span>
          <div className="h-3 w-full border border-primary bg-surface-variant mt-2">
            <div className="h-full bg-secondary" style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
        </>
      ) : (
        <p className="text-green-700 font-headline font-bold">No duplicate rows found.</p>
      )}
    </div>
  )
}

function MemoryCard({ memory }: { memory: { total_bytes: number; formatted: string } }) {
  return (
    <div className="bg-surface border-2 border-primary p-6">
      <h3 className="font-headline font-black text-sm uppercase mb-2">Memory Usage</h3>
      <span className="text-3xl font-headline font-black">{memory.formatted}</span>
      <span className="block text-sm text-on-surface-variant font-body">{memory.total_bytes.toLocaleString()} bytes</span>
    </div>
  )
}

function ShapeCard({ shape }: { shape: { rows: number; columns: number } }) {
  return (
    <div className="bg-surface border-2 border-primary p-6">
      <h3 className="font-headline font-black text-sm uppercase mb-2">Dataset Shape</h3>
      <span className="text-3xl font-headline font-black">{shape.rows.toLocaleString()} × {shape.columns}</span>
      <span className="block text-sm text-on-surface-variant font-body">rows × columns</span>
    </div>
  )
}

function DataTypeIssuesSection({ issues }: { issues: DataTypeIssue[] }) {
  if (issues.length === 0) return null
  return (
    <div className="bg-surface border-2 border-primary p-6">
      <h3 className="font-headline font-black text-xl uppercase mb-4">Data Type Sanity Checks</h3>
      <div className="space-y-4">
        {issues.map((issue) => (
          <div key={issue.column} className="border-2 border-primary p-4">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="warning">{issue.column}</Badge>
            </div>
            <p className="text-sm font-body mb-2">{issue.issue}</p>
            {issue.sample_values.length > 0 && (
              <div className="text-xs text-on-surface-variant">
                <span className="font-headline font-bold">Sample values: </span>
                {issue.sample_values.map((v, i) => (
                  <code key={i} className="bg-surface-variant px-1 mx-0.5 border border-primary">{v}</code>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ConstantColumnsSection({ columns }: { columns: ConstantColumn[] }) {
  if (columns.length === 0) return null
  return (
    <div className="bg-surface border-2 border-primary p-6">
      <h3 className="font-headline font-black text-xl uppercase mb-4">Constant / Near-Constant Columns</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {columns.map((col) => (
          <div key={col.column} className="border-2 border-primary p-4">
            <h4 className="font-headline font-bold text-sm uppercase mb-1">{col.column}</h4>
            <p className="text-xs font-body">
              {col.percent_same === 1.0 ? 'Constant column' : `${(col.percent_same * 100).toFixed(1)}% same value`}
            </p>
            <p className="text-xs text-on-surface-variant font-headline font-bold mt-1">
              Value: {col.unique_value != null ? String(col.unique_value) : '—'}
            </p>
            <Badge variant="info" className="mt-2">Candidate for removal</Badge>
          </div>
        ))}
      </div>
    </div>
  )
}

function FindingsSection({ findings }: { findings: Finding[] }) {
  if (findings.length === 0) {
    return (
      <div className="bg-surface border-2 border-primary p-6">
        <h3 className="font-headline font-black text-xl uppercase mb-4">Key Findings</h3>
        <p className="text-green-700 font-headline font-bold">No significant findings detected. Dataset looks clean!</p>
      </div>
    )
  }
  return (
    <div className="bg-surface border-2 border-primary p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="font-headline font-black text-xl uppercase">Key Findings</h3>
          <p className="text-on-surface-variant text-sm">Auto-generated insights: {findings.length} total</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {findings.map((f, i) => (
          <div key={i} className="border-2 border-primary p-4 hover:bg-surface-variant/30 transition-colors">
            <Badge variant={f.severity === 'critical' ? 'danger' : f.severity === 'warning' ? 'warning' : 'info'}>
              {f.severity}
            </Badge>
            <h4 className="font-headline font-bold text-sm uppercase mt-2 mb-1">{f.title}</h4>
            <p className="text-sm text-on-surface-variant">{f.description}</p>
            {f.affected_columns.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {f.affected_columns.map((col) => (
                  <Badge key={col} variant="default">{col}</Badge>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function PotentialTargetsSection({ targets }: { targets: PotentialTarget[] }) {
  if (!targets || targets.length === 0) return null
  return (
    <div className="bg-surface border-2 border-primary p-6 md:p-8 neo-shadow">
      <h3 className="font-headline font-black text-xl uppercase tracking-tight mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-secondary">flag</span>
        Potential Target Columns &amp; Class Balance
      </h3>
      <p className="text-xs font-body text-on-surface-variant mb-4">
        Columns that look like classification targets, with their class distribution and imbalance ratio (AC-02).
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {targets.map((t) => (
          <div
            key={t.column}
            className={`border-2 p-4 neo-shadow-sm ${t.is_imbalanced ? 'border-amber-500 bg-amber-50/50' : 'border-primary/40'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-headline font-black text-sm uppercase">{t.column}</span>
              <Badge variant={t.is_imbalanced ? 'warning' : 'success'}>
                {t.is_imbalanced ? `Imbalanced ${t.imbalance_ratio}x` : 'Balanced'}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {Object.entries(t.distribution ?? {}).slice(0, 8).map(([k, v]: [string, number]) => (
                <span key={k} className="text-[10px] font-headline font-bold bg-surface-variant px-1.5 py-0.5">
                  {String(k)}: {v}
                </span>
              ))}
            </div>
            <p className="text-[11px] font-body text-on-surface-variant">
              {t.class_count} classes · majority {Math.round((t.majority_pct ?? 0) * 100)}% / minority{' '}
              {Math.round((t.minority_pct ?? 0) * 100)}%
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
