import { NavLink } from "react-router-dom"
import { useWorkflowProgress } from "../hooks/useWorkflowProgress"

export default function WorkflowNextStep() {
  const { nextStep, steps, hasDataset, activeStep } = useWorkflowProgress()

  // Better than UX.md: hide when workflow complete or no entry point.
  // Show contextual guidance + locked reason when applicable.
  if (!hasDataset && !nextStep) return null
  if (!nextStep) {
    // No next after active → workflow complete or on final step
    // Don't show redundant "Go to Predict" when already on Predict
    if (activeStep?.id === "predict") {
      return (
        <div className="mt-8 sm:mt-10 border-2 border-black bg-[#c8ff00] brutal-shadow p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-xl shrink-0">celebration</span>
          <div className="min-w-0">
            <p className="font-headline font-black text-sm uppercase break-words">Workflow complete</p>
            <p className="text-xs text-black/70 break-words">All 6 steps done for this dataset. Export, score new data, or start a new run.</p>
          </div>
        </div>
      )
    }
    const predict = steps.find((s) => s.id === "predict")
    if (!predict || predict.state === "locked") return null
    return (
      <div className="mt-8 sm:mt-10 border-2 border-black bg-[#c8ff00] brutal-shadow p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-headline font-black text-sm uppercase break-words">Workflow complete</p>
          <p className="text-xs text-black/70 break-words">All steps done. Score new data or review reports.</p>
        </div>
        <NavLink
          to={predict.toWithContext}
          className="bg-black text-white font-mono text-xs font-black uppercase tracking-widest px-6 py-3 border-2 border-black hover:bg-white hover:text-black transition-colors btn-press shrink-0 w-full sm:w-auto text-center justify-center flex items-center"
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
      <div className="mt-8 sm:mt-10 border-2 border-black bg-white brutal-shadow p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <span className="material-symbols-outlined text-xl shrink-0">lock</span>
          <div className="min-w-0">
            <p className="font-headline font-black text-sm uppercase break-words">Next: {nextStep.label}</p>
            <p className="text-xs text-black/60 break-words">{nextStep.lockedReason ?? "Complete previous steps first"}</p>
          </div>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest bg-black text-white px-2 py-1 shrink-0 self-start sm:self-center">Locked</span>
      </div>
    )
  }

  return (
    <div className="mt-8 sm:mt-10 border-2 border-black bg-white brutal-shadow p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3 min-w-0">
        <span className="material-symbols-outlined text-xl shrink-0 mt-0.5">arrow_forward</span>
        <div className="min-w-0">
          <p className="font-headline font-black text-sm uppercase break-words">Next: {nextStep.label}</p>
          <p className="text-xs text-black/60 break-words">{nextStep.description}</p>
        </div>
      </div>
      <NavLink
        to={nextStep.toWithContext}
        className="bg-[#ffd400] text-black font-mono text-xs font-black uppercase tracking-widest px-6 py-3 border-2 border-black brutal-shadow-sm hover:bg-black hover:text-white transition-colors btn-press shrink-0 w-full sm:w-auto text-center justify-center flex items-center"
      >
        Continue → {nextStep.label}
      </NavLink>
    </div>
  )
}
