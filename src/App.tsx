import { BrowserRouter, Routes, Route } from "react-router-dom"
import { type JSX } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { GlobalErrorBoundary } from "./shared/components/GlobalErrorBoundary"
import { ModuleErrorBoundary } from "./shared/components/ModuleErrorBoundary"
import Layout from "./components/Layout"
import Home from "./pages/Home"
import Dashboard from "./pages/Dashboard"
import DatasetUpload from "./pages/DatasetUpload"
import DatasetOverview from "./pages/DatasetOverview"
import Preprocessing from "./pages/Preprocessing"
import EDA from "./pages/EDA"
import ModelTraining from "./pages/ModelTraining"
import ModelComparison from "./pages/ModelComparison"
import Results from "./pages/Results"
import Settings from "./pages/Settings"

const queryClient = new QueryClient()

function withErrorBoundary(element: JSX.Element, name?: string) {
  return <ModuleErrorBoundary moduleName={name}>{element}</ModuleErrorBoundary>
}

export default function App() {
  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={withErrorBoundary(<Home />, "Home")} />
              <Route path="/dashboard" element={withErrorBoundary(<Dashboard />, "Dashboard")} />
              <Route path="/datasets" element={withErrorBoundary(<DatasetUpload />, "Datasets")} />
              <Route path="/datasets/:id" element={withErrorBoundary(<DatasetOverview />, "DatasetOverview")} />
              <Route path="/preprocessing" element={withErrorBoundary(<Preprocessing />, "Preprocessing")} />
              <Route path="/eda" element={withErrorBoundary(<EDA />, "EDA")} />
              <Route path="/training" element={withErrorBoundary(<ModelTraining />, "ModelTraining")} />
              <Route path="/compare" element={withErrorBoundary(<ModelComparison />, "ModelComparison")} />
              <Route path="/results" element={withErrorBoundary(<Results />, "Results")} />
              <Route path="/settings" element={withErrorBoundary(<Settings />, "Settings")} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  )
}
