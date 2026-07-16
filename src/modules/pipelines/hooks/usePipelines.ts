import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pipelinesApi, type PipelineStep } from '../../../core/api/pipelines.api'

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
    mutationFn: (body: { dataset_id: string; name?: string; steps: PipelineStep[] }) =>
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
