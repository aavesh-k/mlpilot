import { Outlet, useLocation } from "react-router-dom"
import Sidebar from "./Sidebar"
import TopNav from "./TopNav"

export default function Layout() {
  const location = useLocation()
  const hideSidebar = location.pathname === "/" || location.pathname === "/auth"

  return (
    <div className="flex h-screen overflow-hidden">
      {!hideSidebar && <Sidebar />}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!hideSidebar && <TopNav />}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
