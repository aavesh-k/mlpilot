import { apiClient } from './client'

export interface ColumnStat {
  name: string
  ordinal_position: number
  dtype: string
  is_numeric: boolean
  is_categorical: boolean
  missing_count: number
  missing_ratio: number
  unique_count: number
  mean?: number
  std?: number
  min?: number
  max?: number
  p25?: number
  p50?: number
  p75?: number
  skewness?: number
  kurtosis?: number
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
  column_stats: ColumnStat[]
  correlation_matrix: Record<string, Record<string, number>>
  findings: Finding[]
}

export const edaApi = {
  async getReport(datasetId: string): Promise<EDAReport> {
    const { data } = await apiClient.get(`/datasets/${datasetId}/eda`)
    return data
  },

  async getColumns(datasetId: string): Promise<ColumnStat[]> {
    const { data } = await apiClient.get(`/datasets/${datasetId}/columns`)
    return data
  },
}
