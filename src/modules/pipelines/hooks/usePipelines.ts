import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pipelinesApi } from '../../../core/api/pipelines.api'

export function usePipelineSuggestions(datasetId: string | undefined) {
  return useQuery({
    queryKey: ['pipeline-suggestions', datasetId],
    queryFn: () => pipelinesApi.suggest(datasetId!),
    enabled: !!datasetId,
  })
}

export function useTargetDetection(datasetId: string | undefined, targetColumn: string | undefined) {
  return useQuery({
    queryKey: ['target-detection', datasetId, targetColumn],
    queryFn: () => pipelinesApi.detectTarget(datasetId!, targetColumn!),
    enabled: !!datasetId && !!targetColumn,
  })
}

export function usePipelines(page = 1) {
  return useQuery({
    queryKey: ['pipelines', page],
    queryFn: () => pipelinesApi.list(page),
  })
}

export function usePipeline(id: string | undefined) {
  return useQuery({
    queryKey: ['pipeline', id],
    queryFn: () => pipelinesApi.getById(id!),
    enabled: !!id,
  })
}

export function useCreatePipeline() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: Parameters<typeof pipelinesApi.create>[0]) =>
      pipelinesApi.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
    },
  })
}

export function useExecutePipeline() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => pipelinesApi.execute(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
    },
  })
}

export function useUpdatePipeline() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof pipelinesApi.update>[1] }) =>
      pipelinesApi.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
    },
  })
}
