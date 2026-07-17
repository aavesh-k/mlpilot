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
import { CONFIG } from '../core/config'
import { FileSpreadsheet, FileArchive, Code, Award, FileText, ChevronRight, Crown } from 'lucide-react'

export default function Results() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const { data, isLoading, error, refetch } = useModels(page)
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)

  const models = data?.items ?? []
  const completedModels = models.filter((m) => m.status === 'completed')
  const runningCount = models.filter((m) => m.status === 'running' || m.status === 'queued').length
  const failedCount = models.filter((m) => m.status === 'failed').length

  // Find currently selected model
  const selectedModel = models.find((m) => m.id === selectedModelId) || completedModels[0]

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
        subtitle={`${completedModels.length} completed · ${runningCount} in progress · ${failedCount} failed`}
      />

      {models.length === 0 ? (
        <EmptyState
          icon="summarize"
          title="No results yet"
          description="Complete a training run to see results here."
          action={<Button onClick={() => navigate('/training')}>Go to Training</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Models Table List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-surface border-2 border-primary overflow-x-auto neo-shadow-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b-2 border-primary">
                    <th className="p-4 font-headline font-bold text-xs uppercase">Model Name</th>
                    <th className="p-4 font-headline font-bold text-xs uppercase">Algorithm</th>
                    <th className="p-4 font-headline font-bold text-xs uppercase text-center">Score</th>
                    <th className="p-4 font-headline font-bold text-xs uppercase">Status</th>
                    <th className="p-4 font-headline font-bold text-xs uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {models.map((m) => {
                    const isSelected = selectedModel?.id === m.id
                    const isRegression = m.metrics && ('r2' in m.metrics)
                    const scoreVal = m.metrics
                      ? (isRegression ? m.metrics.r2 : m.metrics.accuracy)
                      : null

                    return (
                      <tr
                        key={m.id}
                        onClick={() => m.status === 'completed' && setSelectedModelId(m.id)}
                        className={`border-b border-primary last:border-b-0 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-primary-container/40'
                            : 'hover:bg-surface-variant/30'
                        }`}
                      >
                        <td className="p-4 font-headline font-bold text-sm">
                          <div className="flex items-center gap-1.5">
                            {m.name}
                            {m.is_best && <Crown className="w-3.5 h-3.5 text-yellow-600 fill-yellow-600" />}
                          </div>
                          <span className="text-[10px] text-on-surface-variant block font-mono">
                            {m.id.slice(0, 8)}
                          </span>
                        </td>
                        <td className="p-4 font-body text-sm capitalize">{m.algorithm.replace(/_/g, ' ')}</td>
                        <td className="p-4 font-body text-sm font-bold text-center">
                          {typeof scoreVal === 'number' ? scoreVal.toFixed(3) : '—'}
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
                        <td className="p-4 text-right">
                          {m.status === 'completed' && (
                            <span className="inline-flex items-center gap-1 text-xs font-headline font-bold uppercase text-primary">
                              View Hub <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={data!.page} perPage={data!.per_page} total={data!.total} onPageChange={setPage} />
          </div>

          {/* Model Export Details Panel */}
          <div className="lg:col-span-1">
            {selectedModel ? (
              <div className="bg-surface border-2 border-primary p-6 neo-shadow space-y-6">
                {/* Header */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant={selectedModel.is_best ? 'success' : 'default'} className="text-[9px]">
                      {selectedModel.is_best ? '🏆 Best Model' : 'Candidate Model'}
                    </Badge>
                    <span className="text-[10px] font-mono text-on-surface-variant">{selectedModel.id.slice(0, 8)}</span>
                  </div>
                  <h3 className="font-headline font-black text-xl uppercase tracking-tight">{selectedModel.name}</h3>
                  <p className="text-xs text-on-surface-variant capitalize">
                    {selectedModel.algorithm.replace(/_/g, ' ')} estimator
                  </p>
                </div>

                {/* Briefing */}
                <div className="bg-yellow-100 border-l-4 border-primary p-4 text-xs font-body text-primary-dark">
                  <p className="font-headline font-black text-[10px] uppercase mb-1 tracking-wider">Executive Briefing</p>
                  This model was successfully trained on features extracted from target column <span className="font-bold">"{selectedModel.target_column}"</span>. 
                  It ranked highest on metrics and is compiled with preprocessing rules.
                </div>

                {/* Performance Metrics Badges */}
                <div className="border border-primary p-4">
                  <p className="font-headline font-black text-[10px] uppercase mb-3 tracking-wider text-on-surface-variant">Validation Performance</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(selectedModel.metrics || {}).map(([key, val]) => (
                      <div key={key} className="border border-primary/20 bg-surface-variant/20 p-2 text-center">
                        <span className="font-headline font-bold text-[9px] uppercase text-on-surface-variant block truncate">
                          {key.replace(/_/g, ' ')}
                        </span>
                        <span className="font-mono text-sm font-bold">
                          {typeof val === 'number' ? val.toFixed(3) : val}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Downloads Hub */}
                <div className="space-y-3">
                  <p className="font-headline font-black text-[10px] uppercase tracking-wider text-on-surface-variant">Reporting & Export Hub</p>
                  
                  {/* HTML Report */}
                  <a
                    href={`${CONFIG.API_BASE_URL}/training/models/${selectedModel.id}/export/report`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3 border border-primary bg-surface hover:bg-surface-variant/20 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      <div className="text-left">
                        <p className="font-headline font-bold text-xs">Executive HTML Report</p>
                        <p className="text-[10px] text-on-surface-variant">Includes EDA log, leaderboard & base64 plots</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </a>

                  {/* Cleaned CSV */}
                  <a
                    href={`${CONFIG.API_BASE_URL}/training/models/${selectedModel.id}/export/cleaned`}
                    download
                    className="flex items-center justify-between p-3 border border-primary bg-surface hover:bg-surface-variant/20 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                      <div className="text-left">
                        <p className="font-headline font-bold text-xs">Cleaned Dataset (CSV)</p>
                        <p className="text-[10px] text-on-surface-variant">Outliers capped & missing cells imputed</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </a>

                  {/* Preprocessed ZIP */}
                  {selectedModel.pipeline_id && (
                    <a
                      href={`${CONFIG.API_BASE_URL}/training/models/${selectedModel.id}/export/preprocessed`}
                      download
                      className="flex items-center justify-between p-3 border border-primary bg-surface hover:bg-surface-variant/20 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <FileArchive className="w-5 h-5 text-amber-600" />
                        <div className="text-left">
                          <p className="font-headline font-bold text-xs">Preprocessed splits (ZIP)</p>
                          <p className="text-[10px] text-on-surface-variant">Train/test splits in CSV format</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </a>
                  )}

                  {/* Python Recipe */}
                  <a
                    href={`${CONFIG.API_BASE_URL}/training/models/${selectedModel.id}/export/recipe`}
                    download
                    className="flex items-center justify-between p-3 border border-primary bg-surface hover:bg-surface-variant/20 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <Code className="w-5 h-5 text-violet-600" />
                      <div className="text-left">
                        <p className="font-headline font-bold text-xs">Python Inference Recipe</p>
                        <p className="text-[10px] text-on-surface-variant">Replicate pipeline cleaning & model execution</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </a>

                  {/* Trained Model ZIP */}
                  <a
                    href={`${CONFIG.API_BASE_URL}/training/models/${selectedModel.id}/download`}
                    download
                    className="flex items-center justify-between p-3 border border-primary bg-surface hover:bg-surface-variant/20 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <Award className="w-5 h-5 text-blue-600" />
                      <div className="text-left">
                        <p className="font-headline font-bold text-xs">Trained Model bundle (ZIP)</p>
                        <p className="text-[10px] text-on-surface-variant">Pickled estimator and pipeline transformers</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="bg-surface border-2 border-primary border-dashed p-12 text-center neo-shadow">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant block mb-2">info</span>
                <span className="font-headline font-bold text-sm uppercase text-on-surface-variant">
                  Select a model to view download hub
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
