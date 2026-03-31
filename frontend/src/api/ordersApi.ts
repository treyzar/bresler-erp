import apiClient from "./client"
import type {
  Contract,
  ListParams,
  OrderDetail,
  OrderFile,
  OrderHistoryRecord,
  OrderListItem,
  PaginatedResponse,
} from "./types"

export interface FuzzySuggestion {
  text: string
  order_number: number
  similarity: number
}

export const ordersApi = {
  list: async (params?: ListParams) => {
    const { data } = await apiClient.get<PaginatedResponse<OrderListItem>>("/orders/", { params })
    return data
  },

  get: async (id: number) => {
    const { data } = await apiClient.get<OrderDetail>(`/orders/${id}/`)
    return data
  },

  create: async (payload: Record<string, unknown>) => {
    const { data } = await apiClient.post<OrderDetail>("/orders/", payload)
    return data
  },

  update: async (id: number, payload: Record<string, unknown>) => {
    const { data } = await apiClient.patch<OrderDetail>(`/orders/${id}/`, payload)
    return data
  },

  delete: async (id: number) => {
    await apiClient.delete(`/orders/${id}/`)
  },

  nextNumber: async () => {
    const { data } = await apiClient.get<{ next_number: number }>("/orders/next-number/")
    return data.next_number
  },

  history: async (id: number) => {
    const { data } = await apiClient.get<OrderHistoryRecord[]>(`/orders/${id}/history/`)
    return data
  },

  uploadFiles: async (id: number, files: File[]) => {
    const formData = new FormData()
    files.forEach((f) => formData.append("files", f))
    const { data } = await apiClient.post<OrderFile[]>(`/orders/${id}/upload-files/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return data
  },

  getFiles: async (id: number) => {
    const { data } = await apiClient.get<OrderFile[]>(`/orders/${id}/files/`)
    return data
  },

  deleteFile: async (id: number, fileId: number) => {
    await apiClient.delete(`/orders/${id}/files/${fileId}/`)
  },

  getContract: async (id: number) => {
    const { data } = await apiClient.get<Contract>(`/orders/${id}/contract/`)
    return data
  },

  updateContract: async (id: number, payload: Partial<Contract>) => {
    const { data } = await apiClient.patch<Contract>(`/orders/${id}/contract/`, payload)
    return data
  },

  missingNumbers: async () => {
    const { data } = await apiClient.get<{ missing_formatted: string[]; total: number }>(
      "/orders/missing-numbers/"
    )
    return data
  },

  fuzzySearch: async (q: string): Promise<FuzzySuggestion[]> => {
    const { data } = await apiClient.get<FuzzySuggestion[]>(
      "/orders/fuzzy-search/",
      { params: { q } }
    )
    return data
  },

  transitions: async (orderNumber: number) => {
    const { data } = await apiClient.get<{ to_status: string; label: string; color: string }[]>(
      `/orders/${orderNumber}/transitions/`
    )
    return data
  },

  transition: async (orderNumber: number, toStatus: string) => {
    const { data } = await apiClient.post<OrderDetail>(
      `/orders/${orderNumber}/transition/`,
      { status: toStatus }
    )
    return data
  },
}
