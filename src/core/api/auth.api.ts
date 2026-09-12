import { apiClient } from './client'

export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface User {
  id: string
  email: string
  created_at: string
}

export const authApi = {
  async register(email: string, password: string): Promise<AuthTokens> {
    const { data } = await apiClient.post('/auth/register', { email, password })
    return data
  },
  async login(email: string, password: string): Promise<AuthTokens> {
    const params = new URLSearchParams()
    params.append('username', email)
    params.append('password', password)
    const { data } = await apiClient.post('/auth/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    return data
  },
  async me(): Promise<User> {
    const { data } = await apiClient.get('/auth/me')
    return data
  },
  async refresh(refresh_token: string): Promise<AuthTokens> {
    const { data } = await apiClient.post('/auth/refresh', null, { params: { refresh_token } })
    return data
  },
}
