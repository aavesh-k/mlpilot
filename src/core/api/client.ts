import axios from 'axios'
import { CONFIG } from '../config'

// Local-first, single-user app: no auth and no per-browser session scoping.
// Requests omit a session header, so the backend treats them as the single
// local user ("default_user") and returns all locally stored data.
export const apiClient = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})
