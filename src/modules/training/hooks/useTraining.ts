import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trainingApi } from '../../../core/api/training.api'

export function useModels(page = 1) {
  return useQuery({
    queryKey: ['models', page],
    queryFn: () => trainingApi.listModels(page),
  })
}

export function useModel(id: string | undefined) {
  return useQuery({
    queryKey: ['model', id],
    queryFn: () => trainingApi.getModel(id!),
    enabled: !!id,
  })
}

export function useCompareModels(ids: string[]) {
  return useQuery({
    queryKey: ['models', 'compare', ids],
    queryFn: () => trainingApi.compare(ids),
    enabled: ids.length > 0,
  })
}

export function useTrainModel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: Parameters<typeof trainingApi.train>[0]) => trainingApi.train(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}

export function useJobs(page = 1) {
  return useQuery({
    queryKey: ['jobs', page],
    queryFn: () => trainingApi.listJobs(page),
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data) return 3000
      const hasActive = data.items.some((j) => j.status === 'queued' || j.status === 'running')
      return hasActive ? 2000 : false
    },
  })
}

export function useCancelJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => trainingApi.cancelJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.invalidateQueries({ queryKey: ['models'] })
    },
  })
}

export function useSetBestModel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => trainingApi.setBest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] })
    },
  })
}

export function useModelPlots(modelId: string | undefined) {
  return useQuery({
    queryKey: ['model-plots', modelId],
    queryFn: () => trainingApi.getPlots(modelId!),
    enabled: !!modelId,
  })
}
