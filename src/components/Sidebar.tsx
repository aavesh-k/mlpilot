import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { useEffect } from "react"
import { useWorkflowProgress, type WorkflowStepId } from "../shared/hooks/useWorkflowProgress"
import { useAuthStore } from "../modules/auth/store/authStore"

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const navItems = [
  { to: "/dashboard", icon: "dashboard", label: "Dashboard", stepId: null as WorkflowStepId | null },
  { to: "/datasets", icon: "database", label: "Dataset", stepId: "upload" as WorkflowStepId },
  { to: "/cleaning", icon: "cleaning_services", label: "Cleaning", stepId: "clean" as WorkflowStepId },
  { to: "/preprocessing", icon: "account_tree", label: "Preprocessing", stepId: "preprocess" as WorkflowStepId },
  { to: "/training", icon: "model_training", label: "Training", stepId: "train" as WorkflowStepId },
  { to: "/compare", icon: "leaderboard", label: "Leaderboard", stepId: "compare" as WorkflowStepId },
  { to: "/results", icon: "description", label: "Reports", stepId: "predict" as WorkflowStepId },
]

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { steps, counts } = useWorkflowProgress()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [isOpen])

  const getStepForItem = (stepId: WorkflowStepId | null) => {
    if (!stepId) return null
    return steps.find((s) => s.id === stepId) ?? null
  }

  const sidebarContent = (
    <div className="flex flex-col h-full py-6 px-4 gap-2 bg-white w-[280px] max-w-[85vw] sm:w-64 overflow-y-auto pb-safe">
      <div className="mb-6 px-2">
        <div className="inline-flex items-center gap-2 bg-white border-2 border-black brutal-shadow-sm px-3 py-1 -rotate-1">
          <span className="font-mono text-[10px] uppercase tracking-widest font-black text-black">// WORKFLOW</span>
        </div>
        <p className="font-headline text-xl font-black uppercase tracking-tight text-black mt-3 leading-none">
          ML Workflow
        </p>
        <p className="font-mono text-[10px] uppercase tracking-widest text-black/60 mt-1">6 STEPS • GUIDED</p>
        {/* Better than UX.md: live inventory counts */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="font-mono text-[9px] font-bold uppercase bg-white border border-black px-1.5 py-0.5">Ds {counts.datasets}</span>
          <span className="font-mono text-[9px] font-bold uppercase bg-white border border-black px-1.5 py-0.5">Cl {counts.cleaned}</span>
          <span className="font-mono text-[9px] font-bold uppercase bg-white border border-black px-1.5 py-0.5">Pp {counts.pipelinesCompleted}/{counts.pipelines}</span>
          <span className="font-mono text-[9px] font-bold uppercase bg-white border border-black px-1.5 py-0.5">Md {counts.modelsCompleted}/{counts.models}</span>
        </div>
      </div>
      <nav className="flex-1 space-y-1.5" aria-label="Primary">
        {navItems.map((item) => {
          const step = getStepForItem(item.stepId)
          const isLocked = step?.state === "locked"
          const isActive = item.to === "/dashboard" ? location.pathname === "/dashboard" : location.pathname.startsWith(item.to)
          const isDone = step?.state === "done"
          const isProcessing = step?.state === "processing"

          const base = "flex items-center gap-3 py-2.5 px-3 border-2 font-mono text-xs font-black uppercase tracking-widest transition-all btn-press"

          if (isLocked) {
            return (
              <div
                key={item.label}
                title={step?.lockedReason ?? "Locked"}
                aria-disabled="true"
                className={`${base} bg-white text-black/30 border-black/20 cursor-not-allowed`}
              >
                <span className="material-symbols-outlined text-[16px]">lock</span>
                <span className="flex-1 truncate">{item.label}</span>
                <span className="material-symbols-outlined text-[14px] opacity-60">lock</span>
              </div>
            )
          }

          return (
            <NavLink
              key={item.label}
              to={step ? step.toWithContext : item.to}
              end={item.to === "/dashboard"}
              onClick={() => onClose()}
              aria-current={isActive ? "page" : undefined}
              title={step?.lockedReason ?? (isDone ? "Completed" : step?.description)}
              className={`${base} ${
                isActive
                  ? "bg-[#ffd400] text-black border-black brutal-shadow-sm"
                  : isDone
                    ? "bg-white text-black border-black hover:bg-[#c8ff00] brutal-shadow-sm"
                    : "bg-white text-black border-black hover:bg-[#c8ff00] brutal-shadow-sm hover:translate-x-1"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
              <span className="flex-1 truncate">{item.label}</span>
              {isDone && <span className="material-symbols-outlined text-[14px] text-black">check_circle</span>}
              {isProcessing && <span className="w-3 h-3 border-2 border-black border-t-transparent animate-spin block" aria-hidden="true" />}
              {!isDone && !isProcessing && !isLocked && isActive && (
                <span className="w-2 h-2 bg-black rounded-none animate-pulse" aria-hidden="true" />
              )}
            </NavLink>
          )
        })}
      </nav>
      {user ? (
        <div className="mt-4 border-2 border-black bg-[#ffd400] p-3 brutal-shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 bg-black text-white flex items-center justify-center font-mono font-black text-xs border-2 border-black">
              {user.email[0].toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] font-black uppercase truncate">{user.email}</p>
              <p className="font-mono text-[9px] uppercase tracking-widest text-black/60">Private vault</p>
            </div>
          </div>
          <button
            onClick={() => {
              logout()
              navigate('/login', { replace: true })
              onClose()
            }}
            className="mt-3 w-full bg-black text-white border-2 border-black font-mono text-xs font-black uppercase tracking-widest py-2 hover:bg-white hover:text-black transition-colors"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <div className="mt-4 border-2 border-black bg-amber-50 p-3 brutal-shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 bg-[#ffd400] text-black flex items-center justify-center font-mono font-black text-xs border-2 border-black">
              G
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-headline font-black text-[11px] uppercase tracking-tight text-black">Guest Mode</p>
              <p className="font-mono text-[9px] uppercase tracking-widest text-black/60">Demo & Preview Only</p>
            </div>
          </div>
          <button
            onClick={() => {
              navigate('/register')
              onClose()
            }}
            className="mt-3 w-full bg-black text-white border-2 border-black font-mono text-xs font-black uppercase tracking-widest py-2 hover:bg-[#ffd400] hover:text-black transition-colors btn-press shadow-[2px_2px_0_0_#000]"
          >
            Sign Up Free →
          </button>
        </div>
      )}
      <div className="mt-6 border-2 border-black bg-white p-3 -rotate-1">
        <p className="font-mono text-[10px] uppercase tracking-widest font-black text-black">DATA → MODEL</p>
        <p className="font-mono text-[10px] uppercase tracking-widest text-black/60">isolated • per-user</p>
      </div>
    </div>
  )

  return (
    <>
      <aside className="hidden lg:flex flex-col h-screen border-r-[3px] border-black flex-shrink-0 bg-white">
        {sidebarContent}
      </aside>

      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
          <aside className="absolute left-0 top-0 h-full border-r-[3px] border-black bg-white shadow-[8px_8px_0_0_#000] max-w-[85vw]" style={{ animation: "slideIn 0.2s ease-out" }}>
            {sidebarContent}
          </aside>
        </div>
      )}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  )
}
