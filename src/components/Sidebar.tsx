import { NavLink } from "react-router-dom"
import { useEffect } from "react"

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const navItems = [
  { to: "/dashboard", icon: "dashboard", label: "Dashboard" },
  { to: "/datasets", icon: "database", label: "Dataset" },
  { to: "/cleaning", icon: "cleaning_services", label: "Cleaning" },
  { to: "/preprocessing", icon: "process_chart", label: "Preprocessing" },
  { to: "/training", icon: "model_training", label: "Training" },
  { to: "/compare", icon: "leaderboard", label: "Leaderboard" },
  { to: "/visualizations", icon: "monitoring", label: "Visualization" },
  { to: "/results", icon: "description", label: "Reports" },
]

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [isOpen])

  const sidebarContent = (
    <div className="flex flex-col h-full py-6 px-4 gap-2 bg-white w-64">
      <div className="mb-8 px-2">
        <div className="inline-flex items-center gap-2 bg-white border-2 border-black brutal-shadow-sm px-3 py-1 -rotate-1">
          <span className="font-mono text-[10px] uppercase tracking-widest font-black text-black">// WORKFLOW</span>
        </div>
        <p className="font-headline text-xl font-black uppercase tracking-tight text-black mt-3 leading-none">
          ML Workflow
        </p>
        <p className="font-mono text-[10px] uppercase tracking-widest text-black/60 mt-1">6 STEPS • GUIDED</p>
      </div>
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end
            onClick={() => onClose()}
            className={({ isActive }) =>
              `flex items-center gap-3 py-3 px-4 border-2 font-mono text-xs font-black uppercase tracking-widest transition-all btn-press ${
                isActive
                  ? "bg-[#ffd400] text-black border-black brutal-shadow-sm translate-x-0"
                  : "bg-white text-black border-black hover:bg-[#c8ff00] brutal-shadow-sm hover:translate-x-1"
              }`
            }
          >
            <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-6 border-2 border-black bg-white p-3 -rotate-1">
        <p className="font-mono text-[10px] uppercase tracking-widest font-black text-black">DATA → MODEL</p>
        <p className="font-mono text-[10px] uppercase tracking-widest text-black/60">local-first • open pipeline</p>
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
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <aside className="absolute left-0 top-0 h-full border-r-[3px] border-black bg-white shadow-[8px_8px_0_0_#000]" style={{ animation: "slideIn 0.2s ease-out" }}>
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
