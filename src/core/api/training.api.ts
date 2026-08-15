import { apiClient } from './client'
import type { PaginatedResponse } from '../types/api'

export interface ModelMetrics {
  accuracy?: number
  f1_score?: number
  precision?: number
  recall?: number
  roc_auc?: number
  r2?: number
  rmse?: number
  mae?: number
  mape?: number
  cv_mean_score?: number
  [key: string]: number | undefined
}

export interface Model {
  id: string
  job_id?: string
  dataset_id: string
  pipeline_id?: string
  target_column?: string
  name: string
  algorithm: string
  hyperparameters: Record<string, unknown>
  metrics?: ModelMetrics
  status: string
  is_best?: boolean
  file_path?: string
  error_message?: string
  training_duration_ms?: number
  created_at: string
}

export interface TrainingJob {
  id: string
  model_id: string | null
  model_ids?: string[]
  pipeline_id?: string
  status: string
  progress: number
  log?: string
  error_message?: string
  started_at?: string
  run_started_at?: string
  completed_at?: string
  eta_seconds?: number | null
  created_at: string
}

export interface AlgorithmInfo {
  tunable_grid: Record<string, unknown[]>
  defaults: Record<string, unknown>
}

export const trainingApi = {
  async train(body: {
    pipeline_id: string
    algorithms: string[]
    cv_folds?: number
    primary_metric?: string
    tuning_enabled?: boolean
    hyperparameters?: Record<string, Record<string, unknown>>
    name?: string
  }): Promise<{ model: Model; models: Model[]; job: TrainingJob }> {
    const { data } = await apiClient.post('/training/', body)
    return data
  },

  async getAlgorithms(): Promise<{ algorithms: Record<string, AlgorithmInfo> }> {
    const { data } = await apiClient.get('/training/algorithms')
    return data
  },

  async listModels(page = 1, perPage = 20): Promise<PaginatedResponse<Model>> {
    const { data } = await apiClient.get('/training/models', { params: { page, per_page: perPage } })
    return data
  },

  async getModel(id: string): Promise<Model> {
    const { data } = await apiClient.get(`/training/models/${id}`)
    return data
  },

  async compare(ids: string[]): Promise<{ models: any[] }> {
    const { data } = await apiClient.get('/training/models/compare', { params: { ids: ids.join(',') } })
    return data
  },

  async explain(modelId: string, rowIdx = 0): Promise<any> {
    const { data } = await apiClient.get(`/training/models/${modelId}/explain`, { params: { row_idx: rowIdx } })
    return data
  },

  async predict(modelId: string, file: File, preprocessed = false): Promise<any> {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await apiClient.post(
      `/training/models/${modelId}/predict`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        params: { preprocessed }
      }
    )
    return data
  },

  async downloadPredictions(filename: string): Promise<void> {
    const resp = await apiClient.get(`/training/predictions/download`, {
      params: { filename },
      responseType: 'blob'
    })
    const url = URL.createObjectURL(new Blob([resp.data]))
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },

  async listJobs(page = 1, perPage = 20): Promise<PaginatedResponse<TrainingJob>> {
    const { data } = await apiClient.get('/training/jobs', { params: { page, per_page: perPage } })
    return data
  },

  async getJob(id: string): Promise<TrainingJob> {
    const { data } = await apiClient.get(`/training/jobs/${id}`)
    return data
  },

  async cancelJob(id: string): Promise<TrainingJob> {
    const { data } = await apiClient.post(`/training/jobs/${id}/cancel`)
    return data
  },

  async deleteJob(id: string): Promise<void> {
    await apiClient.delete(`/training/jobs/${id}`)
  },

  async setBest(id: string): Promise<Model> {
    const { data } = await apiClient.post(`/training/models/${id}/set-best`)
    return data
  },

  async getPlots(modelId: string): Promise<ModelPlotsResponse> {
    const { data } = await apiClient.get(`/training/models/${modelId}/plots`)
    return data
  },
}

export interface ClassificationPlots {
  confusion_matrix: {
    classes: string[]
    matrix: number[][]
  }
  roc_curve: Record<string, { fpr: number[]; tpr: number[]; auc: number }> | { fpr: number[]; tpr: number[]; auc: number }
  pr_curve?: Record<string, { precision: number[]; recall: number[]; ap: number }> | { precision: number[]; recall: number[]; ap: number }
  feature_importance: { feature: string; importance: number }[]
  classification_report: Record<string, any>
}

export interface RegressionPlots {
  pred_vs_actual: {
    actual: number[]
    predicted: number[]
  }
  residuals: {
    predicted: number[]
    residuals: number[]
  }
  error_distribution: {
    counts: number[]
    bin_centers: number[]
  }
  feature_importance: { feature: string; importance: number }[]
}

export interface ModelComparisonItem {
  id: string
  name: string
  algorithm: string
  metrics: Record<string, number>
  is_best: boolean
}

export interface ModelPlotsResponse {
  problem_type: 'classification' | 'regression'
  classification?: ClassificationPlots
  regression?: RegressionPlots
  learning_curve: {
    train_sizes: number[]
    train_scores: number[]
    val_scores: number[]
  }
  model_comparison: ModelComparisonItem[]
}
