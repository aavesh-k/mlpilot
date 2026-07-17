import { useState } from 'react'
import { useModels } from '../modules/training/hooks/useTraining'
import { PageHeader } from '../shared/components/PageHeader'
import { EmptyState } from '../shared/components/EmptyState'
import { ErrorState } from '../shared/components/ErrorState'
import { LoadingSpinner, SkeletonCard } from '../shared/components/LoadingSpinner'
import { Button } from '../shared/components/ui/button'
import { Badge } from '../shared/components/ui/badge'

export default function Visualizations() {
  const { data: modelsData, isLoading, error } = useModels()
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>()

  const models = modelsData?.items ?? []
  const completedModels = models.filter((m) => m.metrics)

  return (
    <div className="p-8 lg:p-12">
      <PageHeader title="Post-Training" accent="Visualizations" subtitle="Confusion matrices, ROC curves, feature importance, and residual plots." />

      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      )}

      {error && <ErrorState title="Failed to load models" message="Could not load trained models." />}

      {!isLoading && !error && completedModels.length === 0 && (
        <EmptyState
          icon="monitoring"
          title="No trained models"
          description="Complete a training run and select a model to view visualizations."
        />
      )}

      {completedModels.length > 0 && (
        <>
          <div className="flex gap-2 mb-8 flex-wrap">
            {completedModels.map((m) => (
              <Button
                key={m.id}
                variant={selectedModelId === m.id ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedModelId(m.id)}
              >
                {m.name}
              </Button>
            ))}
          </div>

          {!selectedModelId && (
            <p className="text-on-surface-variant font-headline font-bold text-sm mb-8">Select a model above to view plots.</p>
          )}

          {selectedModelId && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <PlaceholderPlot title="Confusion Matrix" description="True vs predicted class counts" />
              <PlaceholderPlot title="ROC Curve" description="True positive rate vs false positive rate" />
              <PlaceholderPlot title="Feature Importance" description="Top contributing features" />
              <PlaceholderPlot title="Residuals" description="Prediction errors distribution" />
            </div>
          )}
        </>
      )}
    </div>
  )
}

function PlaceholderPlot({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-surface border-2 border-primary p-6 neo-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-headline font-black text-lg uppercase">{title}</h3>
          <p className="text-sm text-on-surface-variant">{description}</p>
        </div>
        <Badge variant="info">Coming soon</Badge>
      </div>
      <div className="w-full aspect-[4/3] bg-surface-variant border-2 border-dashed border-primary flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant block mb-2">bar_chart</span>
          <span className="font-headline font-bold text-xs uppercase text-on-surface-variant">
            Plot will render here after training computes these metrics
          </span>
        </div>
      </div>
    </div>
  )
}
