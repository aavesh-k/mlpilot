import { apiClient } from './client'
import type { PaginatedResponse } from '../types/api'

export interface ColumnSuggestion {
  name: string
  dtype: string
  is_numeric: boolean
  is_categorical: boolean
  missing_count: number
  missing_pct: number
  outlier_count: number | null
  outlier_pct: number | null
  unique_count: number | null
  suggested_missing_strategy: string
  suggested_outlier_strategy: string
}

export interface ColumnMissingStrategy {
  column: string
  strategy: 'drop_row' | 'drop_column' | 'mean' | 'median' | 'mode' | 'knn' | 'ffill' | 'bfill'
}

export interface ColumnOutlierStrategy {
  column: string
  strategy: 'winsorize' | 'remove' | 'leave'
}

export interface RunCleaningRequest {
  remove_duplicates: boolean
  missing_strategies: ColumnMissingStrategy[]
  outlier_strategies: ColumnOutlierStrategy[]
  fix_dtype_issues: boolean
  standardize_categorical: boolean
  drop_constant_columns: boolean
  name?: string
}

export interface CleaningLogEntry {
  step: string
  description: string
  columns_affected: string[]
  rows_affected: number
  cells_affected: number
  details: string
}

export interface ColumnChange {
  column: string
  before_dtype: string
  after_dtype: string
  before_missing: number
  after_missing: number
  before_missing_pct: number
  after_missing_pct: number
  changes: string[]
}

export interface SnapshotStats {
  row_count: number
  column_count: number
  total_missing: number
  total_missing_pct: number
  duplicate_count: number
  duplicate_pct: number
}

export interface CleaningReport {
  dataset_id: string
  run_id: string
  created_at: string
  config: Record<string, unknown>
  steps: CleaningLogEntry[]
  before: SnapshotStats
  after: SnapshotStats
  column_changes: ColumnChange[]
}

export interface CleaningSuggestionsResponse {
  dataset_id: string
  columns: ColumnSuggestion[]
  suggested_config: Record<string, unknown>
}

export interface CleaningExecuteResponse {
  dataset: Record<string, unknown>
  report: CleaningReport
}

export const cleaningApi = {
  async getSuggestions(datasetId: string): Promise<CleaningSuggestionsResponse> {
    const { data } = await apiClient.get(`/datasets/${datasetId}/cleaning/suggestions`)
    return data
  },

  async execute(datasetId: string, body: RunCleaningRequest): Promise<CleaningExecuteResponse> {
    const { data } = await apiClient.post(`/datasets/${datasetId}/cleaning/execute`, body)
    return data
  },

  async getReport(datasetId: string, runId: string): Promise<CleaningReport> {
    const { data } = await apiClient.get(`/datasets/${datasetId}/cleaning/report/${runId}`)
    return data
  },

  async listRuns(datasetId: string): Promise<{ run_id: string; created_at: string; before: SnapshotStats; after: SnapshotStats; step_count: number }[]> {
    const { data } = await apiClient.get(`/datasets/${datasetId}/cleaning/runs`)
    return data
  },
}
