import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useDatasets, useUploadDataset, useDeleteDataset } from '../modules/datasets/hooks/useDatasets'
import { PageHeader } from '../shared/components/PageHeader'
import { EmptyState } from '../shared/components/EmptyState'
import { ErrorState } from '../shared/components/ErrorState'
import { LoadingSpinner } from '../shared/components/LoadingSpinner'
import { Pagination } from '../shared/components/Pagination'
import { Badge } from '../shared/components/ui/badge'
import { Button } from '../shared/components/ui/button'
import { ConfirmDialog } from '../shared/components/ui/confirm-dialog'
import { formatFileSize, formatDate } from '../shared/utils/format'
import { apiClient } from '../core/api/client'
import { toApiError } from '../core/api/errors'
import WorkflowNextStep from '../shared/components/WorkflowNextStep'

export default function DatasetUpload() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [isDragOver, setIsDragOver] = useState(false)
  const { data, isLoading, error, refetch } = useDatasets(page)
  const uploadMutation = useUploadDataset()
  const deleteMutation = useDeleteDataset()
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }
  const toggleSelectAllPage = () => {
    if (!data?.items) return
    const pageIds = data.items.map((d) => d.id)
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id))
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)))
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])))
    }
  }
  const clearSelection = () => setSelectedIds([])

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    setBulkDeleting(true)
    setDeleteError(null)
    try {
      await Promise.all(selectedIds.map((id) => deleteMutation.mutateAsync(id)))
      setSelectedIds([])
    } catch (err) {
      setDeleteError(toApiError(err).message)
    } finally {
      setBulkDeleting(false)
      setConfirmBulkDelete(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleteError(null)
    setPendingDeleteId(id)
    try {
      await deleteMutation.mutateAsync(id)
    } catch (err) {
      setDeleteError(toApiError(err).message)
    } finally {
      setPendingDeleteId(null)
    }
  }

  const [demoLoading, setDemoLoading] = useState(false)
  const [demoError, setDemoError] = useState<string | null>(null)

  const loadDemoDataset = async (demoType: string) => {
    try {
      setDemoLoading(true)
      setDemoError(null)
      const { data } = await apiClient.post('/datasets/demo', { demo: demoType })
      await queryClient.invalidateQueries({ queryKey: ['datasets'] })
      navigate(`/datasets/${data.id}`)
    } catch (err: unknown) {
      setDemoError(toApiError(err).message)
    } finally {
      setDemoLoading(false)
    }
  }

  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [clientValidationError, setClientValidationError] = useState<string | null>(null)

  const MAX_BYTES = 5 * 1024 * 1024 * 1024 // 5GB mirrors backend MAX_DATASET_SIZE_MB
  const ALLOWED_EXTS = ['.csv', '.parquet', '.json', '.xlsx']

  const validateClientSide = (file: File): string | null => {
    const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase()
    if (!ALLOWED_EXTS.includes(ext)) {
      return `Unsupported format ${ext}. Allowed: ${ALLOWED_EXTS.join(', ')}`
    }
    if (file.size > MAX_BYTES) {
      return `File exceeds 5GB limit (${(file.size / 1024 / 1024 / 1024).toFixed(2)} GB)`
    }
    if (file.size === 0) return 'File is empty'
    return null
  }

  const handleUpload = async (file: File) => {
    setClientValidationError(null)
    const err = validateClientSide(file)
    if (err) {
      setClientValidationError(err)
      return
    }
    setUploadProgress(0)
    try {
      const ds = await uploadMutation.mutateAsync({
        file,
        onProgress: (pct) => setUploadProgress(pct),
      })
      navigate(`/datasets/${ds.id}`)
    } catch {
      // error handled by mutation
    } finally {
      setUploadProgress(null)
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

      <div className="bg-surface border-2 border-primary p-4 brutal-shadow md:p-8 brutal-shadow mb-8">
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input')?.click()}
          className={`border-2 border-dashed border-primary p-6 md:p-12 text-center transition-colors cursor-pointer group ${
            isDragOver ? 'border-solid bg-primary/5' : ''
          }`}
        >
          <span className="material-symbols-outlined text-6xl text-black group-hover:text-black transition-colors">cloud_upload</span>
          <p className="font-mono font-black text-lg uppercase tracking-widest text-black mt-4">
            {isDragOver ? 'Drop now' : 'Drop Files Here'}
          </p>
          <p className="font-mono text-xs uppercase tracking-widest text-black/60 mt-2">or click to browse — Max 5GB</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-black/50 mt-1">CSV, Parquet, JSON, Excel</p>
        </div>
        <input
          id="file-input"
          type="file"
          accept=".csv,.parquet,.json,.xlsx"
          className="hidden"
          onChange={handleFileSelect}
        />
        {clientValidationError && (
          <p className="mt-4 text-error font-mono font-bold text-sm">
            {clientValidationError}
          </p>
        )}
        {uploadMutation.isError && (
          <p className="mt-4 text-error font-mono font-bold text-sm">
            Upload failed: {toApiError(uploadMutation.error).message}
          </p>
        )}
        {uploadMutation.isPending && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-3">
              <LoadingSpinner className="py-0" />
              <span className="font-headline font-bold text-sm">
                {uploadProgress !== null ? `Uploading… ${uploadProgress}%` : 'Uploading...'}
              </span>
            </div>
            {uploadProgress !== null && (
              <div className="h-2 w-full border border-primary bg-surface-variant">
                <div className="h-full bg-primary transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            )}
            <p className="text-[10px] font-mono uppercase tracking-widest text-black/50">Large files are streamed — please keep this tab open</p>
          </div>
        )}
      </div>

      <div className="bg-surface border-2 border-primary p-4 brutal-shadow md:p-8 brutal-shadow mb-8">
        <h3 className="font-headline font-black text-xl uppercase mb-6">Try a Demo Dataset</h3>
        <p className="text-on-surface-variant text-sm mb-4">Click a button below to instantly load a sample dataset and start the workflow.</p>
        {demoError && (
          <p className="mb-4 text-error font-mono font-bold text-sm">
            Failed to load demo: {demoError}
          </p>
        )}
        {demoLoading && (
          <div className="mb-4 flex items-center gap-3">
            <LoadingSpinner className="py-0" />
            <span className="font-headline font-bold text-sm">Loading demo dataset...</span>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <button
            onClick={() => loadDemoDataset('iris')}
            disabled={demoLoading}
            title={demoLoading ? 'Loading demo — please wait' : undefined}
            aria-disabled={demoLoading}
            className="flex flex-col items-center bg-white border-2 border-black brutal-shadow-sm px-4 py-3 hover:bg-[#ffd400] btn-press font-mono text-xs font-black uppercase tracking-widest transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-2xl mb-1">grade</span>
            <span>Iris Classification</span>
            <span className="font-mono text-[10px] text-black/60 normal-case tracking-normal">150 samples, 4 features</span>
          </button>
          <button
            onClick={() => loadDemoDataset('breast_cancer')}
            disabled={demoLoading}
            title={demoLoading ? 'Loading demo — please wait' : undefined}
            aria-disabled={demoLoading}
            className="flex flex-col items-center bg-white border-2 border-black brutal-shadow-sm px-4 py-3 hover:bg-[#ffd400] btn-press font-mono text-xs font-black uppercase tracking-widest transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-2xl mb-1">favorite</span>
            <span>Breast Cancer</span>
            <span className="font-mono text-[10px] text-black/60 normal-case tracking-normal">569 samples, 30 features</span>
          </button>
          <button
            onClick={() => loadDemoDataset('housing')}
            disabled={demoLoading}
            title={demoLoading ? 'Loading demo — please wait' : undefined}
            aria-disabled={demoLoading}
            className="flex flex-col items-center bg-white border-2 border-black brutal-shadow-sm px-4 py-3 hover:bg-[#ffd400] btn-press font-mono text-xs font-black uppercase tracking-widest transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-2xl mb-1">house</span>
            <span>Housing Regression</span>
            <span className="font-mono text-[10px] text-black/60 normal-case tracking-normal">489 samples, 8 features</span>
          </button>
        </div>
      </div>

      <div className="bg-surface border-2 border-primary p-4 brutal-shadow md:p-8 brutal-shadow">
        <div className="flex items-center justify-between mb-6 gap-4">
          <h3 className="font-headline font-black text-xl uppercase">Datasets</h3>
          {selectedIds.length > 0 && (
            <span className="font-mono text-[10px] font-bold bg-black text-white px-2 py-1 border border-black">{selectedIds.length} selected</span>
          )}
        </div>

        {selectedIds.length > 0 && (
          <div className="mb-4 bg-[#ffd400] border-2 border-black p-3 brutal-shadow-sm flex items-center justify-between gap-3">
            <span className="font-headline font-black text-xs uppercase flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">checklist</span>
              {selectedIds.length} selected
            </span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={clearSelection} disabled={bulkDeleting} title={bulkDeleting ? 'Deleting — please wait' : 'Clear selection'}>Clear Selection</Button>
              <Button variant="danger" size="sm" onClick={() => setConfirmBulkDelete(true)} disabled={bulkDeleting} title={bulkDeleting ? 'Deleting — please wait' : `Delete ${selectedIds.length} selected`}>
                {bulkDeleting ? 'Deleting…' : `Delete Selected (${selectedIds.length})`}
              </Button>
            </div>
          </div>
        )}

        {deleteError && (
          <p className="mb-4 text-error font-mono font-bold text-sm">Delete failed: {deleteError}</p>
        )}
        {isLoading && <LoadingSpinner />}
        {error && <ErrorState message="Failed to load datasets" onRetry={() => refetch()} />}
        {!isLoading && !error && data && data.items.length === 0 && (
          <EmptyState icon="database" title="No datasets yet" description="Upload a CSV, Parquet, or JSON file to get started." />
        )}
        {!isLoading && !error && data && data.items.length > 0 && (
          <>
            <div className="flex items-center gap-3 mb-3 pb-3 border-b-2 border-black">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={data.items.length > 0 && data.items.every((d) => selectedIds.includes(d.id))}
                  onChange={toggleSelectAllPage}
                  className="w-4 h-4 border-2 border-black accent-black"
                />
                <span className="font-headline font-black text-xs uppercase">Select all on page</span>
              </label>
              <span className="font-mono text-[10px] uppercase tracking-widest text-black/60">
                {data.items.filter((d) => selectedIds.includes(d.id)).length}/{data.items.length} on this page
              </span>
              {selectedIds.length > 0 && (
                <button onClick={clearSelection} className="ml-auto font-mono text-[10px] font-bold uppercase underline decoration-dotted">Clear selection</button>
              )}
            </div>
            {data.items.map((ds) => {
              const isSelected = selectedIds.includes(ds.id)
              return (
              <div
                key={ds.id}
                onClick={() => navigate(`/datasets/${ds.id}`)}
                className={`flex items-center justify-between py-4 border-b-2 border-primary last:border-b-0 transition-colors cursor-pointer ${isSelected ? 'bg-[#ffd400]/20' : 'hover:bg-surface-variant/30'}`}
              >
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => { e.stopPropagation(); toggleSelect(ds.id) }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 border-2 border-black accent-black"
                  />
                  <span className="material-symbols-outlined text-2xl">description</span>
                  <div>
                    <p className="font-headline font-bold flex items-center gap-2">
                      {ds.name}
                      {isSelected && <span className="w-2 h-2 bg-black border border-black" aria-hidden />}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {formatFileSize(ds.file_size_bytes ?? 0)} · {ds.row_count?.toLocaleString() ?? '—'} rows · {ds.created_at ? formatDate(ds.created_at) : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 pl-4" onClick={(e) => e.stopPropagation()}>
                  <Badge variant={ds.status === 'ready' ? 'success' : ds.status === 'failed' ? 'danger' : 'warning'}>
                    {ds.status}
                  </Badge>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={pendingDeleteId === ds.id}
                    onClick={() => setConfirmDelete({ id: ds.id, name: ds.name })}
                  >
                    {pendingDeleteId === ds.id ? 'Deleting…' : 'Delete'}
                  </Button>
                </div>
              </div>
            )})}
            <Pagination page={data.page} perPage={data.per_page} total={data.total} onPageChange={setPage} />
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete Dataset"
        message={`Delete dataset "${confirmDelete?.name}"? This permanently removes the file and cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmDelete) handleDelete(confirmDelete.id)
          setConfirmDelete(null)
        }}
        onCancel={() => setConfirmDelete(null)}
      />
      <ConfirmDialog
        open={confirmBulkDelete}
        title="Delete Selected Datasets"
        message={`Delete ${selectedIds.length} selected dataset(s)? This permanently removes files and cannot be undone.`}
        confirmLabel={bulkDeleting ? 'Deleting…' : `Delete ${selectedIds.length}`}
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmBulkDelete(false)}
      />
      <WorkflowNextStep />
    </div>
  )
}
