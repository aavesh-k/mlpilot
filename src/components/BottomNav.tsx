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
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t-[3px] border-black flex justify-around items-center py-1 px-1 overflow-x-auto">
      {items.map((item) => {
        const step = getStep(item.stepId)
        const isLocked = step?.state === "locked"
        if (isLocked) {
          return (
            <div
              key={item.to}
              title={step?.lockedReason ?? "Locked"}
              aria-disabled="true"
              className="flex flex-col items-center gap-0.5 px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-widest border-2 bg-white text-black/25 border-black/20 cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-lg leading-none opacity-60">lock</span>
              {item.label}
            </div>
          )
        }
        return (
          <NavLink
            key={item.to}
            to={step ? step.toWithContext : item.to}
            end={item.to === "/dashboard"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-widest border-2 transition-colors btn-press shrink-0 ${
                isActive ? "bg-black text-white border-black" : "bg-white text-black border-black hover:bg-[#ffd400]"
              }`
            }
          >
            <span className="material-symbols-outlined text-lg leading-none">{item.icon}</span>
            {item.label}
          </NavLink>
        )
      })}
    </nav>
  )
}
