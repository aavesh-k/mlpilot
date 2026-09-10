import { NavLink } from "react-router-dom"
import { useWorkflowProgress } from "../hooks/useWorkflowProgress"

export default function WorkflowNextStep() {
  const { nextStep, steps, hasDataset } = useWorkflowProgress()

  // Better than UX.md: hide when workflow complete or no entry point.
  // Show contextual guidance + locked reason when applicable.
  if (!hasDataset && !nextStep) return null
  if (!nextStep) {
    // All steps done — show celebrate CTA to predict/reports
    const predict = steps.find((s) => s.id === "predict")
    if (!predict || predict.state === "locked") return null
    return (
      <div className="mt-10 border-2 border-black bg-[#c8ff00] brutal-shadow p-4 flex items-center justify-between gap-4">
        <div>
          <p className="font-headline font-black text-sm uppercase">Workflow complete</p>
          <p className="text-xs text-black/70">All steps done. Score new data or review reports.</p>
        </div>
        <NavLink
          to={predict.toWithContext}
          className="bg-black text-white font-mono text-xs font-black uppercase tracking-widest px-6 py-3 border-2 border-black hover:bg-white hover:text-black transition-colors btn-press shrink-0"
        >
          Go to Predict →
        </NavLink>
      </div>
    )
  }

  // Don't show Next if it's the active step (avoid redundant CTA on that page)
  if (nextStep.state === "active") return null
  if (nextStep.state === "locked") {
    return (
      <div className="mt-10 border-2 border-black bg-white brutal-shadow p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-xl">lock</span>
          <div>
            <p className="font-headline font-black text-sm uppercase">Next: {nextStep.label}</p>
            <p className="text-xs text-black/60">{nextStep.lockedReason ?? "Complete previous steps first"}</p>
          </div>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest bg-black text-white px-2 py-1">Locked</span>
      </div>
    )
  }

  return (
    <div className="mt-10 border-2 border-black bg-white brutal-shadow p-4 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-xl">arrow_forward</span>
        <div>
          <p className="font-headline font-black text-sm uppercase">Next: {nextStep.label}</p>
          <p className="text-xs text-black/60">{nextStep.description}</p>
        </div>
      </div>
      <NavLink
        to={nextStep.toWithContext}
        className="bg-[#ffd400] text-black font-mono text-xs font-black uppercase tracking-widest px-6 py-3 border-2 border-black brutal-shadow-sm hover:bg-black hover:text-white transition-colors btn-press shrink-0"
      >
        Continue → {nextStep.label}
      </NavLink>
    </div>
  )
}
