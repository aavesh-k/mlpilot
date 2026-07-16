import { useState } from 'react'
import { useDatasets } from '../modules/datasets/hooks/useDatasets'
import { usePipelines, useCreatePipeline, useExecutePipeline } from '../modules/pipelines/hooks/usePipelines'
import { PageHeader } from '../shared/components/PageHeader'
import { EmptyState } from '../shared/components/EmptyState'
import { ErrorState } from '../shared/components/ErrorState'
import { LoadingSpinner } from '../shared/components/LoadingSpinner'
import { Pagination } from '../shared/components/Pagination'
import { Button } from '../shared/components/ui/button'
import { Badge } from '../shared/components/ui/badge'
import { formatDate } from '../shared/utils/format'
import type { PipelineStep } from '../core/api/pipelines.api'

export default function Preprocessing() {
  const [page, setPage] = useState(1)
  const { data: datasetsData } = useDatasets()
  const { data: pipesData, isLoading, error, refetch } = usePipelines(page)
  const createPipeline = useCreatePipeline()
  const executePipeline = useExecutePipeline()

  const datasets = datasetsData?.items ?? []
  const pipelines = pipesData?.items ?? []

  const handleCreateDemo = () => {
    const firstDataset = datasets[0]
    if (!firstDataset) return
    const steps: PipelineStep[] = [
      { step_type: 'imputation', config: { strategy: 'mean' } },
      { step_type: 'encoding', config: { strategy: 'one_hot' } },
      { step_type: 'scaling', config: { strategy: 'standard' } },
      { step_type: 'train_test_split', config: {} },
    ]
    createPipeline.mutate({ dataset_id: firstDataset.id, name: 'Auto Pipeline', steps })
  }

  const statusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
      completed: 'success', running: 'warning', failed: 'danger', draft: 'info',
    }
    return <Badge variant={variants[status] ?? 'default'}>{status}</Badge>
  }

  return (
    <div className="p-8 lg:p-12">
      <PageHeader
        title="Preprocessing"
        accent="Pipelines"
        subtitle="Build and execute data preprocessing pipelines."
        action={
          datasets.length > 0 ? (
            <Button variant="primary" size="sm" onClick={handleCreateDemo} disabled={createPipeline.isPending}>
              {createPipeline.isPending ? 'Creating...' : '+ Create Pipeline'}
            </Button>
          ) : undefined
        }
      />

      {isLoading && <LoadingSpinner />}
      {error && <ErrorState message="Failed to load pipelines" onRetry={() => refetch()} />}

      {!isLoading && !error && pipelines.length === 0 && (
        <EmptyState
          icon="account_tree"
          title="No preprocessing pipelines yet"
          description="Create a pipeline to prepare your data for training."
          action={
            datasets.length > 0 ? (
              <Button onClick={handleCreateDemo} disabled={createPipeline.isPending}>
                {createPipeline.isPending ? 'Creating...' : 'Create Pipeline'}
              </Button>
            ) : undefined
          }
        />
      )}

      {!isLoading && !error && pipelines.length > 0 && (
        <div className="space-y-4">
          {pipelines.map((p) => (
            <div key={p.id} className="bg-surface border-2 border-primary p-6 neo-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-headline font-bold text-lg">{p.name}</h3>
                  <p className="text-xs text-on-surface-variant">Created {formatDate(p.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge(p.status)}
                  {p.status === 'draft' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => executePipeline.mutate(p.id)}
                      disabled={executePipeline.isPending}
                    >
                      Execute
                    </Button>
                  )}
                  {p.status === 'completed' && <Badge variant="success">Ready</Badge>}
                </div>
              </div>
              {p.error_message && (
                <p className="text-secondary text-sm font-bold mb-2">{p.error_message}</p>
              )}
              <div className="flex gap-2 flex-wrap">
                {p.steps.map((s, i) => (
                  <span key={i} className="bg-surface-variant px-3 py-1 border border-primary text-xs font-headline font-bold uppercase">
                    {i + 1}. {s.step_type.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <Pagination page={pipesData!.page} perPage={pipesData!.per_page} total={pipesData!.total} onPageChange={setPage} />
        </div>
      )}
    </div>
  )
}
