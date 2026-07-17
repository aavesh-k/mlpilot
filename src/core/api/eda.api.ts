import { apiClient } from './client'

export interface ColumnInfo {
  name: string
  dtype: string
  ordinal_position: number
}

export interface ShapeInfo {
  rows: number
  columns: number
}

export interface MemoryUsage {
  total_bytes: number
  formatted: string
}

export interface MissingRow {
  column: string
  count: number
  percent: number
}

export interface MissingnessMatrix {
  columns: string[]
  rows: number
  data: Record<string, number[]>
}

export interface NumericSummaryRow {
  column: string
  count: number
  mean: number | null
  median: number | null
  std: number | null
  min: number | null
  max: number | null
  q1: number | null
  q3: number | null
  iqr: number | null
  skewness: number | null
  kurtosis: number | null
}

export interface OutlierRow {
  column: string
  count: number
  percent: number
  lower_bound: number | null
  upper_bound: number | null
  stats: {
    min: number | null
    q1: number | null
    median: number | null
    q3: number | null
    max: number | null
  }
}

export interface CategoricalSummaryRow {
  column: string
  cardinality: number
  high_cardinality: boolean
  top_values: [string, number][]
}

export interface HighCorrelation {
  col_a: string
  col_b: string
  value: number
}

export interface DistributionPlot {
  column: string
  histogram: { bins: number[]; counts: number[] }
  kde: { x: number[]; y: number[] }
}

export interface Duplicates {
  count: number
  percent: number
}

export interface DataTypeIssue {
  column: string
  issue: string
  sample_values: string[]
}

export interface ConstantColumn {
  column: string
  unique_value: unknown
  percent_same: number
}

export interface Finding {
  severity: 'info' | 'warning' | 'critical'
  title: string
  description: string
  affected_columns: string[]
}

export interface EDAReport {
  dataset_id: string
  computed_at: string
  shape: ShapeInfo
  memory_usage: MemoryUsage
  columns: ColumnInfo[]
  head: Record<string, unknown>[]
  tail: Record<string, unknown>[]
  missingness: MissingRow[]
  missingness_matrix: MissingnessMatrix
  numeric_summary: NumericSummaryRow[]
  outliers: OutlierRow[]
  categorical_summary: CategoricalSummaryRow[]
  correlation_matrix: Record<string, Record<string, number>>
  high_correlations: HighCorrelation[]
  distribution_plots: DistributionPlot[]
  duplicates: Duplicates
  data_type_issues: DataTypeIssue[]
  constant_columns: ConstantColumn[]
  findings: Finding[]
}

export interface EDAStatusResponse {
  status: 'not_started' | 'processing' | 'completed' | 'failed' | 'already_running' | 'started'
  progress: number
  step?: string
  error?: string
  message?: string
  report?: EDAReport
}

export const edaApi = {
  async startEDA(datasetId: string): Promise<EDAStatusResponse> {
    const { data } = await apiClient.post(`/datasets/${datasetId}/eda`)
    return data
  },

  async getEDAStatus(datasetId: string): Promise<EDAStatusResponse> {
    const { data } = await apiClient.get(`/datasets/${datasetId}/eda`)
    return data
  },
}
