import { NavLink, useParams } from 'react-router-dom'
import { useDataset } from '../modules/datasets/hooks/useDatasets'
import { useEDA } from '../modules/datasets/hooks/useEDA'
import { PageHeader } from '../shared/components/PageHeader'
import { ErrorState } from '../shared/components/ErrorState'
import { LoadingSpinner, SkeletonCard } from '../shared/components/LoadingSpinner'
import { Badge } from '../shared/components/ui/badge'
import { formatFileSize } from '../shared/utils/format'
import type { EDAReport, MissingRow, NumericSummaryRow, OutlierRow, CategoricalSummaryRow, DistributionPlot } from '../core/api/eda.api'

export default function DatasetOverview() {
  const { id } = useParams<{ id: string }>()
  const { data: dataset, isLoading: dsLoading, error: dsError, refetch: dsRefetch } = useDataset(id)
  const { status, report, isProcessing } = useEDA(id)

  const progressPct = status ? Math.round((status.progress ?? 0) * 100) : 0

  if (dsLoading) {
    return (
      <div className="p-8 lg:p-12">
        <LoadingSpinner />
      </div>
    )
  }

  if (dsError) {
    return (
      <div className="p-8 lg:p-12">
        <ErrorState title="Dataset not found" message="Could not load this dataset." onRetry={() => dsRefetch()} />
      </div>
    )
  }

  if (!dataset) {
    return (
      <div className="p-8 lg:p-12">
        <ErrorState title="Dataset not found" />
      </div>
    )
  }

  return (
    <div className="p-8 lg:p-12">
      <PageHeader
        title="Dataset"
        accent={dataset.name}
        subtitle={`${dataset.row_count?.toLocaleString() ?? '—'} rows × ${dataset.column_count ?? '—'} columns`}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={dataset.status === 'ready' ? 'success' : 'danger'}>{dataset.status}</Badge>
            <Badge variant={dataset.is_cleaned ? 'success' : 'warning'}>
              {dataset.is_cleaned ? 'Cleaned' : 'Uncleaned'}
            </Badge>
            <NavLink
              to={`/cleaning?datasetId=${dataset.id}`}
              className="bg-primary text-white font-headline font-bold uppercase text-xs px-4 py-2 border-2 border-primary hover:bg-primary-container hover:text-primary transition-all active:scale-95 neo-shadow"
            >
              {dataset.is_cleaned ? 'Re-Clean Dataset' : 'Clean Dataset First'}
            </NavLink>
            {dataset.is_cleaned ? (
              <NavLink
                to={`/preprocessing?datasetId=${dataset.id}`}
                className="bg-tertiary text-white font-headline font-bold uppercase text-xs px-4 py-2 border-2 border-primary hover:opacity-90 transition-all active:scale-95 neo-shadow"
              >
                Build Pipeline
              </NavLink>
            ) : (
              <NavLink
                to={`/cleaning?datasetId=${dataset.id}`}
                title="Cleaning required before building a pipeline"
                className="bg-surface-variant text-on-surface-variant font-headline font-bold uppercase text-xs px-4 py-2 border-2 border-primary transition-all neo-shadow cursor-pointer"
              >
                Build Pipeline (Clean First)
              </NavLink>
            )}
          </div>
        }
      />

      <WorkflowSteps datasetId={dataset.id} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Rows', value: dataset.row_count?.toLocaleString() ?? '—' },
          { label: 'Columns', value: dataset.column_count ?? '—' },
          { label: 'Size', value: formatFileSize(dataset.file_size_bytes) },
           { label: 'Format', value: (dataset.file_format ?? 'Unknown').toUpperCase() },
        ].map((s) => (
          <div key={s.label} className="bg-surface border-2 border-primary p-4">
            <span className="block font-headline text-[10px] font-bold uppercase text-on-surface-variant">{s.label}</span>
            <span className="text-3xl font-headline font-black">{s.value}</span>
          </div>
        ))}
      </div>

      {isProcessing && (
        <div className="bg-surface border-2 border-primary p-6 mb-8">
          <h3 className="font-headline font-black text-sm uppercase mb-3">Analyzing dataset...</h3>
          <div className="h-4 border-2 border-primary bg-surface-variant relative">
            <div className="h-full bg-secondary transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="mt-2 text-xs text-on-surface-variant font-headline font-bold">{status?.step ?? 'Starting...'} ({progressPct}%)</p>
        </div>
      )}

      {report && !isProcessing && <RawEDA report={report} />}

      {!report && !isProcessing && status?.status === 'failed' && (
        <div className="bg-surface border-2 border-primary p-6">
          <ErrorState title="EDA Failed" message={status.error ?? 'An error occurred.'} />
        </div>
      )}

      {!report && !isProcessing && !status && (
        <div className="space-y-6">
          <SkeletonCard /><SkeletonCard />
        </div>
      )}
    </div>
  )
}

