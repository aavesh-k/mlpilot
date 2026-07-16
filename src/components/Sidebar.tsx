import { NavLink } from "react-router-dom"

const navItems = [
  { to: "/dashboard", icon: "dashboard", label: "Overview" },
  { to: "/datasets", icon: "database", label: "Dataset" },
  { to: "/training", icon: "model_training", label: "Training" },
  { to: "/preprocessing", icon: "cleaning_services", label: "Cleaning" },
  { to: "/preprocessing", icon: "process_chart", label: "Preprocessing", match: true },
  { to: "/results", icon: "leaderboard", label: "Leaderboard" },
  { to: "/eda", icon: "monitoring", label: "Visualizations" },
  { to: "/results", icon: "description", label: "Reports" },
]

export default function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col h-screen py-8 px-4 gap-2 bg-background border-r-2 border-primary w-64 flex-shrink-0">
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
            end={!item.match}
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
    </aside>
  )
}
