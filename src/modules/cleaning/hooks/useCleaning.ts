import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cleaningApi, type RunCleaningRequest } from '../../../core/api/cleaning.api'

export function useCleaningSuggestions(datasetId: string | undefined) {
  return useQuery({
    queryKey: ['cleaning', 'suggestions', datasetId],
    queryFn: () => cleaningApi.getSuggestions(datasetId!),
    enabled: !!datasetId,
    staleTime: 60_000,
  })
}

export function useCleaningRuns(datasetId: string | undefined) {
  return useQuery({
    queryKey: ['cleaning', 'runs', datasetId],
    queryFn: () => cleaningApi.listRuns(datasetId!),
    enabled: !!datasetId,
  })
}

export function useCleaningReport(datasetId: string | undefined, runId: string | undefined) {
  return useQuery({
    queryKey: ['cleaning', 'report', datasetId, runId],
    queryFn: () => cleaningApi.getReport(datasetId!, runId!),
    enabled: !!datasetId && !!runId,
  })
}

export function useExecuteCleaning() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ datasetId, config }: { datasetId: string; config: RunCleaningRequest }) =>
      cleaningApi.execute(datasetId, config),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cleaning', 'runs', data.report.dataset_id] })
      queryClient.invalidateQueries({ queryKey: ['datasets'] })
    },
  })
}