function WorkflowSteps({ datasetId }: { datasetId: string }) {
  const stepClass = (state: 'done' | 'active' | 'next') =>
    `flex items-center gap-2 px-4 py-2 border-2 border-primary font-headline text-xs font-bold uppercase transition-colors ${
      state === 'active'
        ? 'bg-primary text-white'
        : state === 'done'
          ? 'bg-primary-container text-primary'
          : 'bg-surface text-on-surface-variant'
    }`

  return (
    <div className="flex flex-wrap items-center gap-2 mb-8">
      <span className={stepClass('done')}>
        <span className="material-symbols-outlined text-sm">check_circle</span>
        1 · Dataset
      </span>
      <span className="text-on-surface-variant font-headline">→</span>
      <span className={stepClass('active')}>
        <span className="material-symbols-outlined text-sm">query_stats</span>
        2 · EDA
      </span>
      <span className="text-on-surface-variant font-headline">→</span>
      <NavLink
        to={`/cleaning?datasetId=${datasetId}`}
        className={`${stepClass('next')} hover:bg-primary-container hover:text-primary`}
      >
        <span className="material-symbols-outlined text-sm">cleaning_services</span>
        3 · Cleaning
      </NavLink>
    </div>
  )
}

function RawEDA({ report }: { report: EDAReport }) {
  return (
    <div className="space-y-8">
      <ColumnListSection columns={report.columns} memory={report.memory_usage} />

      <HeadTailSection head={report.head} tail={report.tail} columns={report.columns.map((c) => c.name)} />

      <MissingnessSection missingness={report.missingness} />

      <NumericSummarySection summary={report.numeric_summary} />

      <OutliersSection outliers={report.outliers} />

      <CategoricalSection categories={report.categorical_summary} />

      <CorrelationSection matrix={report.correlation_matrix} highPairs={report.high_correlations} />

      <DistributionSection plots={report.distribution_plots} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Duplicate Rows" value={report.duplicates.count.toLocaleString()} sub={report.duplicates.count > 0 ? `${(report.duplicates.percent * 100).toFixed(2)}% of data` : 'Clean dataset'} />
        <StatCard label="Shape" value={`${report.shape.rows.toLocaleString()} × ${report.shape.columns}`} sub="rows × columns" />
        <StatCard label="Memory" value={report.memory_usage.formatted} sub={`${report.memory_usage.total_bytes.toLocaleString()} bytes`} />
      </div>

      <DataTypeIssuesSection issues={report.data_type_issues} />

      <ConstantColumnsSection columns={report.constant_columns} />

      <FindingsSection findings={report.findings} />
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-surface border-2 border-primary p-6">
      <h3 className="font-headline font-black text-sm uppercase mb-2">{label}</h3>
      <span className="text-3xl font-headline font-black">{value}</span>
      <span className="block text-sm text-on-surface-variant font-body">{sub}</span>
    </div>
  )
}

