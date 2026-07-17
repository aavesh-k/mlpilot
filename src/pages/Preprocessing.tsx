import { useCallback, useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDatasets } from '../modules/datasets/hooks/useDatasets'
import {
  usePipelines,
  useCreatePipeline,
  useExecutePipeline,
  useUpdatePipeline,
  usePipelineSuggestions,
  useTargetDetection,
} from '../modules/pipelines/hooks/usePipelines'
import { PageHeader } from '../shared/components/PageHeader'
import { EmptyState } from '../shared/components/EmptyState'
import { ErrorState } from '../shared/components/ErrorState'
import { LoadingSpinner } from '../shared/components/LoadingSpinner'
import { Pagination } from '../shared/components/Pagination'
import { Button } from '../shared/components/ui/button'
import { Badge } from '../shared/components/ui/badge'
import { formatDate } from '../shared/utils/format'
import type { ColumnSuggestion, EncodingConfig, ScalingConfig, SplitConfig, FeatureSelectionConfig, TargetDetectionResult } from '../core/api/pipelines.api'

type Step = 'select-columns' | 'config' | 'review'

export default function Preprocessing() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [editPipelineId, setEditPipelineId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [pipelineName, setPipelineName] = useState('')
  const [selectedDatasetId, setSelectedDatasetId] = useState('')
  const [validationError, setValidationError] = useState('')
  const [step, setStep] = useState<Step>('select-columns')

  const [targetColumn, setTargetColumn] = useState('')
  const [problemType, setProblemType] = useState<string | null>(null)
  const [problemTypeOverride, setProblemTypeOverride] = useState<'classification' | 'regression' | null>(null)

  const [encodingStrategy, setEncodingStrategy] = useState<EncodingConfig['strategy']>('auto')
  const [passthroughCols, setPassthroughCols] = useState<string[]>([])
  const [scaleCols, setScaleCols] = useState<string[] | null>(null)
  const [scalingStrategy, setScalingStrategy] = useState<ScalingConfig['strategy']>('auto')

  const [testSize, setTestSize] = useState(0.2)
  const [stratify, setStratify] = useState(true)
  const [randomSeed, setRandomSeed] = useState(42)

  const [fsEnabled, setFsEnabled] = useState(false)
  const [fsDropLowVar, setFsDropLowVar] = useState(false)
  const [fsVarThreshold, setFsVarThreshold] = useState(0.01)
  const [fsDropHighCorr, setFsDropHighCorr] = useState(false)
  const [fsCorrThreshold, setFsCorrThreshold] = useState(0.95)

  const [useSmote, setUseSmote] = useState(false)
  const [useClassWeight, setUseClassWeight] = useState(false)

  const { data: datasetsData } = useDatasets()
  const { data: pipesData, isLoading, error, refetch } = usePipelines(page)
  const createPipeline = useCreatePipeline()
  const executePipeline = useExecutePipeline()
  const updatePipeline = useUpdatePipeline()
  const { data: suggestionsData, isLoading: suggestionsLoading } = usePipelineSuggestions(selectedDatasetId)
  const { data: targetInfo } = useTargetDetection(selectedDatasetId, targetColumn || undefined)

  const datasets = datasetsData?.items ?? []
  const cleanedDatasets = useMemo(() => datasets.filter((d) => d.status === 'ready'), [datasets])
  const pipelines = pipesData?.items ?? []

  const suggestions = suggestionsData?.columns ?? []
  const numericCols = suggestions.filter((c) => c.is_numeric).map((c) => c.name)
  const categoricalCols = suggestions.filter((c) => !c.is_numeric).map((c) => c.name)
  const allColumns = suggestions.map((c) => c.name)

  const targetDetectionResult = targetInfo ?? null

  useEffect(() => {
    if (targetDetectionResult) {
      setProblemType(targetDetectionResult.problem_type)
    }
  }, [targetDetectionResult])

  const handleSelectTarget = useCallback((col: string) => {
    setTargetColumn(col)
    setProblemType(null)
    setProblemTypeOverride(null)
  }, [])

  const handleCreateNew = useCallback(() => {
    const first = cleanedDatasets[0]
    if (!first) return
    setEditPipelineId(null)
    setIsCreating(true)
    setPipelineName('')
    setSelectedDatasetId(first.id)
    setStep('select-columns')
    setTargetColumn('')
    setProblemType(null)
    setProblemTypeOverride(null)
    setEncodingStrategy('auto')
    setPassthroughCols([])
    setScaleCols(null)
    setScalingStrategy('auto')
    setTestSize(0.2)
    setStratify(true)
    setRandomSeed(42)
    setFsEnabled(false)
    setFsDropLowVar(false)
    setFsVarThreshold(0.01)
    setFsDropHighCorr(false)
    setFsCorrThreshold(0.95)
    setUseSmote(false)
    setUseClassWeight(false)
    setValidationError('')
  }, [cleanedDatasets])

  const handleEditPipeline = useCallback((p: typeof pipelines[0]) => {
    setEditPipelineId(p.id)
    setPipelineName(p.name)
    setSelectedDatasetId(p.dataset_id)
    setTargetColumn(p.target_column || '')
    setProblemType(p.problem_type || null)
    setProblemTypeOverride(null)
    setEncodingStrategy(p.encoding?.strategy || 'auto')
    setScalingStrategy(p.scaling?.strategy || 'auto')
    setTestSize(p.split?.test_size ?? 0.2)
    setStratify(p.split?.stratify ?? true)
    setRandomSeed(p.split?.random_seed ?? 42)
    setFsEnabled(p.feature_selection?.enabled ?? false)
    setFsDropLowVar(p.feature_selection?.drop_near_zero_variance ?? false)
    setFsVarThreshold(p.feature_selection?.variance_threshold ?? 0.01)
    setFsDropHighCorr(p.feature_selection?.drop_high_correlation ?? false)
    setFsCorrThreshold(p.feature_selection?.correlation_threshold ?? 0.95)
    setUseSmote(p.use_smote ?? false)
    setUseClassWeight(p.use_class_weight ?? false)
    setStep('select-columns')
    setValidationError('')
  }, [])

  const resolvedProblemType = problemTypeOverride || problemType || 'classification'
  const isClassification = resolvedProblemType === 'classification'

  const handleSaveAndExecute = useCallback(() => {
    setValidationError('')
    if (!selectedDatasetId) { setValidationError('Select a dataset'); return }
    if (!targetColumn) { setValidationError('Select a target column'); return }

    const body = {
      dataset_id: selectedDatasetId,
      target_column: targetColumn,
      problem_type: resolvedProblemType,
      name: pipelineName || undefined,
      encoding: { strategy: encodingStrategy, passthrough_columns: passthroughCols.length > 0 ? passthroughCols : undefined, scale_columns: scaleCols } as EncodingConfig,
      scaling: { strategy: scalingStrategy } as ScalingConfig,
      split: { test_size: testSize, random_seed: randomSeed, stratify: isClassification ? stratify : false } as SplitConfig,
      feature_selection: {
        enabled: fsEnabled,
        drop_near_zero_variance: fsDropLowVar,
        variance_threshold: fsVarThreshold,
        drop_high_correlation: fsDropHighCorr,
        correlation_threshold: fsCorrThreshold,
      } as FeatureSelectionConfig,
      use_smote: useSmote,
      use_class_weight: useClassWeight,
    }

    const closeForm = () => {
      setEditPipelineId(null)
      setIsCreating(false)
      setStep('select-columns')
      refetch()
    }

    if (editPipelineId) {
      updatePipeline.mutate({ id: editPipelineId, body: body as any }, {
        onSuccess: () => {
          executePipeline.mutate(editPipelineId)
          closeForm()
        },
      })
    } else {
      createPipeline.mutate(body, {
        onSuccess: (pipeline) => {
          executePipeline.mutate(pipeline.id)
          closeForm()
        },
      })
    }
  }, [selectedDatasetId, targetColumn, resolvedProblemType, pipelineName, encodingStrategy, passthroughCols, scaleCols, scalingStrategy, testSize, randomSeed, isClassification, stratify, fsEnabled, fsDropLowVar, fsVarThreshold, fsDropHighCorr, fsCorrThreshold, useSmote, useClassWeight, editPipelineId, createPipeline, executePipeline, updatePipeline, refetch])

  const statusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
      completed: 'success', running: 'warning', failed: 'danger', draft: 'info',
    }
    return <Badge variant={variants[status] ?? 'default'}>{status}</Badge>
  }

  const editing = editPipelineId !== null || isCreating || step !== 'select-columns'

  return (
    <div className="p-8 lg:p-12">
      <PageHeader
        title="Preprocessing"
        accent="Pipeline"
        subtitle="Select target column, configure encoding/scaling/split, and execute."
        action={
          cleanedDatasets.length > 0 ? (
            <Button variant="primary" size="sm" onClick={handleCreateNew} disabled={editing}>
              + New Pipeline
            </Button>
          ) : undefined
        }
      />

      {editing && (
        <div className="mb-10 max-w-4xl">
          <div className="flex gap-2 mb-6 border-b-2 border-primary pb-2">
            {(['select-columns', 'config', 'review'] as const).map((s, i) => (
              <button
                key={s}
                onClick={() => setStep(s)}
                className={`px-4 py-2 font-headline font-bold text-xs uppercase transition-colors ${
                  step === s ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                {i + 1}. {s === 'select-columns' ? 'Target & Columns' : s === 'config' ? 'Config' : 'Review & Execute'}
              </button>
            ))}
          </div>

          {step === 'select-columns' && (
            <SelectColumnsStep
              datasets={cleanedDatasets}
              selectedDatasetId={selectedDatasetId}
              onSelectDataset={setSelectedDatasetId}
              columns={allColumns}
              suggestions={suggestions}
              targetColumn={targetColumn}
              onSelectTarget={handleSelectTarget}
              targetDetectionResult={targetDetectionResult}
              suggestionsLoading={suggestionsLoading}
              problemTypeOverride={problemTypeOverride}
              onProblemTypeOverride={setProblemTypeOverride}
              resolvedProblemType={resolvedProblemType}
              pipelineName={pipelineName}
              onPipelineNameChange={setPipelineName}
              onNext={() => setStep('config')}
            />
          )}

          {step === 'config' && (
            <ConfigStep
              numericCols={numericCols}
              categoricalCols={categoricalCols}
              suggestions={suggestions}
              isClassification={isClassification}
              encodingStrategy={encodingStrategy}
              onEncodingStrategyChange={setEncodingStrategy}
              passthroughCols={passthroughCols}
              onPassthroughChange={setPassthroughCols}
              scaleCols={scaleCols}
              onScaleColsChange={setScaleCols}
              scalingStrategy={scalingStrategy}
              onScalingStrategyChange={setScalingStrategy}
              testSize={testSize}
              onTestSizeChange={setTestSize}
              stratify={stratify}
              onStratifyChange={setStratify}
              randomSeed={randomSeed}
              onRandomSeedChange={setRandomSeed}
              fsEnabled={fsEnabled}
              onFsEnabledChange={setFsEnabled}
              fsDropLowVar={fsDropLowVar}
              onFsDropLowVarChange={setFsDropLowVar}
              fsVarThreshold={fsVarThreshold}
              onFsVarThresholdChange={setFsVarThreshold}
              fsDropHighCorr={fsDropHighCorr}
              onFsDropHighCorrChange={setFsDropHighCorr}
              fsCorrThreshold={fsCorrThreshold}
              onFsCorrThresholdChange={setFsCorrThreshold}
              useSmote={useSmote}
              onUseSmoteChange={setUseSmote}
              useClassWeight={useClassWeight}
              onUseClassWeightChange={setUseClassWeight}
              targetDetectionResult={targetDetectionResult}
              onPrev={() => setStep('select-columns')}
              onNext={() => setStep('review')}
            />
          )}

          {step === 'review' && (
            <ReviewStep
              datasetName={cleanedDatasets.find(d => d.id === selectedDatasetId)?.name ?? ''}
              targetColumn={targetColumn}
              problemType={resolvedProblemType}
              encodingStrategy={encodingStrategy}
              scalingStrategy={scalingStrategy}
              testSize={testSize}
              stratify={stratify && isClassification}
              fsEnabled={fsEnabled}
              fsDropLowVar={fsDropLowVar}
              fsDropHighCorr={fsDropHighCorr}
              useSmote={useSmote}
              useClassWeight={useClassWeight}
              targetDetectionResult={targetDetectionResult}
              onPrev={() => setStep('config')}
              onExecute={handleSaveAndExecute}
              isPending={createPipeline.isPending || executePipeline.isPending}
            />
          )}

          {validationError && (
            <p className="text-secondary font-headline font-bold text-xs mt-3">{validationError}</p>
          )}

          <Button variant="ghost" size="sm" onClick={() => { setEditPipelineId(null); setIsCreating(false); setStep('select-columns'); setPipelineName(''); setValidationError('') }} className="mt-4">
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
            cleanedDatasets.length > 0 ? (
              <Button onClick={handleCreateNew}>Create Pipeline</Button>
            ) : undefined
          }
        />
      )}

          {!isLoading && !error && pipelines.length > 0 && (
        <div className="space-y-4">
          {pipelines.map((p) => {
            return (
              <div key={p.id} className="bg-surface border-2 border-primary p-6 neo-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-headline font-bold text-lg">{p.name}</h3>
                    <p className="text-xs text-on-surface-variant">Created {formatDate(p.created_at)}</p>
                    <p className="text-xs text-on-surface-variant">
                      Target: <span className="font-bold">{p.target_column}</span> ({p.problem_type})
                    </p>
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
                      <div className="flex gap-2">
                        <Badge variant="success">{p.train_rows ?? '?'} train / {p.test_rows ?? '?'} test</Badge>
                        <Button variant="primary" size="sm" onClick={() => navigate(`/training?pipeline=${p.id}&dataset=${p.dataset_id}`)}>
                          Train Models
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
                {p.error_message && (
                  <p className="text-secondary text-sm font-bold mb-2">{p.error_message}</p>
                )}
                <div className="flex gap-2 flex-wrap text-xs">
                  <Badge variant="info">{p.problem_type}</Badge>
                  <Badge variant="info">enc: {p.encoding?.strategy ?? 'auto'}</Badge>
                  <Badge variant="info">scale: {p.scaling?.strategy ?? 'auto'}</Badge>
                  <Badge variant="info">split: {((p.split?.test_size ?? 0.2) * 100).toFixed(0)}/{((1 - (p.split?.test_size ?? 0.2)) * 100).toFixed(0)}</Badge>
                  {p.column_notes && Object.keys(p.column_notes).length > 0 && (
                    <Badge variant="info">{Object.keys(p.column_notes).length} cols processed</Badge>
                  )}
                </div>
              </div>
            )
          })}
          <Pagination page={pipesData!.page} perPage={pipesData!.per_page} total={pipesData!.total} onPageChange={setPage} />
        </div>
      )}
    </div>
  )
}

function SelectColumnsStep({
  datasets, selectedDatasetId, onSelectDataset,
  columns, suggestions, targetColumn, onSelectTarget,
  targetDetectionResult, suggestionsLoading,
  problemTypeOverride, onProblemTypeOverride,
  resolvedProblemType, pipelineName, onPipelineNameChange, onNext,
}: {
  datasets: { id: string; name: string }[]
  selectedDatasetId: string
  onSelectDataset: (id: string) => void
  columns: string[]
  suggestions: ColumnSuggestion[]
  targetColumn: string
  onSelectTarget: (col: string) => void
  targetDetectionResult: TargetDetectionResult | null
  suggestionsLoading: boolean
  problemTypeOverride: string | null
  onProblemTypeOverride: (v: 'classification' | 'regression' | null) => void
  resolvedProblemType: string
  pipelineName: string
  onPipelineNameChange: (v: string) => void
  onNext: () => void
}) {
  return (
    <div className="bg-surface border-2 border-primary p-6 neo-shadow">
      <h4 className="font-headline font-black text-lg uppercase mb-6">1. Select Target & Columns</h4>

      <div className="mb-5">
        <label className="font-headline font-bold text-xs uppercase block mb-2">Dataset</label>
        <select
          value={selectedDatasetId}
          onChange={(e) => onSelectDataset(e.target.value)}
          className="border-2 border-primary bg-surface p-3 w-full max-w-md font-body text-sm"
        >
          <option value="">-- Select --</option>
          {datasets.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      <div className="mb-5">
        <label className="font-headline font-bold text-xs uppercase block mb-2">Pipeline Name</label>
        <input
          type="text"
          value={pipelineName}
          onChange={(e) => onPipelineNameChange(e.target.value)}
          placeholder="My Pipeline"
          className="border-2 border-primary bg-surface p-3 w-full max-w-md font-body text-sm"
        />
      </div>

      {suggestionsLoading && <LoadingSpinner />}

      {columns.length > 0 && !suggestionsLoading && (
        <div className="mb-5">
          <label className="font-headline font-bold text-xs uppercase block mb-2">Target Column</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-60 overflow-y-auto border-2 border-primary p-3">
            {columns.map((col) => {
              const suggestion = suggestions.find(s => s.name === col)
              const isTarget = targetColumn === col
              const isNumeric = suggestion?.is_numeric ?? false
              const cardinality = suggestion?.cardinality ?? 0
              return (
                <button
                  key={col}
                  onClick={() => onSelectTarget(col)}
                  className={`p-3 border-2 text-left text-xs transition-all ${
                    isTarget
                      ? 'border-primary bg-primary text-white'
                      : 'border-primary bg-surface-variant/20 hover:bg-surface-variant'
                  }`}
                >
                  <span className="font-headline font-bold block truncate">{col}</span>
                  <span className="text-[10px] opacity-70 block mt-1">
                    {isNumeric ? 'numeric' : 'categorical'} · {cardinality} unique
                  </span>
                  {isTarget && (
                    <span className="text-[10px] font-bold block mt-1">
                      {resolvedProblemType.toUpperCase()}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {targetDetectionResult && (
        <div className="mb-5 p-4 border-2 border-primary bg-surface-variant/20">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-headline font-bold text-sm uppercase">
              Detected: <span className={targetDetectionResult.problem_type === 'classification' ? 'text-tertiary' : 'text-secondary'}>{targetDetectionResult.problem_type}</span>
            </span>
            <span className="text-xs text-on-surface-variant">{targetDetectionResult.unique_values} unique values · {targetDetectionResult.dtype}</span>
            <select
              value={problemTypeOverride ?? targetDetectionResult.problem_type}
              onChange={(e) => onProblemTypeOverride(e.target.value as 'classification' | 'regression')}
              className="border border-primary bg-surface px-2 py-1 text-xs font-body"
            >
              <option value="classification">Override: Classification</option>
              <option value="regression">Override: Regression</option>
            </select>
          </div>
          {targetDetectionResult.imbalance?.is_imbalanced && (
            <div className="mt-3 p-3 border-2 border-secondary bg-secondary/10">
              <p className="font-headline font-bold text-xs uppercase text-secondary">Class Imbalance Detected</p>
              <p className="text-xs mt-1">
                Ratio {targetDetectionResult.imbalance.imbalance_ratio.toFixed(1)}:1
                (majority: {targetDetectionResult.imbalance.majority_class} @ {(targetDetectionResult.imbalance.majority_pct * 100).toFixed(0)}%,
                minority: {targetDetectionResult.imbalance.minority_class} @ {(targetDetectionResult.imbalance.minority_pct * 100).toFixed(0)}%)
              </p>
            </div>
          )}
        </div>
      )}

      <Button variant="primary" onClick={onNext} disabled={!targetColumn}>
        Next: Configure Pipeline
      </Button>
    </div>
  )
}

function ConfigStep({
  numericCols, categoricalCols, suggestions, isClassification,
  encodingStrategy, onEncodingStrategyChange,
  passthroughCols, onPassthroughChange, scaleCols, onScaleColsChange,
  scalingStrategy, onScalingStrategyChange,
  testSize, onTestSizeChange, stratify, onStratifyChange, randomSeed, onRandomSeedChange,
  fsEnabled, onFsEnabledChange, fsDropLowVar, onFsDropLowVarChange, fsVarThreshold, onFsVarThresholdChange,
  fsDropHighCorr, onFsDropHighCorrChange, fsCorrThreshold, onFsCorrThresholdChange,
  useSmote, onUseSmoteChange, useClassWeight, onUseClassWeightChange,
  targetDetectionResult, onPrev, onNext,
}: {
  numericCols: string[]
  categoricalCols: string[]
  suggestions: ColumnSuggestion[]
  isClassification: boolean
  encodingStrategy: string
  onEncodingStrategyChange: (v: EncodingConfig['strategy']) => void
  passthroughCols: string[]
  onPassthroughChange: (v: string[]) => void
  scaleCols: string[] | null
  onScaleColsChange: (v: string[] | null) => void
  scalingStrategy: string
  onScalingStrategyChange: (v: ScalingConfig['strategy']) => void
  testSize: number
  onTestSizeChange: (v: number) => void
  stratify: boolean
  onStratifyChange: (v: boolean) => void
  randomSeed: number
  onRandomSeedChange: (v: number) => void
  fsEnabled: boolean
  onFsEnabledChange: (v: boolean) => void
  fsDropLowVar: boolean
  onFsDropLowVarChange: (v: boolean) => void
  fsVarThreshold: number
  onFsVarThresholdChange: (v: number) => void
  fsDropHighCorr: boolean
  onFsDropHighCorrChange: (v: boolean) => void
  fsCorrThreshold: number
  onFsCorrThresholdChange: (v: number) => void
  useSmote: boolean
  onUseSmoteChange: (v: boolean) => void
  useClassWeight: boolean
  onUseClassWeightChange: (v: boolean) => void
  targetDetectionResult: TargetDetectionResult | null
  onPrev: () => void
  onNext: () => void
}) {
  const catCount = categoricalCols.length
  const highCardCols = suggestions.filter(s => !s.is_numeric && s.cardinality > 10).map(s => s.name)

  const togglePassthrough = (col: string) => {
    onPassthroughChange(
      passthroughCols.includes(col)
        ? passthroughCols.filter(c => c !== col)
        : [...passthroughCols, col]
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-surface border-2 border-primary p-6 neo-shadow">
        <h4 className="font-headline font-black text-lg uppercase mb-4">2. Configure Pipeline</h4>

        <Section label="Categorical Encoding" description={`${catCount} categorical column(s)`}>
          <div className="flex items-center gap-3 mb-3">
            <select
              value={encodingStrategy}
              onChange={(e) => onEncodingStrategyChange(e.target.value as EncodingConfig['strategy'])}
              className="border-2 border-primary bg-surface px-3 py-2 text-sm font-body"
            >
              <option value="auto">Auto (smart per column)</option>
              <option value="one_hot">One-Hot (all columns)</option>
              <option value="target">Target Encoding</option>
              <option value="frequency">Frequency Encoding</option>
            </select>
            <span className="text-xs text-on-surface-variant">
              {encodingStrategy === 'auto' ? `One-hot for low-cardinality, target/frequency for high-cardinality (${highCardCols.length} high-card cols)` :
               encodingStrategy === 'one_hot' ? `One-hot encodes all ${catCount} categorical columns. WARNING: high cardinality will produce many columns.` :
               encodingStrategy === 'target' ? 'Replaces each category with the mean target value. Prevents high-dimensional explosion.' :
               'Replaces each category with its frequency count.'}
            </span>
          </div>
          {catCount > 0 && (
            <div className="mt-3">
              <p className="font-headline font-bold text-xs uppercase mb-2">Passthrough (skip encoding, keep as-is):</p>
              <div className="flex flex-wrap gap-2">
                {categoricalCols.map((col) => (
                  <button
                    key={col}
                    onClick={() => togglePassthrough(col)}
                    className={`px-2 py-1 text-xs border border-primary ${
                      passthroughCols.includes(col) ? 'bg-primary text-white' : 'bg-surface-variant/20'
                    }`}
                  >
                    {col}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Section>

        <Section label="Feature Scaling" description="Standardize or normalize numeric features">
          <div className="flex items-center gap-3 mb-3">
            <select
              value={scalingStrategy}
              onChange={(e) => onScalingStrategyChange(e.target.value as ScalingConfig['strategy'])}
              className="border-2 border-primary bg-surface px-3 py-2 text-sm font-body"
            >
              <option value="auto">Auto (Standard if no outliers, Robust if outliers present)</option>
              <option value="standard">StandardScaler (z-score)</option>
              <option value="minmax">MinMaxScaler (0-1 range)</option>
              <option value="robust">RobustScaler (IQR-based)</option>
            </select>
          </div>
          <div className="mt-2">
            <p className="font-headline font-bold text-xs uppercase mb-2">Columns to scale (default: all numeric):</p>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
              {numericCols.map((col) => (
                <button
                  key={col}
                  onClick={() => {
                    const current = scaleCols ?? numericCols
                    onScaleColsChange(
                      current.includes(col)
                        ? current.filter(c => c !== col)
                        : [...current, col]
                    )
                  }}
                  className={`px-2 py-1 text-xs border border-primary ${
                    (scaleCols ?? numericCols).includes(col) ? 'bg-primary text-white' : 'bg-surface-variant/20'
                  }`}
                >
                  {col}
                </button>
              ))}
            </div>
          </div>
        </Section>

        <Section label="Train / Test Split" description="Divide data for training and evaluation">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="text-xs font-headline font-bold uppercase">Test Size:</span>
              <input
                type="range"
                min={0.05}
                max={0.5}
                step={0.05}
                value={testSize}
                onChange={(e) => onTestSizeChange(parseFloat(e.target.value))}
                className="w-32"
              />
              <span className="font-headline font-bold text-sm">{Math.round(testSize * 100)}% test</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-headline font-bold uppercase">Seed:</span>
              <input
                type="number"
                value={randomSeed}
                onChange={(e) => onRandomSeedChange(parseInt(e.target.value) || 0)}
                className="border border-primary bg-surface px-2 py-1 w-20 text-sm font-body"
              />
            </div>
            {isClassification && (
              <label className="flex items-center gap-2 text-xs font-headline font-bold uppercase cursor-pointer">
                <input type="checkbox" checked={stratify} onChange={(e) => onStratifyChange(e.target.checked)} className="w-4 h-4" />
                Stratified Split
              </label>
            )}
          </div>
        </Section>

        {isClassification && (
          <Section label="Class Imbalance Handling" description={`${targetDetectionResult?.imbalance?.is_imbalanced ? '⚠ Imbalance detected' : 'Classes appear balanced'}`}>
            <div className="flex items-center gap-6 flex-wrap">
              <label className="flex items-center gap-2 text-xs font-headline font-bold uppercase cursor-pointer">
                <input type="checkbox" checked={useSmote} onChange={(e) => onUseSmoteChange(e.target.checked)} className="w-4 h-4" />
                Apply SMOTE (synthetic oversampling)
              </label>
              <label className="flex items-center gap-2 text-xs font-headline font-bold uppercase cursor-pointer">
                <input type="checkbox" checked={useClassWeight} onChange={(e) => onUseClassWeightChange(e.target.checked)} className="w-4 h-4" />
                Use class weighting (adjusted for imbalance)
              </label>
            </div>
            {targetDetectionResult?.imbalance && (
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(targetDetectionResult.imbalance.distribution).map(([cls, info]) => (
                  <span key={cls} className="px-2 py-1 text-xs border border-primary bg-surface-variant/20">
                    {cls}: {(info.percent * 100).toFixed(1)}% ({info.count})
                  </span>
                ))}
              </div>
            )}
          </Section>
        )}

        <Section label="Feature Selection (Optional)" description="Drop uninformative features before training">
          <label className="flex items-center gap-2 text-xs font-headline font-bold uppercase cursor-pointer mb-3">
            <input type="checkbox" checked={fsEnabled} onChange={(e) => onFsEnabledChange(e.target.checked)} className="w-4 h-4" />
            Enable feature selection
          </label>
          {fsEnabled && (
            <div className="ml-4 space-y-3">
              <label className="flex items-center gap-2 text-xs font-headline font-bold uppercase cursor-pointer">
                <input type="checkbox" checked={fsDropLowVar} onChange={(e) => onFsDropLowVarChange(e.target.checked)} className="w-4 h-4" />
                Drop near-zero variance features
              </label>
              {fsDropLowVar && (
                <div className="ml-6 flex items-center gap-2">
                  <span className="text-xs font-headline font-bold uppercase">Threshold:</span>
                  <input
                    type="number"
                    value={fsVarThreshold}
                    onChange={(e) => onFsVarThresholdChange(parseFloat(e.target.value) || 0)}
                    step={0.005}
                    min={0}
                    className="border border-primary bg-surface px-2 py-1 w-20 text-sm font-body"
                  />
                </div>
              )}
              <label className="flex items-center gap-2 text-xs font-headline font-bold uppercase cursor-pointer">
                <input type="checkbox" checked={fsDropHighCorr} onChange={(e) => onFsDropHighCorrChange(e.target.checked)} className="w-4 h-4" />
                Drop highly correlated features (redundancy removal)
              </label>
              {fsDropHighCorr && (
                <div className="ml-6 flex items-center gap-2">
                  <span className="text-xs font-headline font-bold uppercase">Corr threshold:</span>
                  <input
                    type="number"
                    value={fsCorrThreshold}
                    onChange={(e) => onFsCorrThresholdChange(parseFloat(e.target.value) || 0)}
                    step={0.05}
                    min={0}
                    max={1}
                    className="border border-primary bg-surface px-2 py-1 w-20 text-sm font-body"
                  />
                </div>
              )}
            </div>
          )}
        </Section>

        <div className="mt-8 flex gap-4">
          <Button variant="ghost" onClick={onPrev}>Back</Button>
          <Button variant="primary" onClick={onNext}>Review & Execute</Button>
        </div>
      </div>
    </div>
  )
}

function Section({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div className="border-2 border-primary p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h5 className="font-headline font-bold text-sm uppercase">{label}</h5>
        <span className="text-xs text-on-surface-variant">{description}</span>
      </div>
      {children}
    </div>
  )
}

function ReviewStep({
  datasetName, targetColumn, problemType, encodingStrategy, scalingStrategy,
  testSize, stratify, fsEnabled, fsDropLowVar, fsDropHighCorr,
  useSmote, useClassWeight, targetDetectionResult, onPrev, onExecute, isPending,
}: {
  datasetName: string
  targetColumn: string
  problemType: string
  encodingStrategy: string
  scalingStrategy: string
  testSize: number
  stratify: boolean
  fsEnabled: boolean
  fsDropLowVar: boolean
  fsDropHighCorr: boolean
  useSmote: boolean
  useClassWeight: boolean
  targetDetectionResult: TargetDetectionResult | null
  onPrev: () => void
  onExecute: () => void
  isPending: boolean
}) {
  return (
    <div className="bg-surface border-2 border-primary p-6 neo-shadow">
      <h4 className="font-headline font-black text-lg uppercase mb-6">3. Review & Execute</h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <ReviewCard label="Dataset" value={datasetName} />
        <ReviewCard label="Target Column" value={targetColumn} />
        <ReviewCard label="Problem Type" value={problemType.toUpperCase()} />
        <ReviewCard label="Encoding" value={encodingStrategy === 'auto' ? 'Auto (smart per column)' : encodingStrategy} />
        <ReviewCard label="Scaling" value={scalingStrategy === 'auto' ? 'Auto (based on outliers)' : scalingStrategy} />
        <ReviewCard label="Test Split" value={`${Math.round(testSize * 100)}%`} />
        <ReviewCard label="Stratify" value={stratify ? 'Yes' : 'No'} />
        <ReviewCard label="Feature Selection" value={fsEnabled ? `Yes (${[fsDropLowVar ? 'low-var' : '', fsDropHighCorr ? 'high-corr' : ''].filter(Boolean).join(', ')})` : 'Disabled'} />
        <ReviewCard label="SMOTE" value={useSmote ? 'Yes' : 'No'} />
        <ReviewCard label="Class Weighting" value={useClassWeight ? 'Yes' : 'No'} />
      </div>

      {targetDetectionResult?.imbalance?.is_imbalanced && (
        <div className="p-4 border-2 border-secondary bg-secondary/10 mb-6">
          <p className="font-headline font-bold text-xs uppercase text-secondary">
            ⚠ Class Imbalance: {targetDetectionResult.imbalance.imbalance_ratio.toFixed(1)}:1
          </p>
          <p className="text-xs mt-1">
            Consider enabling SMOTE or class weighting if classification performance is poor on the minority class.
          </p>
        </div>
      )}

      <div className="p-4 border-2 border-primary bg-surface-variant/20 mb-6">
        <p className="font-headline font-bold text-xs uppercase mb-1">What will happen:</p>
        <ul className="text-xs space-y-1 text-on-surface-variant">
          <li>• The dataset will be split into train ({Math.round((1 - testSize) * 100)}%) and test ({Math.round(testSize * 100)}%) sets</li>
          <li>• Encoders and scalers will be fitted on the training set only (no data leakage)</li>
          <li>• The test set will be transformed using the fitted encoders/scalers</li>
          <li>• A fitted sklearn Pipeline will be saved for reuse during model training</li>
          <li>• Processed data will be stored as Parquet files</li>
        </ul>
      </div>

      <div className="flex gap-4">
        <Button variant="ghost" onClick={onPrev}>Back</Button>
        <Button variant="primary" onClick={onExecute} disabled={isPending}>
          {isPending ? 'Saving & Executing...' : 'Execute Pipeline'}
        </Button>
      </div>
    </div>
  )
}

function ReviewCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-primary p-4 bg-surface-variant/10">
      <span className="block font-headline text-[10px] font-bold uppercase text-on-surface-variant">{label}</span>
      <span className="block font-headline font-bold text-sm mt-1">{value}</span>
    </div>
  )
}
