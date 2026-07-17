import axios from 'axios'
import { CONFIG } from '../config'

export const apiClient = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  let sessionId = localStorage.getItem('mlpilot_session_id')
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36)
    localStorage.setItem('mlpilot_session_id', sessionId)
  }
  config.headers['X-Session-ID'] = sessionId
  return config
})
