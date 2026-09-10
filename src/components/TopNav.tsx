import { NavLink, useLocation } from "react-router-dom"

interface TopNavProps {
  onToggleSidebar?: () => void
}

const links = [
  { to: "/", label: "Home" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/results", label: "Reports" },
]

export default function TopNav({ onToggleSidebar }: TopNavProps) {
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/"
    return location.pathname.startsWith(path)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b-[3px] border-black bg-[#c8ff00]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 border-2 border-black bg-white brutal-shadow-sm hover:bg-[#ffd400] transition-colors cursor-pointer -ml-1 btn-press"
            aria-label="Toggle sidebar"
          >
            <span className="material-symbols-outlined text-xl leading-none">menu</span>
          </button>

          {/* Brand: black square + wordmark */}
          <NavLink to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-black flex items-center justify-center shadow-[3px_3px_0_0_#fff] border-2 border-black shrink-0">
              <span className="text-[#ffd400] font-black text-xl leading-none tracking-tighter">M</span>
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-headline font-black text-xl uppercase tracking-tight text-black">
                ML<span className="text-black">Pilot</span>
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-black/70 font-bold hidden sm:block">
                DATA → MODEL
              </span>
            </div>
          </NavLink>

          <nav className="hidden lg:flex items-center gap-1 ml-8">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={() =>
                  `font-mono text-xs uppercase tracking-widest font-bold px-3 py-1.5 border-2 transition-colors btn-press ${
                    isActive(link.to)
                      ? "bg-black text-white border-black brutal-shadow-sm"
                      : "bg-white text-black border-black hover:bg-[#ffd400] brutal-shadow-sm"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <NavLink
            to="/datasets"
            className="bg-black text-white font-mono text-xs uppercase font-black tracking-widest px-6 py-2.5 border-2 border-black shadow-[4px_4px_0_0_#000] hover:bg-black/90 btn-press active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
            title="Upload a new dataset to start a pipeline"
          >
            New Dataset →
          </NavLink>
        </div>
      </div>
    </header>
  )
}
