import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDatasets, useUploadDataset } from '../modules/datasets/hooks/useDatasets'
import { PageHeader } from '../shared/components/PageHeader'
import { EmptyState } from '../shared/components/EmptyState'
import { ErrorState } from '../shared/components/ErrorState'
import { LoadingSpinner } from '../shared/components/LoadingSpinner'
import { Pagination } from '../shared/components/Pagination'
import { Badge } from '../shared/components/ui/badge'
import { formatFileSize, formatDate } from '../shared/utils/format'
import { apiClient } from '../core/api/client'

export default function DatasetUpload() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [isDragOver, setIsDragOver] = useState(false)
  const { data, isLoading, error, refetch } = useDatasets(page)
  const uploadMutation = useUploadDataset()

  const loadDemoDataset = async (demoType: string) => {
    try {
      const { data } = await apiClient.post('/datasets/demo', { demo: demoType }, {
        headers: { 'Content-Type': 'application/json' },
      })
      navigate(`/datasets/${data.id}`)
    } catch {
      // error handled by mutation
    }
  }

  const handleUpload = async (file: File) => {
    try {
      const ds = await uploadMutation.mutateAsync({ file })
      navigate(`/datasets/${ds.id}`)
    } catch {
      // error handled by mutation
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleUpload(file)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
  }

return (
    <div className="p-4 md:p-8 lg:p-12 max-w-4xl">
      <PageHeader title="Dataset" accent="Upload" subtitle="Ingest your data. CSV, Parquet, or JSON." />

      <div className="bg-surface border-2 border-primary p-4 md:p-8 neo-shadow mb-8">
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input')?.click()}
          className={`border-2 border-dashed border-primary p-6 md:p-12 text-center transition-colors cursor-pointer group ${
            isDragOver ? 'border-solid bg-primary/5' : ''
          }`}
        >
          <span className="material-symbols-outlined text-6xl text-on-surface-variant group-hover:text-primary transition-colors">cloud_upload</span>
          <p className="font-headline font-black text-xl uppercase mt-4">
            {isDragOver ? 'Drop now' : 'Drop Files Here'}
          </p>
          <p className="text-on-surface-variant text-sm font-medium mt-2">or click to browse — Max 5GB</p>
          <p className="text-xs text-on-surface-variant mt-1">CSV, Parquet, JSON, Excel</p>
        </div>
        <input
          id="file-input"
          type="file"
          accept=".csv,.parquet,.json,.xlsx"
          className="hidden"
          onChange={handleFileSelect}
        />
        {uploadMutation.isError && (
          <p className="mt-4 text-secondary font-headline font-bold text-sm">
            Upload failed: {(uploadMutation.error as Error)?.message ?? 'Unknown error'}
          </p>
        )}
        {uploadMutation.isPending && (
          <div className="mt-4 flex items-center gap-3">
            <LoadingSpinner className="py-0" />
            <span className="font-headline font-bold text-sm">Uploading...</span>
          </div>
        )}
      </div>

      <div className="bg-surface border-2 border-primary p-4 md:p-8 neo-shadow mb-8">
        <h3 className="font-headline font-black text-xl uppercase mb-6">Try a Demo Dataset</h3>
        <p className="text-on-surface-variant text-sm mb-4">Click a button below to instantly load a sample dataset and start the workflow.</p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <button
            onClick={() => loadDemoDataset('iris')}
            className="flex flex-col items-center border-2 border-primary rounded px-4 py-3 hover:border-primary/90 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-2xl mb-2">grade</span>
            <span className="text-xs font-bold">Iris Classification</span>
            <span className="text-xs text-on-surface-variant">150 samples, 4 features</span>
          </button>
          <button
            onClick={() => loadDemoDataset('breast_cancer')}
            className="flex flex-col items-center border-2 border-primary rounded px-4 py-3 hover:border-primary/90 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-2lb mb-2">favorite</span>
            <span className="text-xs font-bold">Breast Cancer</span>
            <span className="text-xs text-on-surface-variant">569 samples, 30 features</span>
          </button>
          <button
            onClick={() => loadDemoDataset('housing')}
            className="flex flex-col items-center border-2 border-primary rounded px-4 py-3 hover:border-primary/90 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-2lb mb-2">house</span>
            <span className="text-xs font-bold">Housing Regression</span>
            <span className="text-xs text-on-surface-variant">489 samples, 8 features</span>
          </button>
        </div>
      </div>

      <div className="bg-surface border-2 border-primary p-4 md:p-8 neo-shadow">
        <h3 className="font-headline font-black text-xl uppercase mb-6">Datasets</h3>

        {isLoading && <LoadingSpinner />}
        {error && <ErrorState message="Failed to load datasets" onRetry={() => refetch()} />}
        {!isLoading && !error && data && data.items.length === 0 && (
          <EmptyState icon="database" title="No datasets yet" description="Upload a CSV, Parquet, or JSON file to get started." />
        )}
        {!isLoading && !error && data && data.items.length > 0 && (
          <>
            {data.items.map((ds) => (
              <div
                key={ds.id}
                onClick={() => navigate(`/datasets/${ds.id}`)}
                className="flex items-center justify-between py-4 border-b-2 border-primary last:border-b-0 hover:bg-surface-variant/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-2xl">description</span>
                  <div>
                    <p className="font-headline font-bold">{ds.name}</p>
                    <p className="text-xs text-on-surface-variant">
                      {formatFileSize(ds.file_size_bytes)} · {ds.row_count?.toLocaleString() ?? '—'} rows · {formatDate(ds.created_at)}
                    </p>
                  </div>
                </div>
                <Badge variant={ds.status === 'ready' ? 'success' : ds.status === 'failed' ? 'danger' : 'warning'}>
                  {ds.status}
                </Badge>
              </div>
            ))}
            <Pagination page={data.page} perPage={data.per_page} total={data.total} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  )
}
