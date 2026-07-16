import { apiClient } from './client'
import type { PaginatedResponse } from '../types/api'

export interface PipelineStep {
  step_type: 'imputation' | 'encoding' | 'scaling' | 'train_test_split'
  config?: Record<string, unknown>
  columns?: string[]
}

export interface Pipeline {
  id: string
  dataset_id: string
  name: string
  status: string
  test_split_ratio: number
  random_seed: number
  steps: PipelineStep[]
  error_message?: string
  created_at: string
  updated_at: string
}

export const pipelinesApi = {
  async create(body: { dataset_id: string; name?: string; steps: PipelineStep[]; test_split_ratio?: number; random_seed?: number }): Promise<Pipeline> {
    const { data } = await apiClient.post('/pipelines/', body)
    return data
  },

  async list(page = 1, perPage = 20): Promise<PaginatedResponse<Pipeline>> {
    const { data } = await apiClient.get('/pipelines/', { params: { page, per_page: perPage } })
    return data
  },

  async getById(id: string): Promise<Pipeline> {
    const { data } = await apiClient.get(`/pipelines/${id}`)
    return data
  },

  async update(id: string, body: Partial<Pipeline>): Promise<Pipeline> {
    const { data } = await apiClient.put(`/pipelines/${id}`, body)
    return data
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/pipelines/${id}`)
  },

  async execute(id: string): Promise<Pipeline> {
    const { data } = await apiClient.post(`/pipelines/${id}/execute`)
    return data
  },
}
