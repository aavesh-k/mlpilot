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
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!hideSidebar && <TopNav onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />}
        {showStepper && <WorkflowStepper />}
        {showStepper && <WorkflowStepperMobile />}
        <div className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          <Outlet />
        </div>
        {!hideSidebar && <BottomNav />}
      </main>
    </div>
  )
}
