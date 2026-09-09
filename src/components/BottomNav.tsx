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
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t-[3px] border-black flex justify-around items-center py-2 px-2">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-widest border-2 transition-colors btn-press ${
              isActive
                ? "bg-black text-white border-black"
                : "bg-white text-black border-black hover:bg-[#ffd400]"
            }`
          }
        >
          <span className="material-symbols-outlined text-xl leading-none">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
