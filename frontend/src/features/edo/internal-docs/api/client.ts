import api from "@/api/client"
import type {
  CreateDocumentPayload,
  DocumentAttachment,
  DocumentDetail,
  DocumentListItem,
  DocumentType,
  ListParams,
} from "./types"

const BASE = "/edo/internal"

interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export const internalDocsApi = {
  listTypes: async (): Promise<DocumentType[]> => {
    const r = await api.get<Paginated<DocumentType> | DocumentType[]>(`${BASE}/types/`)
    return Array.isArray(r.data) ? r.data : r.data.results
  },

  getType: async (code: string): Promise<DocumentType> => {
    const r = await api.get<DocumentType>(`${BASE}/types/${code}/`)
    return r.data
  },

  listDocuments: async (params: ListParams = {}): Promise<Paginated<DocumentListItem>> => {
    const r = await api.get<Paginated<DocumentListItem>>(`${BASE}/documents/`, { params })
    return r.data
  },

  getDocument: async (id: number): Promise<DocumentDetail> => {
    const r = await api.get<DocumentDetail>(`${BASE}/documents/${id}/`)
    return r.data
  },

  createDocument: async (payload: CreateDocumentPayload): Promise<DocumentDetail> => {
    const r = await api.post<DocumentDetail>(`${BASE}/documents/`, payload)
    return r.data
  },

  updateDocument: async (id: number, payload: Partial<CreateDocumentPayload>): Promise<DocumentDetail> => {
    const r = await api.patch<DocumentDetail>(`${BASE}/documents/${id}/`, payload)
    return r.data
  },

  deleteDocument: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/documents/${id}/`)
  },

  submitDocument: async (id: number): Promise<DocumentDetail> => {
    const r = await api.post<DocumentDetail>(`${BASE}/documents/${id}/submit/`)
    return r.data
  },

  approveDocument: async (
    id: number,
    payload: { comment?: string; signature_image?: string } = {},
  ): Promise<DocumentDetail> => {
    const r = await api.post<DocumentDetail>(`${BASE}/documents/${id}/approve/`, payload)
    return r.data
  },

  rejectDocument: async (id: number, comment: string): Promise<DocumentDetail> => {
    const r = await api.post<DocumentDetail>(`${BASE}/documents/${id}/reject/`, { comment })
    return r.data
  },

  requestRevision: async (id: number, comment: string): Promise<DocumentDetail> => {
    const r = await api.post<DocumentDetail>(`${BASE}/documents/${id}/request-revision/`, { comment })
    return r.data
  },

  delegateDocument: async (id: number, toUserId: number): Promise<DocumentDetail> => {
    const r = await api.post<DocumentDetail>(`${BASE}/documents/${id}/delegate/`, { to_user: toUserId })
    return r.data
  },

  downloadPdf: async (id: number): Promise<Blob> => {
    const r = await api.get<Blob>(`${BASE}/documents/${id}/pdf/`, {
      responseType: "blob",
    })
    return r.data
  },

  inboxCount: async (): Promise<{ count: number }> => {
    const r = await api.get<{ count: number }>(`${BASE}/documents/inbox-count/`)
    return r.data
  },

  uploadAttachment: async (id: number, file: File): Promise<DocumentAttachment> => {
    const form = new FormData()
    form.append("file", file)
    const r = await api.post<DocumentAttachment>(`${BASE}/documents/${id}/upload-attachment/`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return r.data
  },
}
