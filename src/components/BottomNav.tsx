import { NavLink } from "react-router-dom"

const items = [
  { to: "/dashboard", icon: "dashboard", label: "Home" },
  { to: "/datasets", icon: "database", label: "Data" },
  { to: "/cleaning", icon: "cleaning_services", label: "Clean" },
  { to: "/preprocessing", icon: "process_chart", label: "Pipeline" },
  { to: "/training", icon: "model_training", label: "Train" },
  { to: "/results", icon: "description", label: "Reports" },
]

export default function BottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t-2 border-primary flex justify-around items-center py-2 px-2">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 rounded font-headline text-[10px] font-bold uppercase transition-colors ${
              isActive
                ? "text-primary"
                : "text-on-surface-variant hover:text-primary"
            }`
          }
        >
          <span className="material-symbols-outlined text-2xl">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
