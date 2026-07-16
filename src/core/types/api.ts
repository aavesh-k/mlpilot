export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
}

export interface ApiErrorResponse {
  error: {
    code: string
    message: string
    field?: string | null
  }
}
