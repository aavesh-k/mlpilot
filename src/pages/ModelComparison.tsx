import { useCompareModels } from '../modules/training/hooks/useTraining'
import { useModels } from '../modules/training/hooks/useTraining'
import { PageHeader } from '../shared/components/PageHeader'
import { EmptyState } from '../shared/components/EmptyState'
import { ErrorState } from '../shared/components/ErrorState'
import { SkeletonTable } from '../shared/components/LoadingSpinner'

export default function ModelComparison() {
  const { data: modelsData, isLoading, error, refetch } = useModels()
  const allModels = modelsData?.items ?? []
  const completedModels = allModels.filter((m) => m.metrics)

  const { data: compared } = useCompareModels(completedModels.map((m) => m.id))
  const sorted = compared ?? []
  const best = sorted[0]

  if (isLoading) {
    return (
      <div className="p-8 lg:p-12">
        <PageHeader title="Model" accent="Comparison" subtitle="Cross-validated performance across all trained models." />
        <SkeletonTable rows={4} cols={5} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 lg:p-12">
        <ErrorState title="Failed to load models" onRetry={() => refetch()} />
      </div>
    )
  }

  if (sorted.length === 0) {
    return (
      <div className="p-8 lg:p-12">
        <PageHeader title="Model" accent="Comparison" subtitle="Cross-validated performance across all trained models." />
        <EmptyState
          icon="leaderboard"
          title="No trained models yet"
          description="Complete a training run to see results here."
        />
      </div>
    )
  }

  return (
    <div className="p-8 lg:p-12">
      <PageHeader title="Model" accent="Comparison" subtitle="Cross-validated performance across all trained models." />

      {best && (
        <div className="bg-primary-container/20 border-2 border-primary p-6 neo-shadow mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🏆</span>
            <h3 className="font-headline font-black text-2xl uppercase">Best Model: {best.name}</h3>
          </div>
          <p className="text-lg font-headline font-bold">
            {((best.metrics?.accuracy ?? 0) * 100).toFixed(1)}% accuracy
          </p>
        </div>
      )}

      <div className="bg-surface border-2 border-primary overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b-2 border-primary">
              <th className="p-4 font-headline font-bold text-xs uppercase">Model</th>
              <th className="p-4 font-headline font-bold text-xs uppercase">Accuracy</th>
              <th className="p-4 font-headline font-bold text-xs uppercase">F1-Score</th>
              <th className="p-4 font-headline font-bold text-xs uppercase">Precision</th>
              <th className="p-4 font-headline font-bold text-xs uppercase">Recall</th>
              <th className="p-4 font-headline font-bold text-xs uppercase">ROC-AUC</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((m) => (
              <tr
                key={m.id}
                className={`border-b border-primary last:border-b-0 hover:bg-surface-variant/30 transition-colors ${
                  m.is_best ? 'bg-primary-container/10' : ''
                }`}
              >
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    {m.is_best && <span className="text-lg">🏆</span>}
                    <span className="font-headline font-bold text-sm">{m.name}</span>
                  </div>
                </td>
                <td className="p-4 font-body text-sm font-bold">
                  {((m.metrics?.accuracy ?? 0) * 100).toFixed(1)}%
                </td>
                <td className="p-4 font-body text-sm">{m.metrics?.f1_score?.toFixed(4) ?? '—'}</td>
                <td className="p-4 font-body text-sm">{m.metrics?.precision?.toFixed(4) ?? '—'}</td>
                <td className="p-4 font-body text-sm">{m.metrics?.recall?.toFixed(4) ?? '—'}</td>
                <td className="p-4 font-body text-sm">{m.metrics?.roc_auc?.toFixed(4) ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
