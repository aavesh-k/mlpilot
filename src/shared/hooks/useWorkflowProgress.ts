import { useMemo } from "react"
import { useLocation, useSearchParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { datasetsApi } from "../../core/api/datasets.api"
import { pipelinesApi } from "../../core/api/pipelines.api"
import { trainingApi } from "../../core/api/training.api"

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
  { id: "predict", label: "Predict", shortLabel: "Predict", icon: "science", to: "/results", description: "Score new data & export" },
]

function isRouteActive(pathname: string, to: string): boolean {
  if (to === "/datasets" && pathname.startsWith("/datasets")) return true
  if (to === "/compare" && pathname.startsWith("/visualizations")) return true
  return pathname === to || pathname.startsWith(to + "/")
}

function extractDatasetIdFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/datasets\/([^/?#]+)/)
  if (m && m[1] !== "demo") return m[1]
  return null
}

export function useWorkflowProgress() {
  const location = useLocation()
  const [searchParams] = useSearchParams()

  // Fetch with larger per_page so per-dataset filtering is accurate (avoids 20-item pagination limit)
  const { data: datasetsData } = useQuery({
    queryKey: ["datasets", 1, 100],
    queryFn: () => datasetsApi.list(1, 100),
  })
  const { data: pipelinesData } = useQuery({
    queryKey: ["pipelines", 1, 100],
    queryFn: () => pipelinesApi.list(1, 100),
    refetchInterval: (query) => {
      const items: any[] = (query.state.data as any)?.items ?? []
      return items.some((p: any) => p.status === "running") ? 1500 : false
    },
  })
  const { data: modelsData } = useQuery({
    queryKey: ["models", 1, 100],
    queryFn: () => trainingApi.listModels(1, 100),
    refetchInterval: (query) => {
      const items: any[] = (query.state.data as any)?.items ?? []
      return items.some((m: any) => m.status === "running" || m.status === "queued") ? 2000 : false
    },
  })
  const { data: jobsData } = useQuery({
    queryKey: ["jobs", 1, 100],
    queryFn: () => trainingApi.listJobs(1, 100),
    refetchInterval: (query) => {
      const items: any[] = (query.state.data as any)?.items ?? []
      return items.some((j: any) => j.status === "running" || j.status === "queued") ? 2000 : false
    },
  })

  const datasets: any[] = datasetsData?.items ?? []
  const pipelines: any[] = pipelinesData?.items ?? []
  const models: any[] = modelsData?.items ?? []
  const jobs: any[] = jobsData?.items ?? []

  // ---- Global flags (for upload step and badges) ----
  const hasDatasetGlobal = (datasetsData?.total ?? datasets.length) > 0
  const latestDataset = datasets[0] as any | undefined

  // ---- Per-dataset context ----
  // Priority: ?datasetId > /datasets/:id path > ?pipelineId's dataset > latest dataset
  const pathDatasetId = extractDatasetIdFromPath(location.pathname)
  const pipelineIdFromParams = searchParams.get("pipelineId") ?? searchParams.get("pipeline")
  const pipelineForId = pipelineIdFromParams ? pipelines.find((p: any) => p.id === pipelineIdFromParams) as any : null
  const datasetIdFromPipeline = pipelineForId?.dataset_id ?? null

  const contextDatasetId = useMemo(() => {
    return (
      searchParams.get("datasetId") ??
      pathDatasetId ??
      datasetIdFromPipeline ??
      latestDataset?.id ??
      null
    )
  }, [searchParams, pathDatasetId, datasetIdFromPipeline, latestDataset?.id])

  const contextDataset = useMemo(
    () => datasets.find((d: any) => d.id === contextDatasetId) as any | undefined,
    [datasets, contextDatasetId],
  )

  // Lineage: original + all cleaned descendants (source_dataset_id chain)
  const lineageIds = useMemo(() => {
    if (!contextDatasetId) return new Set<string>()
    const ids = new Set<string>([contextDatasetId])
    let added = true
    while (added) {
      added = false
      for (const d of datasets as any[]) {
        const src = (d as any).source_dataset_id
        if (src && ids.has(src) && !ids.has(d.id)) {
          ids.add(d.id)
          added = true
        }
      }
    }
    return ids
  }, [datasets, contextDatasetId])

  const hasCleanedForContext = useMemo(() => {
    for (const id of lineageIds) {
      const ds = datasets.find((d: any) => d.id === id) as any
      if (ds?.is_cleaned) return true
    }
    return !!contextDataset?.is_cleaned
  }, [lineageIds, datasets, contextDataset])

  // Per-dataset derived collections (via lineage)
  const pipelinesForContext = useMemo(
    () => (lineageIds.size ? pipelines.filter((p: any) => lineageIds.has(p.dataset_id)) : []),
    [pipelines, lineageIds],
  )
  const modelsForContext = useMemo(() => {
    if (!lineageIds.size) return []
    const pipeIds = new Set(pipelinesForContext.map((p: any) => p.id))
    return models.filter(
      (m: any) => lineageIds.has(m.dataset_id) || (m.pipeline_id && pipeIds.has(m.pipeline_id)),
    )
  }, [models, lineageIds, pipelinesForContext])
  const jobsForContext = useMemo(() => {
    if (!lineageIds.size) return []
    const pipeIds = new Set(pipelinesForContext.map((p: any) => p.id))
    const modelIds = new Set(modelsForContext.map((m: any) => m.id))
    return jobs.filter((j: any) => {
      if (j.pipeline_id && pipeIds.has(j.pipeline_id)) return true
      if (j.model_id && modelIds.has(j.model_id)) return true
      if (j.model_ids && Array.isArray(j.model_ids) && j.model_ids.some((id: string) => modelIds.has(id))) return true
      return false
    })
  }, [jobs, lineageIds, pipelinesForContext, modelsForContext])

  const hasCompletedPipelineForContext = pipelinesForContext.some((p: any) => p.status === "completed")
  const hasCompletedModelForContext = modelsForContext.some((m: any) => m.status === "completed")
  const hasRunningPipelineForContext = pipelinesForContext.some((p: any) => p.status === "running")
  const hasRunningJobForContext =
    modelsForContext.some((m: any) => m.status === "running" || m.status === "queued") ||
    jobsForContext.some((j: any) => j.status === "running" || j.status === "queued")

  // Global counts for badges
  const latestCompletedPipeline = pipelines.find((p: any) => p.status === "completed") as any | undefined
  const latestModel = models.find((m: any) => m.status === "completed") as any | undefined

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

  // Per-dataset counts for step badges / context
  const contextCounts = useMemo(
    () => ({
      pipelines: pipelinesForContext.length,
      pipelinesCompleted: pipelinesForContext.filter((p: any) => p.status === "completed").length,
      models: modelsForContext.length,
      modelsCompleted: modelsForContext.filter((m: any) => m.status === "completed").length,
    }),
    [pipelinesForContext, modelsForContext],
  )

  // Full context object (dataset + pipeline + model) for navigation
  const context = useMemo(() => {
    // Prefer pipeline that belongs to context dataset
    const pipelineForContext = pipelinesForContext.find((p: any) => p.status === "completed") ?? pipelinesForContext[0] ?? latestCompletedPipeline
    const modelForContext = modelsForContext.find((m: any) => m.status === "completed") ?? modelsForContext[0] ?? latestModel
    return {
      datasetId: contextDatasetId,
      datasetName: contextDataset?.name ?? null,
      pipelineId: pipelineForContext?.id ?? pipelineIdFromParams ?? null,
      modelId: modelForContext?.id ?? null,
      hasDataset: !!contextDataset,
      hasCleaned: !!contextDataset?.is_cleaned,
    }
  }, [contextDatasetId, contextDataset, pipelinesForContext, modelsForContext, latestCompletedPipeline, latestModel, pipelineIdFromParams])

  const getStepLockedReason = (stepId: WorkflowStepId): string | null => {
    switch (stepId) {
      case "upload":
        return null
      case "clean":
        if (!hasDatasetGlobal) return "Upload a dataset first"
        if (!contextDatasetId) return "Select a dataset"
        return null
      case "preprocess":
        if (!hasDatasetGlobal) return "Upload a dataset first"
        if (!hasCleanedForContext) return `Clean "${contextDataset?.name ?? "this dataset"}" first`
        return null
      case "train":
        if (!hasCompletedPipelineForContext) return `Complete a preprocessing pipeline for "${contextDataset?.name ?? "this dataset"}" first`
        return null
      case "compare":
        if (!hasCompletedModelForContext) return `Train a model for "${contextDataset?.name ?? "this dataset"}" first`
        return null
      case "predict":
        if (!hasCompletedModelForContext) return `Train a model for "${contextDataset?.name ?? "this dataset"}" first`
        return null
      default:
        return null
    }
  }

  const isLocked = (stepId: WorkflowStepId): boolean => getStepLockedReason(stepId) !== null

  const isDone = (stepId: WorkflowStepId): boolean => {
    switch (stepId) {
      case "upload":
        return hasDatasetGlobal
      case "clean":
        return hasCleanedForContext
      case "preprocess":
        return hasCompletedPipelineForContext
      case "train":
        return hasCompletedModelForContext
      case "compare":
        return hasCompletedModelForContext
      case "predict":
        return hasCompletedModelForContext
      default:
        return false
    }
  }

  const isProcessing = (stepId: WorkflowStepId): boolean => {
    if (stepId === "preprocess" && hasRunningPipelineForContext) return true
    if (stepId === "train" && hasRunningJobForContext) return true
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
    [
      location.pathname,
      hasDatasetGlobal,
      hasCleanedForContext,
      hasCompletedPipelineForContext,
      hasCompletedModelForContext,
      hasRunningJobForContext,
      hasRunningPipelineForContext,
      context.datasetId,
      context.pipelineId,
      context.modelId,
      contextDataset?.name,
      datasetsData,
      pipelinesData,
      modelsData,
      jobsData,
    ],
  )

  const activeStep = steps.find((s) => s.state === "active")
  const nextStep = useMemo(() => {
    // Next is the immediate successor after active, even if locked (so UI can show why locked)
    const activeIdx = steps.findIndex((s) => s.state === "active")
    if (activeIdx !== -1) {
      const next = steps[activeIdx + 1]
      if (next) return next
      return null // active is last step → workflow end
    }
    // No active workflow step (e.g., Dashboard) → first available
    return steps.find((s) => s.state === "available" || s.state === "processing") ?? null
  }, [steps])

  // For sidebar sync: map step ids to sidebar entries
  return {
    steps,
    activeStep,
    nextStep,
    context,
    counts,
    contextCounts,
    contextDataset,
    // Back-compat global aliases + per-context flags
    hasDataset: hasDatasetGlobal,
    hasCleanedDataset: hasCleanedForContext,
    hasCompletedPipeline: hasCompletedPipelineForContext,
    hasCompletedModel: hasCompletedModelForContext,
    hasRunningJob: hasRunningJobForContext,
    hasRunningPipeline: hasRunningPipelineForContext,
    hasDatasetGlobal,
    hasCleanedForContext,
    hasCompletedPipelineForContext,
    hasCompletedModelForContext,
  }
}
