import { BrowserRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/datasets" element={<DatasetUpload />} />
            <Route path="/datasets/:id" element={<DatasetOverview />} />
            <Route path="/preprocessing" element={<Preprocessing />} />
            <Route path="/eda" element={<EDA />} />
            <Route path="/training" element={<ModelTraining />} />
            <Route path="/compare" element={<ModelComparison />} />
            <Route path="/results" element={<Results />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
