import { useQuery } from '@tanstack/react-query'
import { edaApi } from '../../../core/api/eda.api'

export function useEDA(datasetId: string | undefined) {
  return useQuery({
    queryKey: ['eda', datasetId],
    queryFn: () => edaApi.getReport(datasetId!),
    enabled: !!datasetId,
  })
}

export function useColumns(datasetId: string | undefined) {
  return useQuery({
    queryKey: ['columns', datasetId],
    queryFn: () => edaApi.getColumns(datasetId!),
    enabled: !!datasetId,
  })
}
