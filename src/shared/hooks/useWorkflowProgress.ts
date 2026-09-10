import { useMemo } from "react"
import { useLocation, useSearchParams } from "react-router-dom"
import { useDatasets } from "../../modules/datasets/hooks/useDatasets"
import { usePipelines } from "../../modules/pipelines/hooks/usePipelines"
import { useJobs, useModels } from "../../modules/training/hooks/useTraining"

export type WorkflowStepId = "upload" | "clean" | "preprocess" | "train" | "compare" | "predict"

export type StepState = "done" | "active" | "available" | "locked" | "processing"

export interface WorkflowStepDef {
  id: WorkflowStepId
  label: string
  shortLabel: string
  icon: string
  to: string
  description: string
}

export const WORKFLOW_STEPS: WorkflowStepDef[] = [
  { id: "upload", label: "Upload", shortLabel: "Upload", icon: "database", to: "/datasets", description: "Upload CSV, Parquet, JSON or Excel" },
  { id: "clean", label: "Clean", shortLabel: "Clean", icon: "cleaning_services", to: "/cleaning", description: "Inspect and fix data quality" },
  { id: "preprocess", label: "Preprocess", shortLabel: "Preproc", icon: "account_tree", to: "/preprocessing", description: "Encode, scale, split" },
  { id: "train", label: "Train", shortLabel: "Train", icon: "model_training", to: "/training", description: "Train 10 algorithms with CV" },
  { id: "compare", label: "Compare", shortLabel: "Compare", icon: "leaderboard", to: "/compare", description: "Leaderboard and metrics" },
  { id: "predict", label: "Predict", shortLabel: "Predict", icon: "lab_profile", to: "/results", description: "Score new data & export" },
]

function isRouteActive(pathname: string, to: string): boolean {
  if (to === "/datasets" && pathname.startsWith("/datasets")) return true
  return pathname === to || pathname.startsWith(to + "/")
}

