import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDatasets, useDeleteDataset } from '../modules/datasets/hooks/useDatasets'
import { PageHeader } from '../shared/components/PageHeader'
import { EmptyState } from '../shared/components/EmptyState'
import { ErrorState } from '../shared/components/ErrorState'
import { LoadingSpinner } from '../shared/components/LoadingSpinner'
import { Pagination } from '../shared/components/Pagination'
import { Badge } from '../shared/components/ui/badge'
import { Button } from '../shared/components/ui/button'
import { formatFileSize, formatDate } from '../shared/utils/format'

export default function Datasets() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const { data, isLoading, error, refetch } = useDatasets(page)
  const deleteMutation = useDeleteDataset()

  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete dataset "${name}"? This permanently removes the file and cannot be undone.`)) {
      return
    }
    setDeleteError(null)
    setPendingDeleteId(id)
    try {
      await deleteMutation.mutateAsync(id)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete dataset')
    } finally {
      setPendingDeleteId(null)
    }
  }

  const goUpload = () => navigate('/datasets/upload')

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-5xl">
      <PageHeader
        title="Datasets"
        accent="Library"
        subtitle="Manage your uploaded datasets."
        action={
          <Button variant="primary" size="md" onClick={goUpload}>
            Upload Dataset
          </Button>
        }
      />

      {deleteError && (
        <div className="bg-surface border-2 border-secondary p-4 mb-6">
          <p className="text-secondary font-headline font-bold text-sm">Delete failed: {deleteError}</p>
        </div>
      )}

      <div className="bg-surface border-2 border-primary p-4 md:p-8 neo-shadow">
        {isLoading && <LoadingSpinner />}
        {error && <ErrorState message="Failed to load datasets" onRetry={() => refetch()} />}
        {!isLoading && !error && data && data.items.length === 0 && (
          <EmptyState
            icon="database"
            title="No datasets yet"
            description="Upload a CSV, Parquet, or JSON file to get started."
            action={
              <Button variant="primary" size="md" onClick={goUpload}>
                Upload Dataset
              </Button>
            }
          />
        )}
        {!isLoading && !error && data && data.items.length > 0 && (
          <>
            <div>
              {data.items.map((ds) => (
                <div
                  key={ds.id}
                  className="flex items-center justify-between py-4 border-b-2 border-primary last:border-b-0 hover:bg-surface-variant/30 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/datasets/${ds.id}`)}
                    className="flex items-center gap-4 text-left flex-1 min-w-0"
                  >
                    <span className="material-symbols-outlined text-2xl text-on-surface-variant">description</span>
                    <div className="min-w-0">
                      <p className="font-headline font-bold truncate">{ds.name}</p>
                      <p className="text-xs text-on-surface-variant">
                        {ds.file_format.toUpperCase()} · {formatFileSize(ds.file_size_bytes)} ·{' '}
                        {ds.row_count?.toLocaleString() ?? '—'} rows · {formatDate(ds.created_at)}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-3 pl-4">
                    <Badge variant={ds.status === 'ready' ? 'success' : ds.status === 'failed' ? 'danger' : 'warning'}>
                      {ds.status}
                    </Badge>
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={pendingDeleteId === ds.id}
                      onClick={() => handleDelete(ds.id, ds.name)}
                    >
                      {pendingDeleteId === ds.id ? 'Deleting…' : 'Delete'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Pagination page={data.page} perPage={data.per_page} total={data.total} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  )
}
