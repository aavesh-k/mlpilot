import type { AxiosError } from 'axios'

export interface ApiErrorShape {
  code: string
  message: string
  field?: string | null
}

/**
 * Typed error surfaced from the API layer. Carries the structured error
 * returned by the backend ({ error: { code, message, field } }) so the UI can
 * display the real reason instead of a generic axios message.
 */
export class ApiError extends Error {
  code: string
  field: string | null
  status: number | null
  raw: unknown

  constructor(
    code: string,
    message: string,
    field: string | null = null,
    status: number | null = null,
    raw?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.field = field
    this.status = status
    this.raw = raw
  }
}

/**
 * Normalize any thrown value from an API call into an {@link ApiError}.
 * - Already-typed ApiError: returned as-is.
 * - Axios error with a structured backend body: parsed into ApiError.
 * - Plain Error / unknown: wrapped with the original message.
 */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err

  const axiosErr = err as AxiosError<{ error?: ApiErrorShape }>
  const status = axiosErr?.response?.status ?? null
  const data = axiosErr?.response?.data

  if (data?.error) {
    return new ApiError(
      data.error.code ?? 'API_ERROR',
      data.error.message ?? 'Request failed',
      data.error.field ?? null,
      status,
      err,
    )
  }

  if (err instanceof Error) {
    return new ApiError('UNKNOWN_ERROR', err.message, null, status, err)
  }

  return new ApiError('UNKNOWN_ERROR', 'An unexpected error occurred', null, status, err)
}
