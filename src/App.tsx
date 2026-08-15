import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { type JSX } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { GlobalErrorBoundary } from "./shared/components/GlobalErrorBoundary"
import { ModuleErrorBoundary } from "./shared/components/ModuleErrorBoundary"
import { RouteGuard } from "./shared/components/RouteGuard"
import Layout from "./components/Layout"
import Home from "./pages/Home"
import Dashboard from "./pages/Dashboard"
import DatasetUpload from "./pages/DatasetUpload"
import DatasetOverview from "./pages/DatasetOverview"
import Cleaning from "./pages/Cleaning"
import Preprocessing from "./pages/Preprocessing"
import Visualizations from "./pages/Visualizations"
import ModelTraining from "./pages/ModelTraining"
import ModelComparison from "./pages/ModelComparison"
import Results from "./pages/Results"
import Settings from "./pages/Settings"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const err = error as { code?: string; response?: unknown } | null
        const isNetwork = !!err && (err.code === 'ERR_NETWORK' || err.code === 'ECONNREFUSED' || !err.response)
        // Network errors (backend not yet up / unreachable) retry with backoff;
        // real 4xx/5xx responses from a live backend fail fast.
        if (!isNetwork) return false
        return failureCount < 5
      },
      retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 8000),
      staleTime: 30_000,
    },
  },
})

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
              <Route path="/cleaning" element={withErrorBoundary(<Cleaning />, "Cleaning")} />
              <Route
                path="/preprocessing"
                element={withErrorBoundary(
                  <RouteGuard require="cleaned_dataset"><Preprocessing /></RouteGuard>,
                  "Preprocessing",
                )}
              />
              <Route
                path="/training"
                element={withErrorBoundary(
                  <RouteGuard require="preprocessing"><ModelTraining /></RouteGuard>,
                  "ModelTraining",
                )}
              />
              <Route
                path="/compare"
                element={withErrorBoundary(
                  <RouteGuard require="model"><ModelComparison /></RouteGuard>,
                  "ModelComparison",
                )}
              />
              <Route
                path="/visualizations"
                element={withErrorBoundary(
                  <RouteGuard require="model"><Visualizations /></RouteGuard>,
                  "Visualizations",
                )}
              />
              <Route
                path="/results"
                element={withErrorBoundary(
                  <RouteGuard require="training_completed"><Results /></RouteGuard>,
                  "Results",
                )}
              />
              <Route path="/settings" element={withErrorBoundary(<Settings />, "Settings")} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  )
}
