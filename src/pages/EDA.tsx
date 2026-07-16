import { useState } from 'react'
import { useDatasets } from '../modules/datasets/hooks/useDatasets'
import { useEDA } from '../modules/datasets/hooks/useEDA'
import { PageHeader } from '../shared/components/PageHeader'
import { EmptyState } from '../shared/components/EmptyState'
import { ErrorState } from '../shared/components/ErrorState'
import { SkeletonCard } from '../shared/components/LoadingSpinner'
import { Button } from '../shared/components/ui/button'
import { Badge } from '../shared/components/ui/badge'

export default function EDA() {
  const { data: datasetsData, isLoading: dsLoading } = useDatasets()
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const { data: eda, isLoading, error, refetch } = useEDA(selectedId)

  const datasets = datasetsData?.items ?? []
  const readyDatasets = datasets.filter((d) => d.status === 'ready')

  return (
    <div className="p-8 lg:p-12">
      <PageHeader title="Exploratory" accent="Data Analysis" subtitle="Automated insights from your dataset." />

      {readyDatasets.length === 0 && !dsLoading && (
        <EmptyState
          icon="query_stats"
          title="No datasets ready"
          description="Upload and process a dataset first to run EDA."
        />
      )}

      {readyDatasets.length > 0 && (
        <div className="flex gap-2 mb-8 flex-wrap">
          {readyDatasets.map((ds) => (
            <Button
              key={ds.id}
              variant={selectedId === ds.id ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedId(ds.id)}
            >
              {ds.name}
            </Button>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <SkeletonCard />
          <SkeletonCard />
          <div className="lg:col-span-2"><SkeletonCard /></div>
        </div>
      )}

      {error && (
        <ErrorState
          title="EDA computation failed"
          message="Could not compute EDA for this dataset."
          onRetry={() => refetch()}
        />
      )}

      {eda && !isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-surface border-2 border-primary p-8 neo-shadow">
            <h3 className="font-headline font-black text-xl uppercase mb-4">Correlation Matrix</h3>
            {Object.keys(eda.correlation_matrix).length > 1 ? (
              <>
                <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Object.keys(eda.correlation_matrix).length}, 1fr)` }}>
                  {Object.entries(eda.correlation_matrix).map(([row, cols]) =>
                    Object.entries(cols).map(([col, val]) => (
                      <div
                        key={`${row}-${col}`}
                        className="aspect-square border border-primary flex items-center justify-center text-[8px] font-headline font-bold"
                        style={{ backgroundColor: `rgba(0, 85, 255, ${(val + 1) / 2 * 0.7 + 0.1})` }}
                        title={`${row} × ${col}: ${val.toFixed(2)}`}
                      >
                        {val.toFixed(1)}
                      </div>
                    ))
                  )}
                </div>
                <div className="flex justify-between mt-2 text-[10px] font-headline font-bold text-on-surface-variant">
                  <span>-1.0</span><span>0.0</span><span>+1.0</span>
                </div>
              </>
            ) : (
              <p className="text-on-surface-variant text-sm">Not enough numeric columns for correlation analysis.</p>
            )}
          </div>

          <div className="bg-surface border-2 border-primary p-8 neo-shadow">
            <h3 className="font-headline font-black text-xl uppercase mb-4">Distribution Summary</h3>
            {eda.column_stats.filter((c) => c.is_numeric).slice(0, 5).map((col) => {
              const skewVal = col.skewness ?? 0
              const fillWidth = Math.min(Math.abs(skewVal) * 20, 90)
              return (
                <div key={col.name} className="mb-6 last:mb-0">
                  <div className="flex justify-between mb-1">
                    <span className="font-headline font-bold text-sm">{col.name}</span>
                    <span className="text-xs text-on-surface-variant">Skew: {skewVal.toFixed(2)}</span>
                  </div>
                  <div className="h-2 border border-primary bg-surface-variant relative overflow-hidden">
                    <div
                      className="h-full bg-tertiary/60"
                      style={{ width: `${fillWidth + 10}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-on-surface-variant">
                    {col.min?.toFixed(1) ?? '—'} — {col.max?.toFixed(1) ?? '—'}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="lg:col-span-2 bg-surface border-2 border-primary p-8 neo-shadow">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-headline font-black text-xl uppercase">Key Findings</h3>
                <p className="text-on-surface-variant text-sm">Auto-generated insights</p>
              </div>
              <Badge variant="success">Updated</Badge>
            </div>
            {eda.findings.length === 0 ? (
              <p className="text-on-surface-variant">No significant findings detected.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {eda.findings.map((f, i) => (
                  <div key={i} className="border-2 border-primary p-4 hover:bg-surface-variant/30 transition-colors">
                    <span className="material-symbols-outlined text-3xl mb-2">
                      {f.severity === 'critical' ? 'error' : f.severity === 'warning' ? 'warning' : 'info'}
                    </span>
                    <Badge variant={f.severity === 'critical' ? 'danger' : f.severity === 'warning' ? 'warning' : 'info'}>
                      {f.severity}
                    </Badge>
                    <h4 className="font-headline font-bold text-sm uppercase mt-2 mb-1">{f.title}</h4>
                    <p className="text-sm text-on-surface-variant">{f.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
