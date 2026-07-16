import { apiClient } from './client'
import type { AccessTokenResponse, LoginRequest, RegisterRequest, TokenResponse, User } from '../types/auth'

export const authApi = {
  async register(body: RegisterRequest): Promise<User> {
    const { data } = await apiClient.post('/auth/register', body)
    return data
  },

  async login(body: LoginRequest): Promise<TokenResponse> {
    const { data } = await apiClient.post('/auth/login', body)
    return data
  },

  async refresh(refreshToken: string): Promise<AccessTokenResponse> {
    const { data } = await apiClient.post('/auth/refresh', { refresh_token: refreshToken })
    return data
  },

  async getMe(): Promise<User> {
    const { data } = await apiClient.get('/auth/me')
    return data
  },
}
