import type { ReactNode } from "react"
import { NavLink } from "react-router-dom"
import { useDatasets } from "../../modules/datasets/hooks/useDatasets"
import { usePipelines } from "../../modules/pipelines/hooks/usePipelines"
import { useModels } from "../../modules/training/hooks/useTraining"

type GuardRequirement = "dataset" | "cleaned_dataset" | "preprocessing" | "model" | "training_completed"

interface RouteGuardProps {
  children: ReactNode
  require: GuardRequirement
}

interface BlockState {
  title: string
  message: string
  actionLabel: string
  actionTo: string
}

function BlockCard({ block }: { block: BlockState }) {
  return (
    <div className="p-8 lg:p-12 flex items-center justify-center min-h-[60vh]">
      <div className="bg-surface border-2 border-primary p-8 neo-shadow max-w-lg w-full text-center">
        <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4 block">lock</span>
        <h2 className="font-headline text-2xl font-black uppercase mb-3">{block.title}</h2>
        <p className="text-on-surface-variant font-body mb-6">{block.message}</p>
        <NavLink
          to={block.actionTo}
          className="inline-block bg-primary text-on-primary font-headline font-bold uppercase text-sm px-8 py-3 border-2 border-primary hover:bg-primary-container hover:text-primary transition-all active:scale-95"
        >
          {block.actionLabel}
        </NavLink>
      </div>
    </div>
  )
}

export function RouteGuard({ children, require }: RouteGuardProps) {
  const { data: datasetsData } = useDatasets()
  const { data: pipelinesData } = usePipelines()
  const { data: modelsData } = useModels()

  const datasets = datasetsData?.items ?? []
  const pipelines = pipelinesData?.items ?? []
  const models = modelsData?.items ?? []

  const hasDataset = datasets.length > 0
  const hasCleanedDataset = datasets.some((d) => d.is_cleaned === true)
  const hasCompletedPipeline = pipelines.some((p) => p.status === "completed")
  const hasCompletedModel = models.some((m) => m.status === "completed")
  const hasAnyModel = models.length > 0

  let block: BlockState | null = null

  switch (require) {
    case "dataset":
      if (!hasDataset) {
        block = {
          title: "No Dataset Uploaded",
          message: "Upload a dataset first before accessing preprocessing.",
          actionLabel: "Upload Dataset",
          actionTo: "/datasets",
        }
      }
      break
    case "cleaned_dataset":
      if (!hasDataset) {
        block = {
          title: "No Dataset Uploaded",
          message: "Upload a dataset first before accessing preprocessing.",
          actionLabel: "Upload Dataset",
          actionTo: "/datasets",
        }
      } else if (!hasCleanedDataset) {
        block = {
          title: "Data Cleaning Required",
          message: "Your dataset must be cleaned before you can create a preprocessing pipeline.",
          actionLabel: "Go to Data Cleaning",
          actionTo: "/cleaning",
        }
      }
      break
    case "preprocessing":
      if (!hasDataset) {
        block = {
          title: "No Dataset Uploaded",
          message: "Upload and preprocess a dataset before training.",
          actionLabel: "Upload Dataset",
          actionTo: "/datasets",
        }
      } else if (!hasCompletedPipeline) {
        block = {
          title: "Preprocessing Required",
          message: "You need to create and execute a preprocessing pipeline before training models.",
          actionLabel: "Go to Preprocessing",
          actionTo: "/preprocessing",
        }
      }
      break
    case "model":
      if (!hasDataset) {
        block = {
          title: "No Dataset Uploaded",
          message: "Upload a dataset and train a model first.",
          actionLabel: "Upload Dataset",
          actionTo: "/datasets",
        }
      } else if (!hasCompletedModel && !hasAnyModel) {
        block = {
          title: "No Trained Models",
          message: "Train at least one model before accessing this page.",
          actionLabel: "Go to Training",
          actionTo: "/training",
        }
      }
      break
    case "training_completed":
      if (!hasDataset) {
        block = {
          title: "No Dataset Uploaded",
          message: "Upload a dataset and complete training first.",
          actionLabel: "Upload Dataset",
          actionTo: "/datasets",
        }
      } else if (!hasCompletedModel) {
        block = {
          title: "No Completed Training",
          message: "Complete at least one training run before accessing reports.",
          actionLabel: "Go to Training",
          actionTo: "/training",
        }
      }
      break
  }

  if (block) return <BlockCard block={block} />
  return <>{children}</>
}
