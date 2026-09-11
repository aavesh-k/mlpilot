import { useState } from "react"
import { Outlet, useLocation } from "react-router-dom"
import Sidebar from "./Sidebar"
import TopNav from "./TopNav"
import BottomNav from "./BottomNav"
import WorkflowStepper, { WorkflowStepperMobile } from "../shared/components/WorkflowStepper"

export default function Layout() {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const hideSidebar = location.pathname === "/"
  const showStepper = !hideSidebar

  return (
    <div className={`flex h-screen overflow-hidden ${hideSidebar ? "bg-brutal-grid" : "bg-brutal-grid"}`}>
      {!hideSidebar && <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
      <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        {!hideSidebar && <TopNav onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />}
        {showStepper && <WorkflowStepper />}
        {showStepper && <WorkflowStepperMobile />}
        <div className={`flex-1 overflow-y-auto min-h-0 scroll-smooth overscroll-contain ${hideSidebar ? "" : "pb-[72px] lg:pb-0"}`}>
          {hideSidebar ? (
            <Outlet />
          ) : (
            <div className="mx-auto w-full max-w-7xl min-w-0">
              <Outlet />
            </div>
          )}
        </div>
        {!hideSidebar && <BottomNav />}
      </main>
    </div>
  )
}
