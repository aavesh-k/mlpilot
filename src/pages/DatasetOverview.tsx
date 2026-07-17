import { useParams } from 'react-router-dom'
import { useDataset } from '../modules/datasets/hooks/useDatasets'
import { useColumns } from '../modules/datasets/hooks/useEDA'
import { PageHeader } from '../shared/components/PageHeader'
import { ErrorState } from '../shared/components/ErrorState'
import { LoadingSpinner, SkeletonTable } from '../shared/components/LoadingSpinner'
import { Badge } from '../shared/components/ui/badge'
import { formatFileSize } from '../shared/utils/format'

export default function DatasetOverview() {
  const { id } = useParams<{ id: string }>()
  const { data: dataset, isLoading: dsLoading, error: dsError, refetch: dsRefetch } = useDataset(id)
  const { data: columns, isLoading: colsLoading, error: colsError, refetch: colsRefetch } = useColumns(id)

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
        accent="Overview"
        subtitle={`${dataset.name} — ${dataset.row_count?.toLocaleString() ?? '—'} rows × ${dataset.column_count ?? '—'} columns`}
        action={<Badge variant={dataset.status === 'ready' ? 'success' : 'danger'}>{dataset.status}</Badge>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Rows', value: dataset.row_count?.toLocaleString() ?? '—' },
          { label: 'Columns', value: dataset.column_count ?? '—' },
          { label: 'Size', value: formatFileSize(dataset.file_size_bytes) },
          { label: 'Format', value: dataset.file_format.toUpperCase() },
        ].map((s) => (
          <div key={s.label} className="bg-surface border-2 border-primary p-4">
            <span className="block font-headline text-[10px] font-bold uppercase text-on-surface-variant">{s.label}</span>
            <span className="text-3xl font-headline font-black">{s.value}</span>
          </div>
        ))}
      </div>

      <div className="bg-surface border-2 border-primary overflow-x-auto">
        {colsLoading && <div className="p-6"><SkeletonTable rows={5} cols={6} /></div>}
        {colsError && (
          <div className="p-6">
            <ErrorState message="Failed to load column stats" onRetry={() => colsRefetch()} />
          </div>
        )}
        {!colsLoading && !colsError && columns && columns.length > 0 && (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b-2 border-primary">
                {['Name', 'Type', 'Missing %', 'Unique', 'Mean', 'Std Dev'].map((c) => (
                  <th key={c} className="p-4 font-headline font-bold text-xs uppercase text-on-surface-variant">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {columns.map((col) => (
                <tr key={col.name} className="border-b border-primary last:border-b-0 hover:bg-surface-variant/30 transition-colors">
                  <td className="p-4 font-headline font-bold text-sm">{col.name}</td>
                  <td className="p-4 font-body text-sm">{col.is_numeric ? 'Numerical' : col.is_categorical ? 'Categorical' : col.dtype}</td>
                  <td className="p-4 font-body text-sm">{(col.missing_ratio * 100).toFixed(1)}%</td>
                  <td className="p-4 font-body text-sm">{col.unique_count?.toLocaleString() ?? '—'}</td>
                  <td className="p-4 font-body text-sm">{col.mean?.toFixed(4) ?? '—'}</td>
                  <td className="p-4 font-body text-sm">{col.std?.toFixed(4) ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
