import { NavLink } from "react-router-dom"
import { useEffect } from "react"

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const navItems = [
  { to: "/dashboard", icon: "dashboard", label: "Overview" },
  { to: "/datasets", icon: "database", label: "Dataset" },
  { to: "/training", icon: "model_training", label: "Training" },
  { to: "/preprocessing", icon: "process_chart", label: "Preprocessing" },
  { to: "/compare", icon: "leaderboard", label: "Leaderboard" },
  { to: "/eda", icon: "monitoring", label: "Visualizations" },
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
    <div className="flex flex-col h-full py-8 px-4 gap-2 bg-background w-64">
      <div className="mb-10 px-4">
        <h2 className="font-headline font-bold text-primary tracking-tighter uppercase text-xs opacity-60">
          SECTIONS
        </h2>
        <p className="font-headline text-lg font-black text-primary">ML Workflow</p>
      </div>
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end
            onClick={() => onClose()}
            className={({ isActive }) =>
              `flex items-center gap-3 py-3 px-4 font-headline text-sm font-medium transition-transform hover:translate-x-1 ${
                isActive
                  ? "bg-primary-container text-primary border-2 border-primary -mr-0.5 z-10"
                  : "text-on-surface-variant hover:text-primary"
              }`
            }
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto border-t-2 border-primary pt-6 px-4">
        <a className="flex items-center gap-3 py-2 text-on-surface-variant hover:text-primary transition-transform hover:translate-x-1 font-headline text-sm font-medium" href="#">
          <span className="material-symbols-outlined">download</span>
          Downloads
        </a>
      </div>
    </div>
  )

  return (
    <>
      <aside className="hidden lg:flex flex-col h-screen border-r-2 border-primary flex-shrink-0">
        {sidebarContent}
      </aside>

      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={onClose} />
          <aside className="absolute left-0 top-0 h-full border-r-2 border-primary" style={{ animation: "slideIn 0.2s ease-out" }}>
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
