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
    <header className="flex justify-between items-center w-full px-6 py-4 bg-background border-b-2 border-primary">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 hover:bg-primary-container transition-colors cursor-pointer -ml-2"
          aria-label="Toggle sidebar"
        >
          <span className="material-symbols-outlined text-2xl">menu</span>
        </button>
        <NavLink to="/" className="text-xl font-headline font-black tracking-tighter uppercase">
          <span className="text-primary">ML</span>
          <span className="text-secondary">Pilot</span>
        </NavLink>
        <nav className="hidden lg:flex items-center gap-6 ml-8">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={() =>
                `font-headline text-xs uppercase tracking-tighter transition-colors px-2 py-1 ${
                  isActive(link.to)
                    ? "text-primary font-bold border-b-4 border-primary pb-1"
                    : "text-on-surface-variant hover:bg-primary-container"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <NavLink
          to="/datasets"
          className="bg-primary text-on-primary font-headline text-xs uppercase font-bold px-6 py-2 border-2 border-primary hover:bg-primary-container hover:text-primary transition-all active:scale-95"
        >
          New run
        </NavLink>
      </div>
    </header>
  )
}
