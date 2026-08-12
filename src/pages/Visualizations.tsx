import { useState } from 'react'
import { useModels, useModelPlots } from '../modules/training/hooks/useTraining'
import { PageHeader } from '../shared/components/PageHeader'
import { EmptyState } from '../shared/components/EmptyState'
import { ErrorState } from '../shared/components/ErrorState'
import { LoadingSpinner, SkeletonCard } from '../shared/components/LoadingSpinner'
import { Button } from '../shared/components/ui/button'
import { Badge } from '../shared/components/ui/badge'
import { Download } from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  Legend
} from 'recharts'

export default function Visualizations() {
  const { data: modelsData, isLoading: modelsLoading } = useModels(1)
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>()

  const models = modelsData?.items ?? []
  const completedModels = models.filter((m) => m.metrics)

  // Auto-select first model if none selected
  if (completedModels.length > 0 && !selectedModelId) {
    setSelectedModelId(completedModels[0].id)
  }

  const { data: plotsData, isLoading: plotsLoading, error: plotsError } = useModelPlots(selectedModelId)

  // PNG Export Helper
  const handleExportPng = (containerId: string, filename: string) => {
    const container = document.getElementById(containerId)
    if (!container) return

    const svgElement = container.querySelector('svg')
    if (!svgElement) return

    const svgString = new XMLSerializer().serializeToString(svgElement)
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const URL = window.URL || window.webkitURL || window
    const blobURL = URL.createObjectURL(svgBlob)

    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      const rect = svgElement.getBoundingClientRect()
      canvas.width = rect.width * 2
      canvas.height = rect.height * 2
      const context = canvas.getContext('2d')
      if (context) {
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.scale(2, 2)
        context.drawImage(image, 0, 0, rect.width, rect.height)

        const pngURL = canvas.toDataURL('image/png')
        const downloadLink = document.createElement('a')
        downloadLink.href = pngURL
        downloadLink.download = `${filename}.png`
        document.body.appendChild(downloadLink)
        downloadLink.click()
        document.body.removeChild(downloadLink)
      }
      URL.revokeObjectURL(blobURL)
    }
    image.src = blobURL
  }

  return (
    <div className="p-8 lg:p-12">
      <PageHeader
        title="Post-Training"
        accent="Visualizations"
        subtitle="Analyze models using confusion matrices, ROC/PR curves, feature importances, and residual plots."
      />

      {modelsLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : completedModels.length === 0 ? (
        <EmptyState
          icon="monitoring"
          title="No trained models available"
          description="Complete a model training pipeline run first to populate visualizations."
        />
      ) : (
        <>
          {/* Models selector tabs */}
          <div className="flex gap-2 mb-8 flex-wrap border-b-2 border-primary pb-4">
            {completedModels.map((m) => (
              <Button
                key={m.id}
                variant={selectedModelId === m.id ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedModelId(m.id)}
              >
                {m.name} {m.is_best ? '👑' : ''}
              </Button>
            ))}
          </div>

          {plotsLoading && (
            <div className="flex flex-col items-center justify-center py-20">
              <LoadingSpinner />
              <p className="text-sm font-headline font-bold uppercase mt-4">Generating Diagnostic Plots...</p>
            </div>
          )}

          {plotsError && (
            <ErrorState title="Failed to load visualizations" message="Could not compile model diagnostic plots." />
          )}

          {!plotsLoading && !plotsError && plotsData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {plotsData.problem_type === 'classification' && plotsData.classification ? (
                <>
                  {/* Confusion Matrix */}
                  <ConfusionMatrixCard matrixData={plotsData.classification.confusion_matrix} />

                  {/* ROC Curve */}
                  <RocCurveCard rocData={plotsData.classification.roc_curve} exportPng={handleExportPng} />

                  {/* PR Curve (Optional, class imbalanced only) */}
                  {plotsData.classification.pr_curve && (
                    <PrCurveCard prData={plotsData.classification.pr_curve} exportPng={handleExportPng} />
                  )}

                  {/* Feature Importance */}
                  <FeatureImportanceCard
                    importanceData={plotsData.classification.feature_importance}
                    exportPng={handleExportPng}
                  />

                  {/* Classification Report */}
                  <ClassificationReportCard reportData={plotsData.classification.classification_report} />
                </>
              ) : (
                <>
                  {/* Predicted vs Actual */}
                  <PredictedVsActualCard
                    scatterData={plotsData.regression!.pred_vs_actual}
                    exportPng={handleExportPng}
                  />

                  {/* Residuals Plot */}
                  <ResidualsCard
                    residualsData={plotsData.regression!.residuals}
                    exportPng={handleExportPng}
                  />

                  {/* Error Distribution Histogram */}
                  <ErrorDistributionCard
                    histogramData={plotsData.regression!.error_distribution}
                    exportPng={handleExportPng}
                  />

                  {/* Feature Importance */}
                  <FeatureImportanceCard
                    importanceData={plotsData.regression!.feature_importance}
                    exportPng={handleExportPng}
                  />
                </>
              )}

              {/* Learning Curve */}
              <LearningCurveCard curveData={plotsData.learning_curve} exportPng={handleExportPng} />

              {/* Model Comparison */}
              <ModelComparisonCard
                comparisonData={plotsData.model_comparison}
                exportPng={handleExportPng}
                problemType={plotsData.problem_type}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ==========================================
// VISUALIZATION CHILD CARDS
// ==========================================

/* 1. Confusion Matrix Heatmap */
function ConfusionMatrixCard({ matrixData }: { matrixData: any }) {
  const { classes, matrix } = matrixData
  const total = matrix.flat().reduce((sum: number, val: number) => sum + val, 0)

  return (
    <div className="bg-surface border-2 border-primary p-6 neo-shadow flex flex-col h-full">
      <h3 className="font-headline font-black text-lg uppercase mb-2">Confusion Matrix Heatmap</h3>
      <p className="text-xs text-on-surface-variant mb-2">True classes (rows) vs Predicted classes (columns)</p>
      <p className="text-xs text-on-surface-variant small-print">Darker cells indicate more predictions</p>
      <div className="flex-1 flex flex-col-reverse items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-2 text-xs text-on-surface-variant">
          {matrix.map((row: number[], rIdx: number) => (
            <div key={rIdx} className="flex">
              <div className="w-16 h-16 border-r border-b border-primary last:border-b-0 bg-surface-variant/40 flex items-center justify-center font-headline font-bold text-xs p-1 text-center truncate">
                {classes[rIdx]}
              </div>
              {row.map((val: number, cIdx: number) => (
                <div
                  key={cIdx}
                  className="w-20 h-16 border-r border-b border-primary last:border-r-0 last:border-b-0 flex flex-col items-center justify-center relative group"
                >
                  <span className="font-headline font-black text-sm">{val}</span>
                  <span className="text-[9px] text-on-surface-variant mt-0.5">
                    {total > 0 ? `${((val / total) * 100).toFixed(0)}%` : ''}
                  </span>
                  <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 bg-primary text-white text-[9px] px-2 py-1 pointer-events-none whitespace-nowrap z-10 neo-shadow-sm mb-1">
                    True: {classes[rIdx]} · Pred: {classes[cIdx]}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        {/* Color legend */}
        <div className="mt-4 flex items-center justify-center text-xs text-on-surface-variant">
          <span className="mr-2">Coverage:</span>
          {matrix.flat().map((val, i) => (
            <span key={i} className="mr-1">
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  background: `rgba(37, 99, 235, ${0.05 + (val / total) * 0.95})`,
                  border: '1px solid #a8a29e',
                  display: 'inline-block',
                }}
                title={`${((val / total) * 100).toFixed(0)}%`}
                />
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* 2. ROC Curve */
interface CurvePlotItem {
  fpr?: number
  tpr?: number
  precision?: number
  recall?: number
  [key: string]: any
}

function RocCurveCard({ rocData, exportPng }: { rocData: any; exportPng: any }) {
  const isMulticlass = !('fpr' in rocData)
  const classKeys = isMulticlass ? Object.keys(rocData) : []
  const [activeClass, setActiveClass] = useState<string>(classKeys[0] || '')

  let curvePoints: CurvePlotItem[] = []
  let aucValue = 0.0

  if (isMulticlass) {
    const classData = rocData[activeClass]
    if (classData) {
      curvePoints = classData.fpr.map((f: number, i: number) => ({
        fpr: f,
        tpr: classData.tpr[i]
      }))
      aucValue = classData.auc
    }
  } else {
    curvePoints = rocData.fpr.map((f: number, i: number) => ({
      fpr: f,
      tpr: rocData.tpr[i]
    }))
    aucValue = rocData.auc
  }

  // Inject baseline diagonal line reference values
  const formattedData = curvePoints.map((pt) => ({
    ...pt,
    baseline: pt.fpr
  }))

  return (
    <div className="bg-surface border-2 border-primary p-6 neo-shadow flex flex-col h-full" id="roc-curve-container">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-headline font-black text-lg uppercase">ROC Curve Diagnostic</h3>
        <Button variant="ghost" size="sm" onClick={() => exportPng('roc-curve-container', 'roc_curve')}>
          <Download className="w-3.5 h-3.5 mr-1" /> Export PNG
        </Button>
      </div>

      <div className="flex justify-between items-center mb-6">
        <span className="text-xs text-on-surface-variant">True Positive Rate vs False Positive Rate</span>
        <Badge variant="default" className="font-mono text-[10px]">AUC = {aucValue.toFixed(3)}</Badge>
      </div>

      {isMulticlass && (
        <div className="flex gap-1.5 mb-4 flex-wrap">
          <span className="font-headline font-bold text-[10px] uppercase flex items-center mr-1">Inspect Class:</span>
          {classKeys.map((cls) => (
            <button
              key={cls}
              onClick={() => setActiveClass(cls)}
              className={`px-2 py-0.5 border text-[10px] font-headline font-black uppercase ${
                activeClass === cls
                  ? 'border-primary bg-primary text-white'
                  : 'border-primary/20 hover:border-primary'
              }`}
            >
              {cls}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 w-full min-h-[300px]">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="fpr" type="number" domain={[0, 1]} tick={{ fontSize: 10 }} name="FPR" />
            <YAxis type="number" domain={[0, 1]} tick={{ fontSize: 10 }} name="TPR" />
            <Tooltip
              labelFormatter={(val) => `False Positive Rate: ${Number(val).toFixed(3)}`}
              contentStyle={{ fontFamily: 'var(--font-headline)', fontSize: '11px', border: '2px solid black' }}
            />
            <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'var(--font-headline)' }} />
            <Line
              type="monotone"
              dataKey="tpr"
              name={`ROC Curve (AUC=${aucValue.toFixed(2)})`}
              stroke="#2563eb"
              strokeWidth={3}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="baseline"
              name="Random Guess"
              stroke="#9ca3af"
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* 3. Precision-Recall Curve */
function PrCurveCard({ prData, exportPng }: { prData: any; exportPng: any }) {
  const isMulticlass = !('precision' in prData)
  const classKeys = isMulticlass ? Object.keys(prData) : []
  const [activeClass, setActiveClass] = useState<string>(classKeys[0] || '')

  let curvePoints: CurvePlotItem[] = []
  let apValue = 0.0

  if (isMulticlass) {
    const classData = prData[activeClass]
    if (classData) {
      curvePoints = classData.precision.map((p: number, i: number) => ({
        precision: p,
        recall: classData.recall[i]
      }))
      apValue = classData.ap
    }
  } else {
    curvePoints = prData.precision.map((p: number, i: number) => ({
      precision: p,
      recall: prData.recall[i]
    }))
    apValue = prData.ap
  }

  return (
    <div className="bg-surface border-2 border-primary p-6 neo-shadow flex flex-col h-full" id="pr-curve-container">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-headline font-black text-lg uppercase">PR Curve (Imbalance Checked)</h3>
        <Button variant="ghost" size="sm" onClick={() => exportPng('pr-curve-container', 'pr_curve')}>
          <Download className="w-3.5 h-3.5 mr-1" /> Export PNG
        </Button>
      </div>

      <div className="flex justify-between items-center mb-6">
        <span className="text-xs text-on-surface-variant">Precision vs Recall</span>
        <Badge variant="default" className="font-mono text-[10px]">AP = {apValue.toFixed(3)}</Badge>
      </div>

      {isMulticlass && (
        <div className="flex gap-1.5 mb-4 flex-wrap">
          <span className="font-headline font-bold text-[10px] uppercase flex items-center mr-1">Inspect Class:</span>
          {classKeys.map((cls) => (
            <button
              key={cls}
              onClick={() => setActiveClass(cls)}
              className={`px-2 py-0.5 border text-[10px] font-headline font-black uppercase ${
                activeClass === cls
                  ? 'border-primary bg-primary text-white'
                  : 'border-primary/20 hover:border-primary'
              }`}
            >
              {cls}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 w-full min-h-[300px]">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={curvePoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="recall" type="number" domain={[0, 1]} tick={{ fontSize: 10 }} name="Recall" />
            <YAxis type="number" domain={[0, 1]} tick={{ fontSize: 10 }} name="Precision" />
            <Tooltip
              labelFormatter={(val) => `Recall: ${Number(val).toFixed(3)}`}
              contentStyle={{ fontFamily: 'var(--font-headline)', fontSize: '11px', border: '2px solid black' }}
            />
            <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'var(--font-headline)' }} />
            <Line
              type="monotone"
              dataKey="precision"
              name={`PR Curve (AP=${apValue.toFixed(2)})`}
              stroke="#d97706" // orange-shade
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* 4. Feature Importance Card */
function FeatureImportanceCard({ importanceData, exportPng }: { importanceData: any[]; exportPng: any }) {
  // Take top 10 features to display cleanly
  const chartData = [...importanceData].slice(0, 10)

  return (
    <div className="bg-surface border-2 border-primary p-6 neo-shadow flex flex-col h-full" id="feat-importance-container">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-headline font-black text-lg uppercase">Feature Importance</h3>
        <Button variant="ghost" size="sm" onClick={() => exportPng('feat-importance-container', 'feature_importance')}>
          <Download className="w-3.5 h-3.5 mr-1" /> Export PNG
        </Button>
      </div>
      <p className="text-xs text-on-surface-variant mb-6">Top contributing features (native weights or permutation importance)</p>

      <div className="flex-1 w-full min-h-[300px]">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 10, left: 30, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis dataKey="feature" type="category" tick={{ fontSize: 9 }} width={80} />
            <Tooltip contentStyle={{ fontFamily: 'var(--font-headline)', fontSize: '11px', border: '2px solid black' }} />
            <Bar dataKey="importance" fill="#4f46e5" name="Importance Score" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* 5. Classification Report Card */
function ClassificationReportCard({ reportData }: { reportData: any }) {
  const classesList = Object.keys(reportData).filter(
    (key) => !['accuracy', 'macro avg', 'weighted avg'].includes(key)
  )

  return (
    <div className="bg-surface border-2 border-primary p-6 neo-shadow flex flex-col h-full">
      <h3 className="font-headline font-black text-lg uppercase mb-2">Classification Report</h3>
      <p className="text-xs text-on-surface-variant mb-6">Evaluation metrics detailed per target class</p>

      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b-2 border-primary">
              <th className="p-3 font-headline font-black uppercase">Class</th>
              <th className="p-3 font-headline font-black uppercase text-center">Precision</th>
              <th className="p-3 font-headline font-black uppercase text-center">Recall</th>
              <th className="p-3 font-headline font-black uppercase text-center">F1-Score</th>
              <th className="p-3 font-headline font-black uppercase text-center">Support</th>
            </tr>
          </thead>
          <tbody>
            {classesList.map((cls) => {
              const row = reportData[cls]
              return (
                <tr key={cls} className="border-b border-primary last:border-b-0 hover:bg-surface-variant/30 transition-colors">
                  <td className="p-3 font-headline font-bold">{cls}</td>
                  <td className="p-3 font-mono text-center">{(row.precision ?? 0).toFixed(3)}</td>
                  <td className="p-3 font-mono text-center">{(row.recall ?? 0).toFixed(3)}</td>
                  <td className="p-3 font-mono text-center">{(row.f1_score ?? row['f1-score'] ?? 0).toFixed(3)}</td>
                  <td className="p-3 font-mono text-center">{row.support}</td>
                </tr>
              )
            })}
            {/* Accuracy Row */}
            <tr className="border-t-2 border-primary font-bold">
              <td className="p-3 font-headline uppercase font-black">Accuracy</td>
              <td colSpan={3} className="p-3 font-mono text-right font-black">
                {typeof reportData.accuracy === 'number' ? reportData.accuracy.toFixed(3) : '—'}
              </td>
              <td className="p-3 font-mono text-center">
                {reportData['macro avg']?.support}
              </td>
            </tr>
            {/* Weighted Avg Row */}
            <tr className="border-b border-primary font-bold">
              <td className="p-3 font-headline uppercase font-black">Weighted Avg</td>
              <td className="p-3 font-mono text-center">{(reportData['weighted avg']?.precision ?? 0).toFixed(3)}</td>
              <td className="p-3 font-mono text-center">{(reportData['weighted avg']?.recall ?? 0).toFixed(3)}</td>
              <td className="p-3 font-mono text-center">
                {(reportData['weighted avg']?.f1_score ?? reportData['weighted avg']?.['f1-score'] ?? 0).toFixed(3)}
              </td>
              <td className="p-3 font-mono text-center">{reportData['weighted avg']?.support}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* 6. Predicted vs Actual (Regression Scatter) */
function PredictedVsActualCard({ scatterData, exportPng }: { scatterData: any; exportPng: any }) {
  const { actual, predicted } = scatterData

  const chartData = actual.map((act: number, i: number) => ({
    actual: act,
    predicted: predicted[i]
  }))

  return (
    <div className="bg-surface border-2 border-primary p-6 neo-shadow flex flex-col h-full" id="pred-actual-container">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-headline font-black text-lg uppercase">Predicted vs Actual</h3>
        <Button variant="ghost" size="sm" onClick={() => exportPng('pred-actual-container', 'predicted_vs_actual')}>
          <Download className="w-3.5 h-3.5 mr-1" /> Export PNG
        </Button>
      </div>
      <p className="text-xs text-on-surface-variant mb-6">Diagnostic scatter chart demonstrating model bias</p>

      <div className="flex-1 w-full min-h-[300px]">
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" dataKey="actual" name="Actual" tick={{ fontSize: 10 }} />
            <YAxis type="number" dataKey="predicted" name="Predicted" tick={{ fontSize: 10 }} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{ fontFamily: 'var(--font-headline)', fontSize: '11px', border: '2px solid black' }}
            />
            <Scatter name="Data points" data={chartData} fill="#2563eb" fillOpacity={0.6} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* 7. Residuals Scatter Plot */
function ResidualsCard({ residualsData, exportPng }: { residualsData: any; exportPng: any }) {
  const { predicted, residuals } = residualsData

  const chartData = predicted.map((pred: number, i: number) => ({
    predicted: pred,
    residual: residuals[i],
    baseline: 0
  }))

  return (
    <div className="bg-surface border-2 border-primary p-6 neo-shadow flex flex-col h-full" id="residuals-container">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-headline font-black text-lg uppercase">Residuals Plot</h3>
        <Button variant="ghost" size="sm" onClick={() => exportPng('residuals-container', 'residuals_plot')}>
          <Download className="w-3.5 h-3.5 mr-1" /> Export PNG
        </Button>
      </div>
      <p className="text-xs text-on-surface-variant mb-6">Predicted value vs Residual distance (errors)</p>

      <div className="flex-1 w-full min-h-[300px]">
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" dataKey="predicted" name="Predicted" tick={{ fontSize: 10 }} />
            <YAxis type="number" dataKey="residual" name="Residual" tick={{ fontSize: 10 }} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{ fontFamily: 'var(--font-headline)', fontSize: '11px', border: '2px solid black' }}
            />
            <Scatter name="Residuals" data={chartData} fill="#dc2626" fillOpacity={0.6} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* 8. Error Distribution Histogram */
function ErrorDistributionCard({ histogramData, exportPng }: { histogramData: any; exportPng: any }) {
  const { counts, bin_centers } = histogramData

  const chartData = bin_centers.map((center: number, i: number) => ({
    center: center.toFixed(2),
    count: counts[i]
  }))

  return (
    <div className="bg-surface border-2 border-primary p-6 neo-shadow flex flex-col h-full" id="error-dist-container">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-headline font-black text-lg uppercase">Error Distribution</h3>
        <Button variant="ghost" size="sm" onClick={() => exportPng('error-dist-container', 'error_distribution')}>
          <Download className="w-3.5 h-3.5 mr-1" /> Export PNG
        </Button>
      </div>
      <p className="text-xs text-on-surface-variant mb-6">Histogram bins demonstrating normality of residuals</p>

      <div className="flex-1 w-full min-h-[300px]">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="center" tick={{ fontSize: 9 }} name="Residual Value" />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontFamily: 'var(--font-headline)', fontSize: '11px', border: '2px solid black' }} />
            <Bar dataKey="count" fill="#d97706" name="Bin Count" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* 9. Learning Curve */
function LearningCurveCard({ curveData, exportPng }: { curveData: any; exportPng: any }) {
  const { train_sizes, train_scores, val_scores } = curveData

  const chartData = train_sizes.map((size: number, i: number) => ({
    size,
    train: train_scores[i],
    validation: val_scores[i]
  }))

  return (
    <div className="bg-surface border-2 border-primary p-6 neo-shadow flex flex-col h-full" id="learning-curve-container">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-headline font-black text-lg uppercase">Learning Curve</h3>
        <Button variant="ghost" size="sm" onClick={() => exportPng('learning-curve-container', 'learning_curve')}>
          <Download className="w-3.5 h-3.5 mr-1" /> Export PNG
        </Button>
      </div>
      <p className="text-xs text-on-surface-variant mb-6">Train vs Validation score across training set sizes to monitor under/overfitting</p>

      <div className="flex-1 w-full min-h-[300px]">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="size" tick={{ fontSize: 10 }} label={{ value: 'Training Instances', position: 'insideBottom', offset: -5 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontFamily: 'var(--font-headline)', fontSize: '11px', border: '2px solid black' }} />
            <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'var(--font-headline)' }} />
            <Line type="monotone" dataKey="train" name="Train Score" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="validation" name="Validation Score" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* 10. Model Comparison Chart */
function ModelComparisonCard({
  comparisonData,
  exportPng,
  problemType
}: {
  comparisonData: any[]
  exportPng: any
  problemType: string
}) {
  const metricKeys = problemType === 'classification'
    ? ['accuracy', 'f1_score', 'precision', 'recall']
    : ['r2', 'rmse', 'mae']

  const [activeMetric, setActiveMetric] = useState<string>(metricKeys[0])

  const chartData = comparisonData.map((m) => ({
    name: m.name,
    score: m.metrics?.[activeMetric] ?? 0.0
  }))

  return (
    <div className="bg-surface border-2 border-primary p-6 neo-shadow flex flex-col h-full" id="model-comparison-container">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-headline font-black text-lg uppercase">Leaderboard Comparison</h3>
        <Button variant="ghost" size="sm" onClick={() => exportPng('model-comparison-container', 'model_comparison')}>
          <Download className="w-3.5 h-3.5 mr-1" /> Export PNG
        </Button>
      </div>
      <p className="text-xs text-on-surface-variant mb-6">Compare all completed models from the active training run</p>

      {/* Metric Selector buttons */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {metricKeys.map((key) => (
          <button
            key={key}
            onClick={() => setActiveMetric(key)}
            className={`px-2 py-0.5 border text-[10px] font-headline font-black uppercase ${
              activeMetric === key
                ? 'border-primary bg-primary text-white'
                : 'border-primary/20 hover:border-primary'
            }`}
          >
            {key.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <div className="flex-1 w-full min-h-[300px]">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontFamily: 'var(--font-headline)', fontSize: '11px', border: '2px solid black' }} />
            <Bar dataKey="score" fill="#10b981" name={`${activeMetric.toUpperCase()} Score`} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