export function useWorkflowProgress() {
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const { data: datasetsData } = useDatasets(1)
  const { data: pipelinesData } = usePipelines(1)
  const { data: modelsData } = useModels(1)
  const { data: jobsData } = useJobs(1)

  const datasets = datasetsData?.items ?? []
  const pipelines = pipelinesData?.items ?? []
  const models = modelsData?.items ?? []
  const jobs = jobsData?.items ?? []

  const hasDataset = (datasetsData?.total ?? datasets.length) > 0
  const hasCleanedDataset = datasets.some((d: any) => d.is_cleaned === true)
  const hasCompletedPipeline = pipelines.some((p: any) => p.status === "completed")
  const hasCompletedModel = models.some((m: any) => m.status === "completed")
  const hasAnyModel = (modelsData?.total ?? models.length) > 0
  const hasRunningJob = jobs.some((j: any) => j.status === "running" || j.status === "queued")
  const hasRunningPipeline = pipelines.some((p: any) => p.status === "running")

  const latestDataset = datasets[0] as any | undefined
  const latestCleanedDataset = datasets.find((d: any) => d.is_cleaned) as any | undefined
  const latestCompletedPipeline = pipelines.find((p: any) => p.status === "completed") as any | undefined
  const latestModel = models.find((m: any) => m.status === "completed") as any | undefined

  // Context preservation: prefer URL params, else latest entities
  const context = useMemo(() => {
    const datasetId = searchParams.get("datasetId") ?? latestDataset?.id ?? latestCleanedDataset?.id ?? null
    const pipelineId = searchParams.get("pipelineId") ?? searchParams.get("pipeline") ?? latestCompletedPipeline?.id ?? null
    const modelId = searchParams.get("modelId") ?? latestModel?.id ?? null
    return { datasetId, pipelineId, modelId }
  }, [searchParams, latestDataset, latestCleanedDataset, latestCompletedPipeline, latestModel])

  // Counts for badges — better than UX.md (shows live inventory)
  const counts = useMemo(
    () => {
      const dsItems = datasetsData?.items ?? []
      const pipeItems = pipelinesData?.items ?? []
      const modelItems = modelsData?.items ?? []
      const jobItems = jobsData?.items ?? []
      return {
        datasets: datasetsData?.total ?? dsItems.length,
        cleaned: dsItems.filter((d: any) => d.is_cleaned).length,
        pipelines: pipelinesData?.total ?? pipeItems.length,
        pipelinesCompleted: pipeItems.filter((p: any) => p.status === "completed").length,
        models: modelsData?.total ?? modelItems.length,
        modelsCompleted: modelItems.filter((m: any) => m.status === "completed").length,
        jobsRunning: jobItems.filter((j: any) => j.status === "running" || j.status === "queued").length,
      }
    },
    [datasetsData, pipelinesData, modelsData, jobsData],
  )

  const getStepLockedReason = (stepId: WorkflowStepId): string | null => {
    switch (stepId) {
      case "upload":
        return null
      case "clean":
        if (!hasDataset) return "Upload a dataset first"
        return null
      case "preprocess":
        if (!hasDataset) return "Upload a dataset first"
        if (!hasCleanedDataset) return "Clean your dataset first"
        return null
      case "train":
        if (!hasCompletedPipeline) return "Complete a preprocessing pipeline first"
        return null
      case "compare":
        if (!hasCompletedModel) return "Train a model first"
        return null
      case "predict":
        if (!hasCompletedModel) return "Train a model first"
        return null
      default:
        return null
    }
  }

  const isLocked = (stepId: WorkflowStepId): boolean => getStepLockedReason(stepId) !== null

  const isDone = (stepId: WorkflowStepId): boolean => {
    switch (stepId) {
      case "upload":
        return hasDataset
      case "clean":
        return hasCleanedDataset
      case "preprocess":
        return hasCompletedPipeline
      case "train":
        return hasCompletedModel
      case "compare":
        return hasAnyModel && hasCompletedModel
      case "predict":
        return hasAnyModel && hasCompletedModel
      default:
        return false
    }
  }

  const isProcessing = (stepId: WorkflowStepId): boolean => {
    if (stepId === "clean" && hasDataset && !hasCleanedDataset) return false // cleaning is manual opt-in, not polling
    if (stepId === "preprocess" && hasRunningPipeline) return true
    if (stepId === "train" && hasRunningJob) return true
    return false
  }

  const getStepState = (stepId: WorkflowStepId, to: string): StepState => {
    const locked = isLocked(stepId)
    const active = isRouteActive(location.pathname, to)
    if (locked) return "locked"
    if (active) return "active"
    if (isProcessing(stepId)) return "processing"
    if (isDone(stepId)) return "done"
    // If prerequisites are met but not done, it's available
    return "available"
  }

  const buildToWithContext = (to: string): string => {
    const params = new URLSearchParams()
    if (context.datasetId) params.set("datasetId", context.datasetId)
    // For train/compare/predict also preserve pipeline
    if (context.pipelineId && (to === "/training" || to === "/compare" || to === "/results" || to === "/visualizations")) {
      params.set("pipelineId", context.pipelineId)
    }
    if (context.modelId && (to === "/results" || to === "/visualizations")) {
      params.set("modelId", context.modelId)
    }
    const qs = params.toString()
    return qs ? `${to}?${qs}` : to
  }

  const steps = useMemo(
    () =>
      WORKFLOW_STEPS.map((def) => {
        const state = getStepState(def.id, def.to)
        const lockedReason = getStepLockedReason(def.id)
        const toWithContext = buildToWithContext(def.to)
        return {
          ...def,
          state,
          lockedReason,
          toWithContext,
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [location.pathname, hasDataset, hasCleanedDataset, hasCompletedPipeline, hasCompletedModel, hasAnyModel, hasRunningJob, hasRunningPipeline, context.datasetId, context.pipelineId, context.modelId, datasetsData, pipelinesData, modelsData, jobsData],
  )

  const activeStep = steps.find((s) => s.state === "active")
  const nextStep = useMemo(() => {
    // Next = first non-done & not locked, else first available, else active's next
    const firstIncomplete = steps.find((s) => s.state === "available" || s.state === "processing")
    if (firstIncomplete) return firstIncomplete
    const firstAvailable = steps.find((s) => s.state === "active")
    if (firstAvailable) {
      const idx = steps.findIndex((s) => s.id === firstAvailable.id)
      const next = steps[idx + 1]
      if (next && next.state !== "locked") return next
    }
    // If all done, predict is next
    return steps.find((s) => s.state !== "locked" && s.state !== "done") ?? null
  }, [steps])

  // For sidebar sync: map step ids to sidebar entries
  return {
    steps,
    activeStep,
    nextStep,
    context,
    counts,
    hasDataset,
    hasCleanedDataset,
    hasCompletedPipeline,
    hasCompletedModel,
    hasRunningJob,
    hasRunningPipeline,
  }
}
