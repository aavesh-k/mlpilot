import { useState } from 'react'
import { useDatasets } from '../modules/datasets/hooks/useDatasets'
import { usePipelines, useCreatePipeline, useExecutePipeline, useUpdatePipeline } from '../modules/pipelines/hooks/usePipelines'
import { PageHeader } from '../shared/components/PageHeader'
import { EmptyState } from '../shared/components/EmptyState'
import { ErrorState } from '../shared/components/ErrorState'
import { LoadingSpinner } from '../shared/components/LoadingSpinner'
import { Pagination } from '../shared/components/Pagination'
import { Button } from '../shared/components/ui/button'
import { Badge } from '../shared/components/ui/badge'
import { formatDate } from '../shared/utils/format'
import type { PipelineStep } from '../core/api/pipelines.api'

const STEP_OPTIONS: { id: PipelineStep['step_type']; label: string; description: string }[] = [
  { id: 'imputation', label: 'Imputation', description: 'Fill missing values (mean/median/mode)' },
  { id: 'encoding', label: 'Encoding', description: 'Encode categorical columns (one-hot/label)' },
  { id: 'scaling', label: 'Scaling', description: 'Scale numerical columns (standard/minmax)' },
  { id: 'train_test_split', label: 'Train/Test Split', description: 'Split data into train and test sets' },
]

const STEP_CONFIGS: Record<string, { key: string; label: string; options: { value: string; label: string }[] }[]> = {
  imputation: [{ key: 'strategy', label: 'Strategy', options: [{ value: 'mean', label: 'Mean' }, { value: 'median', label: 'Median' }, { value: 'mode', label: 'Mode' }] }],
  encoding: [{ key: 'strategy', label: 'Strategy', options: [{ value: 'one_hot', label: 'One-Hot' }, { value: 'label', label: 'Label' }] }],
  scaling: [{ key: 'strategy', label: 'Strategy', options: [{ value: 'standard', label: 'Standard' }, { value: 'minmax', label: 'MinMax' }] }],
  train_test_split: [],
}

