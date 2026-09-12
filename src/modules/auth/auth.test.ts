import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from './store/authStore'
import { apiClient } from '../../core/api/client'
import { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios'

vi.mock('axios', async () => {
  const actual = await vi.importActual<typeof import('axios')>('axios')
  return {
    ...actual,
    default: {
      ...actual.default,
      create: actual.default.create,
      post: vi.fn(),
    },
  }
})

describe('Auth & API Client', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    useAuthStore.getState().logout()
  })

  it('updates auth state and retains isAuthenticated when logging in', () => {
    const tokens = { access_token: 'test_access_token', refresh_token: 'test_refresh_token' }
    const user = { id: 'u1', email: 'test@example.com', created_at: '2026-01-01' }

    useAuthStore.getState().setAuth(tokens, user, true)

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.accessToken).toBe('test_access_token')
    expect(state.refreshToken).toBe('test_refresh_token')
    expect(state.user?.email).toBe('test@example.com')
  })

  it('logout cleans state and storage', () => {
    const tokens = { access_token: 'test_access_token', refresh_token: 'test_refresh_token' }
    useAuthStore.getState().setAuth(tokens, null, true)
    expect(useAuthStore.getState().isAuthenticated).toBe(true)

    useAuthStore.getState().logout()

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    const raw = localStorage.getItem('mlpilot_auth') || sessionStorage.getItem('mlpilot_auth')
    if (raw) {
      const parsed = JSON.parse(raw)
      expect(parsed.state.accessToken).toBeNull()
      expect(parsed.state.isAuthenticated).toBe(false)
    }
  })

  it('attaches Authorization header when accessToken is present', async () => {
    useAuthStore.getState().setAuth(
      { access_token: 'valid_jwt_token', refresh_token: 'refresh_token' },
      { id: '1', email: 'user@test.com', created_at: '' },
      true
    )

    // @ts-ignore accessing internal interceptor handlers for test verification
    const handlers = apiClient.interceptors.request.handlers
    const requestHandler = handlers?.[0]?.fulfilled

    if (requestHandler) {
      const config: InternalAxiosRequestConfig = {
        headers: new AxiosHeaders(),
        url: '/api/v1/datasets',
      }
      const updatedConfig = await requestHandler(config)
      expect(updatedConfig.headers.get('Authorization')).toBe('Bearer valid_jwt_token')
      expect(updatedConfig.headers.get('X-Session-ID')).toBeUndefined()
    }
  })

  it('attaches X-Session-ID when unauthenticated for guest workflow', async () => {
    useAuthStore.getState().logout()

    // @ts-ignore accessing internal interceptor handlers for test verification
    const handlers = apiClient.interceptors.request.handlers
    const requestHandler = handlers?.[0]?.fulfilled

    if (requestHandler) {
      const config: InternalAxiosRequestConfig = {
        headers: new AxiosHeaders(),
        url: '/api/v1/datasets',
      }
      const updatedConfig = await requestHandler(config)
      expect(updatedConfig.headers.get('Authorization')).toBeUndefined()
      const sessionId = updatedConfig.headers.get('X-Session-ID') as string | undefined
      expect(sessionId).toBeDefined()
      expect(sessionId).toMatch(/^guest_/)
    }
  })
})

