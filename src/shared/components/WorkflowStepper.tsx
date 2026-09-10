import { NavLink } from "react-router-dom"
import { useWorkflowProgress } from "../hooks/useWorkflowProgress"

export default function WorkflowStepper() {
  const { steps, context, contextCounts, counts } = useWorkflowProgress()

  return (
    <nav
      aria-label="ML workflow progress"
      className="w-full border-b-[3px] border-black bg-white hidden lg:block"
    >
      <div className="mx-auto max-w-7xl px-4">
        {/* Better than UX.md: show which dataset's progress is displayed + live per-dataset counts */}
        <div className="flex items-center gap-2 py-1.5 text-[10px] font-mono uppercase tracking-widest">
          <span className="font-black flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[12px]">database</span>
            {context.datasetName ? (
              <span className="bg-[#ffd400] border border-black px-1.5 py-0.5">{context.datasetName}</span>
            ) : (
              <span className="text-black/60">No dataset — upload first</span>
            )}
          </span>
          {context.datasetId && (
            <span className="hidden md:flex items-center gap-1.5 text-black/60">
              <span>•</span>
              <span className="hidden lg:inline">
                {contextCounts.pipelinesCompleted}/{contextCounts.pipelines} pipelines
              </span>
              <span>•</span>
              <span className="hidden lg:inline">
                {contextCounts.modelsCompleted}/{contextCounts.models} models
              </span>
              <span className="hidden xl:inline text-black/40">• {counts.datasets} total datasets</span>
            </span>
          )}
        </div>
        <ol className="flex items-center gap-0 pb-2 overflow-x-auto scrollbar-thin">
          {steps.map((step, idx) => {
            const isLast = idx === steps.length - 1
            return (
              <li key={step.id} className="flex items-center flex-1 min-w-0">
                <StepChip step={step} index={idx} />
                {!isLast && (
                  <span
                    aria-hidden="true"
                    className={`mx-1 h-[3px] flex-1 min-w-[12px] transition-colors ${
                      step.state === "done" ? "bg-black" : "bg-black/20"
                    }`}
                  />
                )}
              </li>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}

function StepChip({
  step,
  index,
}: {
  step: ReturnType<typeof useWorkflowProgress>["steps"][number]
  index: number
}) {
  const numberLabel = String(index + 1)
  const commonA11y = {
    "aria-current": step.state === "active" ? ("step" as const) : undefined,
    "aria-disabled": step.state === "locked" ? true : undefined,
  }

  // Better than UX.md: processing pulse, done check, count badges, locked tooltip,
  // keyboard focus, reduced-motion respect, context-preserving navigation.
  const baseClasses =
    "group flex items-center gap-2 px-3 py-2 border-2 font-mono text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all btn-press"

  if (step.state === "locked") {
    return (
      <div
        className={`${baseClasses} bg-surface-variant text-black/40 border-black/30 cursor-not-allowed brutal-shadow-sm`}
        title={step.lockedReason ?? "Locked"}
        aria-label={`${step.label} locked: ${step.lockedReason ?? ""}`}
        {...commonA11y}
      >
        <span className="w-6 h-6 bg-white border-2 border-black/30 flex items-center justify-center text-[11px] font-black">
          {numberLabel}
        </span>
        <span className="material-symbols-outlined text-[16px] opacity-60">lock</span>
        <span className="hidden xl:inline">{step.label}</span>
      </div>
    )
  }

  if (step.state === "done") {
    return (
      <NavLink
        to={step.toWithContext}
        className={`${baseClasses} bg-white text-black border-black hover:bg-[#c8ff00] brutal-shadow-sm`}
        aria-label={`${step.label} completed, go to ${step.label}`}
        title="Completed — click to revisit"
        {...commonA11y}
      >
        <span className="w-6 h-6 bg-black text-[#ffd400] border-2 border-black flex items-center justify-center">
          <span className="material-symbols-outlined text-[14px] font-bold">check</span>
        </span>
        <span className="hidden sm:inline">{step.label}</span>
        <span className="hidden xl:inline text-black/50 font-bold normal-case tracking-normal">— Done</span>
      </NavLink>
    )
  }

  if (step.state === "active") {
    return (
      <div
        className={`${baseClasses} bg-[#ffd400] text-black border-black brutal-shadow-sm cursor-default`}
        {...commonA11y}
      >
        <span className="w-6 h-6 bg-black text-white border-2 border-black flex items-center justify-center">
          {numberLabel}
        </span>
        <span className="hidden sm:inline">{step.label}</span>
        <span className="material-symbols-outlined text-[14px] animate-pulse hidden sm:inline">arrow_forward</span>
      </div>
    )
  }

  if (step.state === "processing") {
    return (
      <NavLink
        to={step.toWithContext}
        className={`${baseClasses} bg-[#ffd400] text-black border-black brutal-shadow-sm animate-pulse`}
        aria-label={`${step.label} processing`}
        {...commonA11y}
      >
        <span className="w-6 h-6 bg-black border-2 border-black flex items-center justify-center">
          <span className="w-3 h-3 border-2 border-white border-t-transparent animate-spin block" />
        </span>
        <span className="hidden sm:inline">{step.label}</span>
        <span className="hidden md:inline text-[10px]">Processing</span>
      </NavLink>
    )
  }

  // available
  return (
    <NavLink
      to={step.toWithContext}
      className={`${baseClasses} bg-white text-black border-black hover:bg-white hover:translate-x-[1px] brutal-shadow-sm`}
      aria-label={`Go to ${step.label}`}
      {...commonA11y}
    >
      <span className="w-6 h-6 bg-white text-black border-2 border-black flex items-center justify-center">
        {numberLabel}
      </span>
      <span className="hidden sm:inline">{step.label}</span>
    </NavLink>
  )
}

// Mobile variant — horizontal scroll snap, compact + dataset context
export function WorkflowStepperMobile() {
  const { steps, context, contextCounts } = useWorkflowProgress()
  return (
    <nav aria-label="ML workflow progress" className="w-full border-b-2 border-black bg-white lg:hidden">
      <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-widest flex items-center gap-1.5 border-b border-black/10">
        <span className="material-symbols-outlined text-[12px]">database</span>
        <span className="truncate font-black">
          {context.datasetName ? context.datasetName : "No dataset"}
        </span>
        {context.datasetId && (
          <span className="text-black/50 truncate">
            • {contextCounts.pipelinesCompleted}/{contextCounts.pipelines} pipes • {contextCounts.modelsCompleted}/{contextCounts.models} models
          </span>
        )}
      </div>
      <ol className="flex gap-2 px-3 py-2 overflow-x-auto snap-x snap-mandatory scrollbar-thin">
        {steps.map((step, idx) => (
          <li key={step.id} className="snap-start shrink-0">
            <StepChip step={step} index={idx} />
          </li>
        ))}
      </ol>
    </nav>
  )
}
