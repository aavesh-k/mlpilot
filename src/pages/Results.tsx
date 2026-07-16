import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useModels } from '../modules/training/hooks/useTraining'
import { PageHeader } from '../shared/components/PageHeader'
import { EmptyState } from '../shared/components/EmptyState'
import { ErrorState } from '../shared/components/ErrorState'
import { SkeletonTable } from '../shared/components/LoadingSpinner'
import { Pagination } from '../shared/components/Pagination'
import { Badge } from '../shared/components/ui/badge'
import { Button } from '../shared/components/ui/button'
import { formatDate } from '../shared/utils/format'

export default function Results() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const { data, isLoading, error, refetch } = useModels(page)
  const models = data?.items ?? []

  const completedCount = models.filter((m) => m.status === 'completed').length
  const runningCount = models.filter((m) => m.status === 'running' || m.status === 'queued').length
  const failedCount = models.filter((m) => m.status === 'failed').length

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
        subtitle={`${completedCount} completed · ${runningCount} in progress · ${failedCount} failed`}
      />

      {models.length === 0 ? (
        <EmptyState
          icon="summarize"
          title="No results yet"
          description="Complete a training run to see results here."
          action={<Button onClick={() => navigate('/training')}>Go to Training</Button>}
        />
      ) : (
        <>
          <div className="bg-surface border-2 border-primary overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-primary">
                  <th className="p-4 font-headline font-bold text-xs uppercase">Name</th>
                  <th className="p-4 font-headline font-bold text-xs uppercase">Algorithm</th>
                  <th className="p-4 font-headline font-bold text-xs uppercase">Accuracy</th>
                  <th className="p-4 font-headline font-bold text-xs uppercase">Status</th>
                  <th className="p-4 font-headline font-bold text-xs uppercase">Date</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.id} className="border-b border-primary last:border-b-0 hover:bg-surface-variant/30 transition-colors">
                    <td className="p-4 font-headline font-bold text-sm">{m.name}</td>
                    <td className="p-4 font-body text-sm capitalize">{m.algorithm.replace(/_/g, ' ')}</td>
                    <td className="p-4 font-body text-sm font-bold">
                      {m.metrics ? `${(m.metrics.accuracy * 100).toFixed(1)}%` : '—'}
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
                    <td className="p-4 font-body text-sm">{formatDate(m.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data!.page} perPage={data!.per_page} total={data!.total} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
