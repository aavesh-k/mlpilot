export const CONFIG = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  APP_NAME: 'MLPilot',
  POLL_INTERVAL_MS: 2000,
  STALE_TIME_MS: 30_000,
} as const
