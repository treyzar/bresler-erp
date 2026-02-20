import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query"
import type { BaseEntity, ListParams, PaginatedResponse } from "../types"
import type { DirectoryApi } from "../directoryApi"

export interface DirectoryQueryHooks<T extends BaseEntity> {
  useList: (params?: ListParams, options?: Partial<UseQueryOptions<PaginatedResponse<T>>>) => ReturnType<typeof useQuery<PaginatedResponse<T>>>
  useGet: (id: number | null) => ReturnType<typeof useQuery<T>>
  useCreate: () => ReturnType<typeof useMutation<T, Error, Partial<T>>>
  useUpdate: () => ReturnType<typeof useMutation<T, Error, { id: number; data: Partial<T> }>>
  useDelete: () => ReturnType<typeof useMutation<void, Error, number>>
  useBulkDelete: () => ReturnType<typeof useMutation<{ deleted: number }, Error, number[]>>
}

export function createDirectoryQueryHooks<T extends BaseEntity>(
  key: string,
  api: DirectoryApi<T>,
): DirectoryQueryHooks<T> {
  return {
    useList(params?: ListParams, options?: Partial<UseQueryOptions<PaginatedResponse<T>>>) {
      return useQuery<PaginatedResponse<T>>({
        queryKey: [key, "list", params],
        queryFn: () => api.list(params),
        ...options,
      })
    },

    useGet(id: number | null) {
      return useQuery<T>({
        queryKey: [key, "detail", id],
        queryFn: () => api.get(id!),
        enabled: id !== null,
      })
    },

    useCreate() {
      const qc = useQueryClient()
      return useMutation<T, Error, Partial<T>>({
        mutationFn: (data) => api.create(data),
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: [key] })
        },
      })
    },

    useUpdate() {
      const qc = useQueryClient()
      return useMutation<T, Error, { id: number; data: Partial<T> }>({
        mutationFn: ({ id, data }) => api.update(id, data),
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: [key] })
        },
      })
    },

    useDelete() {
      const qc = useQueryClient()
      return useMutation<void, Error, number>({
        mutationFn: (id) => api.delete(id),
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: [key] })
        },
      })
    },

    useBulkDelete() {
      const qc = useQueryClient()
      return useMutation<{ deleted: number }, Error, number[]>({
        mutationFn: (ids) => api.bulkDelete(ids),
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: [key] })
        },
      })
    },
  }
}
