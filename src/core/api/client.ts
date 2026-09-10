import axios from 'axios'
import { CONFIG } from '../config'

// Local-first, single-user app: no auth and no per-browser session scoping.
// Requests omit a session header, so the backend treats them as the single
// local user ("default_user") and returns all locally stored data.
export const apiClient = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 120_000,
})

// Opt-in: bypass Content-Type for FormData uploads (browser sets multipart boundary).
apiClient.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    // Let the browser set Content-Type with boundary
    delete config.headers['Content-Type']
  }
  return config
})
