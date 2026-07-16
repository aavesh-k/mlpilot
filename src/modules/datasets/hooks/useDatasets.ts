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
    mutationFn: ({ file, name }: { file: File; name?: string }) => datasetsApi.upload(file, name),
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
      queryClient.invalidateQueries({ queryKey: ['datasets'] })
    },
  })
}
