import axios from 'axios'
import { CONFIG } from '../config'

export const apiClient = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})
