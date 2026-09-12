import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { useAuthStore } from "../modules/auth/store/authStore"

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
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/"
    return location.pathname.startsWith(path)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b-[3px] border-black bg-[#c8ff00]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 border-2 border-black bg-white brutal-shadow-sm hover:bg-[#ffd400] transition-colors cursor-pointer shrink-0 -ml-0.5 btn-press min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Toggle sidebar"
          >
            <span className="material-symbols-outlined text-xl leading-none">menu</span>
          </button>

          {/* Brand: black square + wordmark */}
          <NavLink to="/" className="flex items-center gap-2 sm:gap-3 group min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-black flex items-center justify-center shadow-[2px_2px_0_0_#fff] sm:shadow-[3px_3px_0_0_#fff] border-2 border-black shrink-0">
              <span className="text-[#ffd400] font-black text-lg sm:text-xl leading-none tracking-tighter">M</span>
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="font-headline font-black text-lg sm:text-xl uppercase tracking-tight text-black truncate">
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

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <NavLink
            to="/datasets"
            className="bg-black text-white font-mono text-[11px] sm:text-xs uppercase font-black tracking-widest px-3 sm:px-6 py-2.5 border-2 border-black shadow-[3px_3px_0_0_#000] sm:shadow-[4px_4px_0_0_#000] hover:bg-black/90 btn-press active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 whitespace-nowrap min-h-[44px] flex items-center justify-center"
            title="Upload a new dataset to start a pipeline"
          >
            <span className="hidden sm:inline">New Dataset →</span>
            <span className="sm:hidden">New →</span>
          </NavLink>
          {user ? (
            <div className="hidden sm:flex items-center gap-2 border-2 border-black bg-white px-2 py-1 brutal-shadow-sm">
              <span className="w-7 h-7 bg-black text-[#ffd400] flex items-center justify-center font-mono font-black text-xs">
                {user.email[0].toUpperCase()}
              </span>
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest max-w-[120px] truncate">{user.email}</span>
              <button onClick={handleLogout} className="ml-1 bg-white border border-black px-2 py-1 font-mono text-[10px] font-black uppercase hover:bg-red-50 transition-colors" title="Sign out">
                Logout
              </button>
            </div>
          ) : (
            <NavLink to="/login" className="hidden sm:inline-flex bg-white text-black border-2 border-black font-mono text-xs font-black uppercase tracking-widest px-4 py-2 shadow-[3px_3px_0_0_#000] hover:bg-[#ffd400] btn-press min-h-[44px] items-center">
              Sign In
            </NavLink>
          )}
        </div>
      </div>
    </header>
  )
}
