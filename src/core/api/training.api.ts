import { apiClient } from './client'
import type { PaginatedResponse } from '../types/api'

export interface ModelMetrics {
  accuracy: number
  f1_score: number
  precision: number
  recall: number
  roc_auc?: number
}

export interface Model {
  id: string
  dataset_id: string
  pipeline_id?: string
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
  model_id: string
  status: string
  progress: number
  log?: string
  error_message?: string
  started_at?: string
  completed_at?: string
  created_at: string
}

export const trainingApi = {
  async train(body: {
    dataset_id: string
    algorithm: string
    pipeline_id?: string
    target_column?: string
    hyperparameters?: Record<string, unknown>
    test_size?: number
    random_seed?: number
  }): Promise<{ model: Model; job: TrainingJob }> {
    const { data } = await apiClient.post('/training/', body)
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

  async compare(ids: string[]): Promise<Model[]> {
    const { data } = await apiClient.get('/training/models/compare', { params: { ids: ids.join(',') } })
    return data
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
}