function ColumnListSection({ columns, memory }: { columns: EDAReport['columns']; memory: EDAReport['memory_usage'] }) {
  return (
    <div className="bg-surface border-2 border-primary p-6">
      <h3 className="font-headline font-black text-lg uppercase mb-4">Columns & Data Types</h3>
      <p className="text-sm text-on-surface-variant mb-4">Memory: {memory.formatted}</p>
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
            {columns.map((col) => (
              <tr key={col.name} className="border-b border-primary last:border-b-0 hover:bg-surface-variant/30 transition-colors">
                <td className="p-3 font-body text-sm text-on-surface-variant">{col.ordinal_position}</td>
                <td className="p-3 font-headline font-bold text-sm">{col.name}</td>
                <td className="p-3"><Badge variant="info">{col.dtype}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function HeadTailSection({ head, tail, columns }: { head: Record<string, unknown>[]; tail: Record<string, unknown>[]; columns: string[] }) {
  if (head.length === 0) return null
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-surface border-2 border-primary p-6 overflow-x-auto">
        <h3 className="font-headline font-black text-lg uppercase mb-3">Head (first 10 rows)</h3>
        <DataTable rows={head} columns={columns} />
      </div>
      <div className="bg-surface border-2 border-primary p-6 overflow-x-auto">
        <h3 className="font-headline font-black text-lg uppercase mb-3">Tail (last 5 rows)</h3>
        <DataTable rows={tail} columns={columns} />
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

function MissingnessSection({ missingness }: { missingness: MissingRow[] }) {
  return (
    <div className="bg-surface border-2 border-primary p-6">
      <h3 className="font-headline font-black text-lg uppercase mb-4">Missing Values</h3>
      {missingness.length === 0 ? (
        <p className="text-green-700 font-headline font-bold">No missing values detected.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b-2 border-primary">
                <th className="p-3 font-headline font-bold text-xs uppercase text-on-surface-variant">Column</th>
                <th className="p-3 font-headline font-bold text-xs uppercase text-on-surface-variant">Missing Count</th>
                <th className="p-3 font-headline font-bold text-xs uppercase text-on-surface-variant">Missing %</th>
                <th className="p-3 font-headline font-bold text-xs uppercase text-on-surface-variant">Distribution</th>
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
                      <div className="h-3 w-full max-w-[200px] border border-primary bg-surface-variant relative">
                        <div className="h-full bg-secondary" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function NumericSummarySection({ summary }: { summary: NumericSummaryRow[] }) {
  if (summary.length === 0) return null
  return (
    <div className="bg-surface border-2 border-primary p-6 overflow-x-auto">
      <h3 className="font-headline font-black text-lg uppercase mb-4">Numeric Summary</h3>
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
      <h3 className="font-headline font-black text-lg uppercase mb-4">Outlier Detection (IQR 1.5× Rule)</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      <h3 className="font-headline font-black text-lg uppercase mb-4">Categorical Columns</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((cat) => (
          <div key={cat.column} className="border-2 border-primary p-4">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-headline font-bold text-sm uppercase">{cat.column}</h4>
              <Badge variant={cat.high_cardinality ? 'warning' : 'info'}>{cat.cardinality.toLocaleString()} unique</Badge>
            </div>
            {cat.high_cardinality && <p className="text-xs text-on-surface-variant mb-2">High cardinality — may be an ID or free-text column.</p>}
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

function CorrelationSection({ matrix, highPairs }: { matrix: Record<string, Record<string, number>>; highPairs: { col_a: string; col_b: string; value: number }[] }) {
  const cols = Object.keys(matrix)
  if (cols.length < 2) return null
  const cell = 48
  const maxNameLen = Math.max(...cols.map(c => c.length))
  const labelW = Math.max(120, maxNameLen * 7.5 + 12)
  const labelPad = 24
  const bottomPad = Math.max(40, maxNameLen * 5 + 10)
  const gridW = cols.length * cell
  const w = gridW + labelW
  const h = gridW + labelPad + bottomPad

  return (
    <div className="bg-surface border-2 border-primary p-6">
      <h3 className="font-headline font-black text-lg uppercase mb-4">Correlation Matrix (Pearson)</h3>
      <div className="overflow-x-auto mb-4">
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ minWidth: w }}>
          <g>
            {cols.map((col, i) => (
              <text key={`row-${i}`} x={labelW - 8} y={i * cell + cell / 2 + labelPad} fontSize="11" fill="currentColor" textAnchor="end" dominantBaseline="middle" className="font-headline font-bold">
                {col}
              </text>
            ))}
            {cols.map((col, j) => (
              <text key={`col-${j}`} x={j * cell + cell / 2 + labelW} y={gridW + labelPad + 8} fontSize="11" fill="currentColor" textAnchor="end" dominantBaseline="middle" transform={`rotate(-40, ${j * cell + cell / 2 + labelW}, ${gridW + labelPad + 8})`} className="font-headline font-bold">
                {col}
              </text>
            ))}
            {cols.map((col_a, i) =>
              cols.map((col_b, j) => {
                const val = matrix[col_a]?.[col_b] ?? 0
                const abs = Math.abs(val)
                const intensity = abs * 0.75 + 0.15
                const isHigh = abs > 0.85 && col_a !== col_b
                return (
                  <g key={`${i}-${j}`}>
                    <rect
                      x={j * cell + labelW}
                      y={i * cell + labelPad}
                      width={cell}
                      height={cell}
                      fill={val >= 0 ? `rgba(0,85,255,${intensity})` : `rgba(220,38,38,${intensity})`}
                      stroke={isHigh ? '#f59e0b' : '#d1d5db'}
                      strokeWidth={isHigh ? 2.5 : 0.5}
                    />
                    <text
                      x={j * cell + cell / 2 + labelW}
                      y={i * cell + cell / 2 + labelPad}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={cell > 40 ? 11 : 9}
                      fill={abs > 0.5 ? '#fff' : 'currentColor'}
                      className="font-headline font-bold"
                    >
                      {val.toFixed(2)}
                    </text>
                  </g>
                )
              })
            )}
          </g>
        </svg>
      </div>
      <div className="flex gap-4 text-[10px] font-headline font-bold text-on-surface-variant mb-4">
        <span>Red = negative</span><span>Blue = positive</span><span>Darker = stronger</span><span>Yellow border = |r| &gt; 0.85</span>
      </div>
      {highPairs.length > 0 && (
        <div className="space-y-1.5">
          <p className="font-headline font-bold text-xs uppercase text-on-surface-variant">Potential Multicollinearity (|r| &gt; 0.85):</p>
          {highPairs.map((p, i) => (
            <div key={i} className="flex items-center gap-2 text-sm font-body">
              <Badge variant="warning">{p.value.toFixed(2)}</Badge>
              <span className="font-headline font-bold">{p.col_a}</span>
              <span className="text-on-surface-variant">↔</span>
              <span className="font-headline font-bold">{p.col_b}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DistributionSection({ plots }: { plots: DistributionPlot[] }) {
  if (plots.length === 0) return null
  return (
    <div className="bg-surface border-2 border-primary p-6">
      <h3 className="font-headline font-black text-lg uppercase mb-4">Distributions</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plots.slice(0, 6).map((plot) => (
          <div key={plot.column} className="border-2 border-primary p-4">
            <h4 className="font-headline font-bold text-sm uppercase mb-2">{plot.column}</h4>
            <MiniHistogram plot={plot} width={260} height={100} />
          </div>
        ))}
      </div>
    </div>
  )
}

function MiniHistogram({ plot, width, height }: { plot: DistributionPlot; width: number; height: number }) {
  const { bins, counts } = plot.histogram
  if (counts.length === 0) return <p className="text-xs text-on-surface-variant">Insufficient data</p>
  const maxCount = Math.max(...counts, 1)
  const histHeight = height * 0.75
  const pad = 4
  const dataMin = bins[0]; const dataMax = bins[bins.length - 1]; const dataRange = dataMax - dataMin || 1
  const scaleX = (v: number) => ((v - dataMin) / dataRange) * (width - pad * 2) + pad
  const binW = width / bins.length
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
      {counts.map((c, i) => (
        <rect key={i} x={scaleX(bins[i])} y={histHeight - (c / maxCount) * histHeight} width={Math.max(binW - 1, 1)} height={(c / maxCount) * histHeight} fill="rgba(0,85,255,0.3)" stroke="rgba(0,85,255,0.6)" strokeWidth={0.5} />
      ))}
      {plot.kde.y.length > 1 && (
        <polyline points={plot.kde.x.map((x, i) => `${scaleX(x)},${histHeight - (plot.kde.y[i] / Math.max(...plot.kde.y, 0.001)) * histHeight}`).join(' ')} fill="none" stroke="#dc2626" strokeWidth={2} />
      )}
    </svg>
  )
}

function DataTypeIssuesSection({ issues }: { issues: EDAReport['data_type_issues'] }) {
  if (issues.length === 0) return null
  return (
    <div className="bg-surface border-2 border-primary p-6">
      <h3 className="font-headline font-black text-lg uppercase mb-4">Data Type Sanity Checks</h3>
      <div className="space-y-4">
        {issues.map((issue) => (
          <div key={issue.column} className="border-2 border-primary p-4">
            <div className="flex items-center gap-2 mb-1"><Badge variant="warning">{issue.column}</Badge></div>
            <p className="text-sm font-body mb-2">{issue.issue}</p>
            {issue.sample_values.length > 0 && (
              <div className="text-xs text-on-surface-variant">
                <span className="font-headline font-bold">Sample: </span>
                {issue.sample_values.map((v, i) => <code key={i} className="bg-surface-variant px-1 mx-0.5 border border-primary">{v}</code>)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ConstantColumnsSection({ columns }: { columns: EDAReport['constant_columns'] }) {
  if (columns.length === 0) return null
  return (
    <div className="bg-surface border-2 border-primary p-6">
      <h3 className="font-headline font-black text-lg uppercase mb-4">Constant / Near-Constant Columns</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {columns.map((col) => (
          <div key={col.column} className="border-2 border-primary p-4">
            <h4 className="font-headline font-bold text-sm uppercase mb-1">{col.column}</h4>
            <p className="text-xs font-body">{col.percent_same === 1.0 ? 'Constant column' : `${(col.percent_same * 100).toFixed(1)}% same value`}</p>
            <p className="text-xs text-on-surface-variant font-headline font-bold mt-1">Value: {col.unique_value != null ? String(col.unique_value) : '—'}</p>
            <Badge variant="info" className="mt-2">Candidate for removal</Badge>
          </div>
        ))}
      </div>
    </div>
  )
}

function FindingsSection({ findings }: { findings: EDAReport['findings'] }) {
  if (findings.length === 0) return null
  return (
    <div className="bg-surface border-2 border-primary p-6">
      <h3 className="font-headline font-black text-lg uppercase mb-4">Findings</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {findings.map((f, i) => (
          <div key={i} className="border-2 border-primary p-4">
            <Badge variant={f.severity === 'critical' ? 'danger' : f.severity === 'warning' ? 'warning' : 'info'}>{f.severity}</Badge>
            <h4 className="font-headline font-bold text-sm uppercase mt-2 mb-1">{f.title}</h4>
            <p className="text-sm text-on-surface-variant">{f.description}</p>
            {f.affected_columns.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {f.affected_columns.map((col) => <Badge key={col} variant="default">{col}</Badge>)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
