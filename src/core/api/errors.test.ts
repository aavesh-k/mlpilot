import { describe, it, expect } from 'vitest'
import { AxiosError } from 'axios'
import { ApiError, toApiError } from './errors'

function makeAxiosError(status: number, body: unknown): AxiosError {
  return new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    undefined,
    undefined,
    {
      data: body,
      status,
      statusText: 'error',
      headers: {},
      config: { headers: {} } as never,
    } as never,
  )
}

describe('toApiError', () => {
  it('parses a structured backend error response', () => {
    const err = makeAxiosError(422, { error: { code: 'VALIDATION_ERROR', message: 'Bad input', field: 'target' } })
    const result = toApiError(err)
    expect(result).toBeInstanceOf(ApiError)
    expect(result.code).toBe('VALIDATION_ERROR')
    expect(result.message).toBe('Bad input')
    expect(result.field).toBe('target')
    expect(result.status).toBe(422)
  })

  it('falls back to a generic message when no structured body', () => {
    const err = makeAxiosError(500, { detail: 'boom' })
    const result = toApiError(err)
    expect(result.code).toBe('UNKNOWN_ERROR')
    expect(result.status).toBe(500)
  })

  it('wraps a plain Error', () => {
    const result = toApiError(new Error('plain'))
    expect(result).toBeInstanceOf(ApiError)
    expect(result.message).toBe('plain')
    expect(result.code).toBe('UNKNOWN_ERROR')
  })

  it('wraps unknown values', () => {
    const result = toApiError('weird')
    expect(result).toBeInstanceOf(ApiError)
    expect(result.message).toBe('An unexpected error occurred')
  })

  it('returns an existing ApiError unchanged', () => {
    const original = new ApiError('CONFLICT', 'nope', 'id', 409)
    expect(toApiError(original)).toBe(original)
  })
})
