import { NavLink } from "react-router-dom"
import { useWorkflowProgress } from "../shared/hooks/useWorkflowProgress"

const items = [
  { to: "/dashboard", icon: "dashboard", label: "Home", stepId: null as string | null },
  { to: "/datasets", icon: "database", label: "Data", stepId: "upload" },
  { to: "/cleaning", icon: "cleaning_services", label: "Clean", stepId: "clean" },
  { to: "/preprocessing", icon: "account_tree", label: "Preproc", stepId: "preprocess" },
  { to: "/training", icon: "model_training", label: "Train", stepId: "train" },
  { to: "/compare", icon: "leaderboard", label: "Compare", stepId: "compare" },
  { to: "/results", icon: "description", label: "Reports", stepId: "predict" },
]

export default function BottomNav() {
  const { steps } = useWorkflowProgress()
  const getStep = (id: string | null) => (id ? steps.find((s) => s.id === id) : null)

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t-[3px] border-black pb-safe">
      {/* grid ensures 7 items fit without horizontal scroll on 320px; flex would overflow */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 p-1 sm:p-1.5 items-stretch">
        {items.map((item) => {
          const step = getStep(item.stepId)
          const isLocked = step?.state === "locked"
          if (isLocked) {
            return (
              <div
                key={item.to}
                title={step?.lockedReason ?? "Locked"}
                aria-disabled="true"
                className="flex flex-col items-center justify-center gap-0.5 px-1 py-2 font-mono text-[8px] sm:text-[9px] font-black uppercase tracking-widest border-2 bg-white text-black/25 border-black/20 cursor-not-allowed min-h-[56px] text-center leading-tight"
              >
                <span className="material-symbols-outlined text-base sm:text-lg leading-none opacity-60">lock</span>
                <span className="truncate w-full">{item.label}</span>
              </div>
            )
          }
          return (
            <NavLink
              key={item.to}
              to={step ? step.toWithContext : item.to}
              end={item.to === "/dashboard"}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 px-1 py-2 font-mono text-[8px] sm:text-[9px] font-black uppercase tracking-widest border-2 transition-colors btn-press min-h-[56px] text-center leading-tight truncate ${
                  isActive ? "bg-black text-white border-black" : "bg-white text-black border-black hover:bg-[#ffd400]"
                }`
              }
            >
              <span className="material-symbols-outlined text-base sm:text-lg leading-none shrink-0">{item.icon}</span>
              <span className="truncate w-full">{item.label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
