import { apiClient } from './client'
import type { PaginatedResponse } from '../types/api'

export interface EncodingConfig {
  strategy: 'auto' | 'one_hot' | 'target' | 'frequency'
  passthrough_columns?: string[]
  scale_columns?: string[]
}

export interface ScalingConfig {
  strategy: 'auto' | 'standard' | 'minmax' | 'robust'
}

export interface SplitConfig {
  test_size: number
  random_seed: number
  stratify: boolean
  strategy?: 'random' | 'chronological'
  datetime_column?: string | null
}

export interface FeatureSelectionConfig {
  enabled: boolean
  drop_near_zero_variance: boolean
  variance_threshold: number
  drop_high_correlation: boolean
  correlation_threshold: number
}

export interface ColumnSuggestion {
  name: string
  dtype: string
  is_numeric: boolean
  cardinality: number
  missing_pct: number
  suggested_role: string
  suggested_encoding: string | null
  suggested_scaling: string | null
}

export interface TargetDetectionResult {
  target_column: string
  problem_type: 'classification' | 'regression'
  unique_values: number
  dtype: string
  imbalance: {
    distribution: Record<string, { count: number; percent: number }>
    majority_class: string | null
    minority_class: string | null
    majority_pct: number
    minority_pct: number
    imbalance_ratio: number
    is_imbalanced: boolean
    class_count: number
  } | null
  datetime_columns?: string[]
}

export interface Pipeline {
  id: string
  dataset_id: string
  target_column: string
  problem_type: string
  name: string
  status: string
  encoding: EncodingConfig
  scaling: ScalingConfig
  split: SplitConfig
  feature_selection: FeatureSelectionConfig
  use_smote: boolean
  use_class_weight: boolean
  error_message?: string
  train_rows?: number
  test_rows?: number
  feature_count?: number
  column_notes?: Record<string, string>
  dropped_columns?: string[]
  fs_result?: {
    near_zero_variance: { column: string; reason: string }[]
    high_correlation: { column: string; reason: string }[]
  }
  imbalance?: TargetDetectionResult['imbalance']
  train_path?: string
  test_path?: string
  artifact_path?: string
  imputation?: { strategy: string; [key: string]: unknown }
  column_mapping?: Record<string, string>
  created_at: string
  updated_at: string
}

export const pipelinesApi = {
  async suggest(datasetId: string): Promise<{ columns: ColumnSuggestion[] }> {
    const { data } = await apiClient.post('/pipelines/suggest', null, { params: { dataset_id: datasetId } })
    return data
  },

  async detectTarget(datasetId: string, targetColumn: string): Promise<TargetDetectionResult> {
    const { data } = await apiClient.post('/pipelines/detect-target', null, {
      params: { dataset_id: datasetId, target_column: targetColumn },
    })
    return data
  },

  async create(body: {
    dataset_id: string
    target_column: string
    problem_type?: string
    name?: string
    encoding?: EncodingConfig
    scaling?: ScalingConfig
    split?: SplitConfig
    feature_selection?: FeatureSelectionConfig
    use_smote?: boolean
    use_class_weight?: boolean
  }): Promise<Pipeline> {
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
