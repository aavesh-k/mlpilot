import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { lazy, Suspense, type JSX } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "./core/queryClient"
import { GlobalErrorBoundary } from "./shared/components/GlobalErrorBoundary"
import { ModuleErrorBoundary } from "./shared/components/ModuleErrorBoundary"
import { RouteGuard } from "./shared/components/RouteGuard"
import { AuthGuard, PublicOnly } from "./shared/components/AuthGuard"
import { LoadingSpinner } from "./shared/components/LoadingSpinner"
import Layout from "./components/Layout"
import { useAuthStore } from "./modules/auth/store/authStore"

const Home = lazy(() => import("./pages/Home"))
const Login = lazy(() => import("./pages/Login"))
const Register = lazy(() => import("./pages/Register"))
const Dashboard = lazy(() => import("./pages/Dashboard"))
const DatasetUpload = lazy(() => import("./pages/DatasetUpload"))
const DatasetOverview = lazy(() => import("./pages/DatasetOverview"))
const Cleaning = lazy(() => import("./pages/Cleaning"))
const Preprocessing = lazy(() => import("./pages/Preprocessing"))
const Visualizations = lazy(() => import("./pages/Visualizations"))
const ModelTraining = lazy(() => import("./pages/ModelTraining"))
const ModelComparison = lazy(() => import("./pages/ModelComparison"))
const Results = lazy(() => import("./pages/Results"))
const EDA = lazy(() => import("./pages/EDA"))

function PageFallback() {
  return (
    <div className="p-8 lg:p-12 flex items-center justify-center min-h-[40vh]">
      <LoadingSpinner />
    </div>
  )
}

function withErrorBoundary(element: JSX.Element, name?: string) {
  return <ModuleErrorBoundary moduleName={name}>{element}</ModuleErrorBoundary>
}

export default function App() {
  const userId = useAuthStore((s) => s.user?.id)

  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              {/* Public */}
              <Route path="/" element={withErrorBoundary(<Home />, "Home")} />
              <Route path="/login" element={withErrorBoundary(<PublicOnly><Login /></PublicOnly>, "Login")} />
              <Route path="/register" element={withErrorBoundary(<PublicOnly><Register /></PublicOnly>, "Register")} />
              {/* Protected */}
              <Route element={<AuthGuard><Layout key={userId || 'guest'} /></AuthGuard>}>
                <Route path="/dashboard" element={withErrorBoundary(<Dashboard />, "Dashboard")} />
                <Route path="/datasets" element={withErrorBoundary(<DatasetUpload />, "Datasets")} />
                <Route path="/datasets/:id" element={withErrorBoundary(<DatasetOverview />, "DatasetOverview")} />
                <Route path="/cleaning" element={withErrorBoundary(<Cleaning />, "Cleaning")} />
                <Route path="/eda" element={withErrorBoundary(<EDA />, "EDA")} />
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
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  )
}
