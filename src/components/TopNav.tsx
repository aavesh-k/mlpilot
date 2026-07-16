import { NavLink, useLocation } from "react-router-dom"
import { useState, useEffect } from "react"

const links = [
  { to: "/", label: "Home" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/results", label: "Reports" },
  { to: "/settings", label: "Settings" },
]

export default function TopNav() {
  const [dark, setDark] = useState(false)
  const location = useLocation()

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
  }, [dark])

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/"
    return location.pathname.startsWith(path)
  }

  return (
    <header className="flex justify-between items-center w-full px-6 py-4 bg-background border-b-2 border-primary">
      <div className="flex items-center gap-8">
        <NavLink to="/" className="text-xl font-headline font-black text-primary tracking-tighter uppercase">
          MLPilot
        </NavLink>
        <nav className="hidden lg:flex items-center gap-6">
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
        <button
          onClick={() => setDark(!dark)}
          className="p-2 hover:bg-primary-container transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined">{dark ? "light_mode" : "dark_mode"}</span>
        </button>
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
