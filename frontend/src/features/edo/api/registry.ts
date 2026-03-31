import api from "@/api/client"

export type LetterDirection = "outgoing" | "incoming"

export interface LetterFile {
  id: number
  file: string
  file_name: string
  file_type: string
  file_size: number
  uploaded_at: string
  uploaded_by: number | null
}

export interface LetterListItem {
  id: number
  number: string
  date: string
  direction: LetterDirection
  direction_display: string
  recipient: string
  sender: string
  subject: string
  executor_name: string
  created_by_name: string
  files_count: number
  is_hidden: boolean
  created_at: string
}

export interface LetterDetail {
  id: number
  number: string
  date: string
  direction: LetterDirection
  direction_display: string
  recipient: string
  sender: string
  subject: string
  executor: { id: number; full_name: string; username: string }
  created_by: { id: number; full_name: string; username: string }
  note: string
  files: LetterFile[]
  created_at: string
  updated_at: string
}

export interface LetterHistoryRecord {
  id: number
  date: string
  user: string | null
  type: string
  changes: { field: string; old: string; new: string }[]
}

export interface LetterCreatePayload {
  date: string
  direction: LetterDirection
  recipient?: string
  sender?: string
  subject: string
  executor: number
  note?: string
}

export interface LetterListParams {
  page?: number
  page_size?: number
  ordering?: string
  search?: string
  direction?: LetterDirection
  executor?: number
  date_from?: string
  date_to?: string
}

export const LETTER_ORDERING_OPTIONS = [
  { value: "-seq", label: "По номеру (новые сверху)" },
  { value: "seq", label: "По номеру (старые сверху)" },
  { value: "-date", label: "По дате (новые сверху)" },
  { value: "date", label: "По дате (старые сверху)" },
  { value: "-created_at", label: "По созданию (новые сверху)" },
  { value: "created_at", label: "По созданию (старые сверху)" },
]

export const registryApi = {
  list: async (params?: LetterListParams) => {
    const res = await api.get<{ count: number; results: LetterListItem[] }>("/edo/registry/letters/", { params })
    return res.data
  },

  get: async (id: number): Promise<LetterDetail> => {
    const res = await api.get<LetterDetail>(`/edo/registry/letters/${id}/`)
    return res.data
  },

  create: async (data: LetterCreatePayload): Promise<LetterDetail> => {
    const res = await api.post<LetterDetail>("/edo/registry/letters/", data)
    return res.data
  },

  update: async (id: number, data: Partial<LetterCreatePayload>): Promise<LetterDetail> => {
    const res = await api.patch<LetterDetail>(`/edo/registry/letters/${id}/`, data)
    return res.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/edo/registry/letters/${id}/`)
  },

  uploadFiles: async (id: number, files: File[]): Promise<LetterFile[]> => {
    const form = new FormData()
    files.forEach((f) => form.append("files", f))
    const res = await api.post<LetterFile[]>(`/edo/registry/letters/${id}/files/`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return res.data
  },

  deleteFile: async (letterId: number, fileId: number): Promise<void> => {
    await api.delete(`/edo/registry/letters/${letterId}/files/${fileId}/`)
  },

  history: async (id: number): Promise<LetterHistoryRecord[]> => {
    const res = await api.get<LetterHistoryRecord[]>(`/edo/registry/letters/${id}/history/`)
    return res.data
  },

  generateDocument: async (id: number, templateId: number): Promise<void> => {
    await api.post(`/edo/registry/letters/${id}/generate/`, { template_id: templateId })
  },
}
