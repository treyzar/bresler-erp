import apiClient from "./client"
import type { ImportSession } from "./types"

export const importApi = {
  upload: async (file: File, targetModel: string) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("target_model", targetModel)
    const { data } = await apiClient.post<ImportSession>("/import/upload/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return data
  },

  get: async (id: number) => {
    const { data } = await apiClient.get<ImportSession>(`/import/${id}/`)
    return data
  },

  fields: async (id: number) => {
    const { data } = await apiClient.get<{ fields: { name: string; label: string }[] }>(
      `/import/${id}/fields/`
    )
    return data.fields
  },

  updateMapping: async (id: number, columnMapping: Record<string, string>) => {
    const { data } = await apiClient.patch<ImportSession>(
      `/import/${id}/mapping/`,
      { column_mapping: columnMapping }
    )
    return data
  },

  validate: async (id: number) => {
    const { data } = await apiClient.post<{
      total_rows: number
      valid_count: number
      error_count: number
      errors: { row: number; field: string; message: string }[]
      preview: Record<string, string>[]
    }>(`/import/${id}/validate/`)
    return data
  },

  apply: async (id: number) => {
    const { data } = await apiClient.post<{
      success_count: number
      error_count: number
      errors: { row: number; field: string; message: string }[]
      session?: ImportSession
      status?: string
    }>(`/import/${id}/apply/`)
    return data
  },

  list: async () => {
    const { data } = await apiClient.get<{ results: ImportSession[] }>("/import/")
    return data.results
  },
}