function PipelineBuilder({
  steps,
  onChange,
  onSave,
  saving,
}: {
  steps: PipelineStep[]
  onChange: (steps: PipelineStep[]) => void
  onSave: () => void
  saving: boolean
}) {
  const addStep = (stepType: PipelineStep['step_type']) => {
    onChange([...steps, { step_type: stepType, config: {} }])
  }

  const removeStep = (index: number) => {
    onChange(steps.filter((_, i) => i !== index))
  }

  const moveStep = (index: number, direction: -1 | 1) => {
    const newSteps = [...steps]
    const target = index + direction
    if (target < 0 || target >= newSteps.length) return
    ;[newSteps[index], newSteps[target]] = [newSteps[target], newSteps[index]]
    onChange(newSteps)
  }

  const updateConfig = (index: number, key: string, value: string) => {
    const newSteps = steps.map((s, i) => {
      if (i !== index) return s
      return { ...s, config: { ...s.config, [key]: value } }
    })
    onChange(newSteps)
  }

  return (
    <div className="border-2 border-primary p-6 bg-surface neo-shadow">
      <h4 className="font-headline font-black text-lg uppercase mb-4">Pipeline Steps</h4>

      {steps.length === 0 && (
        <p className="text-on-surface-variant text-sm mb-4">No steps yet. Add a step below.</p>
      )}

      <div className="space-y-3 mb-6">
        {steps.map((step, i) => {
          const stepInfo = STEP_OPTIONS.find((s) => s.id === step.step_type)
          const configs = STEP_CONFIGS[step.step_type] ?? []
          return (
            <div key={i} className="border border-primary p-4 bg-surface-variant/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 bg-primary text-white font-headline font-bold text-xs flex items-center justify-center">{i + 1}</span>
                  <span className="font-headline font-bold text-sm uppercase">{stepInfo?.label ?? step.step_type}</span>
                  <span className="text-xs text-on-surface-variant">{stepInfo?.description}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveStep(i, -1)}
                    disabled={i === 0}
                    className="w-7 h-7 border border-primary flex items-center justify-center text-xs font-bold hover:bg-primary hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move up"
                  >&#8593;</button>
                  <button
                    onClick={() => moveStep(i, 1)}
                    disabled={i === steps.length - 1}
                    className="w-7 h-7 border border-primary flex items-center justify-center text-xs font-bold hover:bg-primary hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move down"
                  >&#8595;</button>
                  <button
                    onClick={() => removeStep(i)}
                    className="w-7 h-7 border border-secondary flex items-center justify-center text-xs font-bold hover:bg-secondary hover:text-white"
                    title="Remove step"
                  >&#10005;</button>
                </div>
              </div>
              {configs.length > 0 && (
                <div className="flex gap-4 flex-wrap">
                  {configs.map((cfg) => (
                    <div key={cfg.key} className="flex items-center gap-2">
                      <label className="text-xs font-headline font-bold uppercase">{cfg.label}:</label>
                      <select
                        value={String(step.config?.[cfg.key] ?? cfg.options[0]?.value ?? '')}
                        onChange={(e) => updateConfig(i, cfg.key, e.target.value)}
                        className="border border-primary bg-surface px-2 py-1 text-xs font-body"
                      >
                        {cfg.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-4 mb-6">
        <span className="font-headline font-bold text-xs uppercase">Add Step:</span>
        <div className="flex gap-2 flex-wrap">
          {STEP_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => addStep(opt.id)}
              className="border border-primary px-3 py-1 text-xs font-headline font-bold uppercase hover:bg-primary hover:text-white transition-colors"
            >
              + {opt.label}
            </button>
          ))}
        </div>
      </div>

      <Button variant="primary" onClick={onSave} disabled={saving || steps.length === 0}>
        {saving ? 'Saving...' : 'Save Pipeline'}
      </Button>
    </div>
  )
}

export default function Preprocessing() {
  const [page, setPage] = useState(1)
  const [editPipelineId, setEditPipelineId] = useState<string | null>(null)
  const [editSteps, setEditSteps] = useState<PipelineStep[]>([])
  const [pipelineName, setPipelineName] = useState('')

  const { data: datasetsData } = useDatasets()
  const { data: pipesData, isLoading, error, refetch } = usePipelines(page)
  const createPipeline = useCreatePipeline()
  const executePipeline = useExecutePipeline()
  const updatePipeline = useUpdatePipeline()

  const datasets = datasetsData?.items ?? []
  const pipelines = pipesData?.items ?? []

  const handleCreateNew = () => {
    const firstDataset = datasets[0]
    if (!firstDataset) return
    setEditPipelineId(null)
    setEditSteps([])
    setPipelineName('')
  }

  const handleEditPipeline = (p: typeof pipelines[0]) => {
    setEditPipelineId(p.id)
    setEditSteps(p.steps ?? [])
    setPipelineName(p.name)
  }

  const handleSave = () => {
    if (editPipelineId) {
      updatePipeline.mutate({ id: editPipelineId, body: { name: pipelineName, steps: editSteps } as any })
    } else {
      const firstDataset = datasets[0]
      if (!firstDataset) return
      createPipeline.mutate({ dataset_id: firstDataset.id, name: pipelineName || 'Auto Pipeline', steps: editSteps })
    }
    setEditPipelineId(null)
    setEditSteps([])
    setPipelineName('')
  }

  const statusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
      completed: 'success', running: 'warning', failed: 'danger', draft: 'info',
    }
    return <Badge variant={variants[status] ?? 'default'}>{status}</Badge>
  }

  const editing = editPipelineId !== null || editSteps.length > 0

  return (
    <div className="p-8 lg:p-12">
      <PageHeader
        title="Preprocessing"
        accent="Pipelines"
        subtitle="Build and execute data preprocessing pipelines."
        action={
          datasets.length > 0 ? (
            <Button variant="primary" size="sm" onClick={handleCreateNew} disabled={editing}>
              + New Pipeline
            </Button>
          ) : undefined
        }
      />

      {editing && (
        <div className="mb-10">
          <div className="mb-4">
            <label className="font-headline font-bold text-xs uppercase block mb-1">Pipeline Name</label>
            <input
              type="text"
              value={pipelineName}
              onChange={(e) => setPipelineName(e.target.value)}
              placeholder="My Pipeline"
              className="border-2 border-primary bg-surface p-3 w-full max-w-md font-body text-sm"
            />
          </div>
          <PipelineBuilder steps={editSteps} onChange={setEditSteps} onSave={handleSave} saving={createPipeline.isPending || updatePipeline.isPending} />
          <Button variant="ghost" size="sm" onClick={() => { setEditPipelineId(null); setEditSteps([]); setPipelineName('') }} className="mt-2">
            Cancel
          </Button>
        </div>
      )}

      {isLoading && <LoadingSpinner />}
      {error && <ErrorState message="Failed to load pipelines" onRetry={() => refetch()} />}

      {!isLoading && !error && pipelines.length === 0 && !editing && (
        <EmptyState
          icon="account_tree"
          title="No preprocessing pipelines yet"
          description="Create a pipeline to prepare your data for training."
          action={
            datasets.length > 0 ? (
              <Button onClick={handleCreateNew}>Create Pipeline</Button>
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
                  <p className="text-xs text-on-surface-variant">
                    Dataset: {datasets.find(d => d.id === p.dataset_id)?.name ?? p.dataset_id.slice(0, 8)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge(p.status)}
                  {p.status === 'draft' || p.status === 'failed' ? (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => handleEditPipeline(p as any)}>Edit</Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => executePipeline.mutate(p.id)}
                        disabled={executePipeline.isPending}
                      >
                        Execute
                      </Button>
                    </>
                  ) : p.status === 'completed' ? (
                    <Badge variant="success">Ready</Badge>
                  ) : null}
                </div>
              </div>
              {p.error_message && (
                <p className="text-secondary text-sm font-bold mb-2">{p.error_message}</p>
              )}
              <div className="flex gap-2 flex-wrap">
                {p.steps.map((s, i) => (
                  <span key={i} className="bg-surface-variant px-3 py-1 border border-primary text-xs font-headline font-bold uppercase flex items-center gap-2">
                    {i + 1}. {s.step_type.replace(/_/g, ' ')}
                    {(s.config?.strategy as string) && (
                      <span className="text-on-surface-variant font-normal">({String(s.config?.strategy)})</span>
                    )}
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