import apiClient from "./client"
import type {
  Contract,
  DocumentTemplate,
  ListParams,
  OrderDetail,
  OrderFile,
  OrderHistoryRecord,
  OrderListItem,
  PaginatedResponse,
  ShipmentBatch,
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

  uploadFiles: async (id: number, files: File[], category = "general", description = "") => {
    const formData = new FormData()
    files.forEach((f) => formData.append("files", f))
    formData.append("category", category)
    formData.append("description", description)
    const { data } = await apiClient.post<OrderFile[]>(`/orders/${id}/upload-files/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return data
  },

  getFiles: async (id: number, category?: string) => {
    const params: Record<string, string> = {}
    if (category) params.category = category
    const { data } = await apiClient.get<OrderFile[]>(`/orders/${id}/files/`, { params })
    return data
  },

  updateFile: async (orderId: number, fileId: number, payload: { category?: string; description?: string }) => {
    const { data } = await apiClient.patch<OrderFile>(`/orders/${orderId}/files/${fileId}/`, payload)
    return data
  },

  deleteFile: async (id: number, fileId: number) => {
    await apiClient.delete(`/orders/${id}/files/${fileId}/delete/`)
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
    const { data } = await apiClient.get<
      { to_status: string; label: string; color: string; blocked: boolean; blocked_reason: string }[]
    >(`/orders/${orderNumber}/transitions/`)
    return data
  },

  transition: async (orderNumber: number, toStatus: string) => {
    const { data } = await apiClient.post<OrderDetail>(
      `/orders/${orderNumber}/transition/`,
      { status: toStatus }
    )
    return data
  },

  // Shipment batches
  getShipments: async (orderNumber: number) => {
    const { data } = await apiClient.get<ShipmentBatch[]>(`/orders/${orderNumber}/shipments/`)
    return data
  },

  createShipment: async (orderNumber: number, payload: { ship_date: string; description?: string }) => {
    const { data } = await apiClient.post<ShipmentBatch>(`/orders/${orderNumber}/shipments/`, payload)
    return data
  },

  updateShipment: async (orderNumber: number, batchId: number, payload: Partial<ShipmentBatch>) => {
    const { data } = await apiClient.patch<ShipmentBatch>(`/orders/${orderNumber}/shipments/${batchId}/`, payload)
    return data
  },

  deleteShipment: async (orderNumber: number, batchId: number) => {
    await apiClient.delete(`/orders/${orderNumber}/shipments/${batchId}/`)
  },

  // Document templates
  listTemplates: async (params?: Record<string, string>) => {
    const { data } = await apiClient.get<PaginatedResponse<DocumentTemplate>>(
      "/orders/document-templates/", { params },
    )
    return data.results
  },

  generateDocument: async (orderNumber: number, templateId: number, extraData?: Record<string, string>) => {
    const { data, headers } = await apiClient.post(
      `/orders/${orderNumber}/generate-document/`,
      { template_id: templateId, extra_data: extraData },
      { responseType: "blob" },
    )
    const filename = headers["content-disposition"]?.match(/filename="?(.+?)"?$/)?.[1] ?? `document_${orderNumber}.docx`
    const url = URL.createObjectURL(data)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  },
}
