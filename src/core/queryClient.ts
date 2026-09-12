import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const err = error as { code?: string; response?: unknown } | null
        const isNetwork = !!err && (err.code === 'ERR_NETWORK' || err.code === 'ECONNREFUSED' || !err.response)
        // Network errors (backend not yet up / unreachable) retry with backoff;
        // real 4xx/5xx responses from a live backend fail fast.
        if (!isNetwork) return false
        return failureCount < 5
      },
      retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 8000),
      staleTime: 30_000,
    },
  },
})

export function clearAppQueryCache() {
  try {
    queryClient.clear()
  } catch {}
}
