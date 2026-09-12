import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { datasetsApi } from '../../../core/api/datasets.api'

export function useDatasets(page = 1) {
  return useQuery({
    queryKey: ['datasets', page],
    queryFn: () => datasetsApi.list(page),
  })
}

export function useDataset(id: string | undefined) {
  return useQuery({
    queryKey: ['dataset', id],
    queryFn: () => datasetsApi.getById(id!),
    enabled: !!id,
  })
}

export function useUploadDataset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      file,
      name,
      onProgress,
    }: {
      file: File
      name?: string
      onProgress?: (pct: number) => void
    }) => datasetsApi.upload(file, name, onProgress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] })
    },
  })
}

export function useDeleteDataset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => datasetsApi.delete(id),
    onSuccess: () => {
      // Deleting a dataset cascades to pipelines/models/jobs on the backend,
      // so all workflow queries must be invalidated together. Otherwise the
      // sidebar/stepper/RouteGuard keep stale completed pipelines/models and
      // Train/Leaderboard/Reports appear unlocked until next navigation.
      queryClient.invalidateQueries({ queryKey: ['datasets'] })
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
      queryClient.invalidateQueries({ queryKey: ['models'] })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}
