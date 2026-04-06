import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ordersApi } from "../ordersApi"
import type { Contract, ListParams } from "../types"

const KEY = "orders"

export function useOrderList(params?: ListParams) {
  return useQuery({
    queryKey: [KEY, "list", params],
    queryFn: () => ordersApi.list(params),
  })
}

export function useOrder(id: number | null) {
  return useQuery({
    queryKey: [KEY, "detail", id],
    queryFn: () => ordersApi.get(id!),
    enabled: id !== null,
  })
}

export function useCreateOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => ordersApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useUpdateOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      ordersApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useDeleteOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => ordersApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useNextOrderNumber() {
  return useQuery({
    queryKey: [KEY, "next-number"],
    queryFn: () => ordersApi.nextNumber(),
    staleTime: 0,
  })
}

export function useOrderHistory(id: number | null) {
  return useQuery({
    queryKey: [KEY, "history", id],
    queryFn: () => ordersApi.history(id!),
    enabled: id !== null,
  })
}

export function useUploadOrderFiles() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, files, category, description }: { id: number; files: File[]; category?: string; description?: string }) =>
      ordersApi.uploadFiles(id, files, category, description),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useUpdateOrderFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, fileId, data }: { orderId: number; fileId: number; data: { category?: string; description?: string } }) =>
      ordersApi.updateFile(orderId, fileId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useDeleteOrderFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, fileId }: { orderId: number; fileId: number }) =>
      ordersApi.deleteFile(orderId, fileId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useUpdateContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, data }: { orderId: number; data: Partial<Contract> }) =>
      ordersApi.updateContract(orderId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useMissingOrderNumbers(enabled: boolean) {
  return useQuery({
    queryKey: [KEY, "missing-numbers"],
    queryFn: () => ordersApi.missingNumbers(),
    enabled,
  })
}

export function useOrderFuzzySearch(query: string) {
  return useQuery({
    queryKey: [KEY, "fuzzy", query],
    queryFn: () => ordersApi.fuzzySearch(query),
    enabled: !!query && query.length >= 3,
  })
}

export function useOrderTransitions(orderNumber: number | null) {
  return useQuery({
    queryKey: [KEY, "transitions", orderNumber],
    queryFn: () => ordersApi.transitions(orderNumber!),
    enabled: orderNumber !== null,
  })
}

export function useOrderTransition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderNumber, toStatus }: { orderNumber: number; toStatus: string }) =>
      ordersApi.transition(orderNumber, toStatus),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
