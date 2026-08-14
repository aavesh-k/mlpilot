import { apiClient } from './client'
import type { PaginatedResponse } from '../types/api'

export interface Dataset {
  id: string
  name: string
  original_filename: string
  file_format: string
  file_size_bytes: number
  row_count: number | null
  column_count: number | null
  status: string
  is_cleaned?: boolean
  cleaning_run_id?: string | null
  error_message: string | null
  created_at: string
  updated_at: string
  file_path?: string
}

export const datasetsApi = {
  async upload(file: File, name?: string): Promise<Dataset> {
    const formData = new FormData()
    formData.append('file', file)
    if (name) formData.append('name', name)
    const { data } = await apiClient.post('/datasets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  async list(page = 1, perPage = 20): Promise<PaginatedResponse<Dataset>> {
    const { data } = await apiClient.get('/datasets/', { params: { page, per_page: perPage } })
    return data
  },

  async getById(id: string): Promise<Dataset> {
    const { data } = await apiClient.get(`/datasets/${id}`)
    return data
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/datasets/${id}`)
  },
}
