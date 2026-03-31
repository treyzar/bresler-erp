import apiClient from "./client"
import type { Comment } from "./types"

export const commentsApi = {
  list: async (targetModel: string, targetId: number) => {
    const { data } = await apiClient.get<{ results: Comment[] } | Comment[]>("/comments/", {
      params: { target_model: targetModel, target_id: targetId },
    })
    // Handle both paginated and non-paginated responses
    return Array.isArray(data) ? data : data.results
  },

  create: async (params: { text: string; target_model: string; target_id: number }) => {
    const { data } = await apiClient.post<Comment>("/comments/", params)
    return data
  },

  update: async (id: number, text: string) => {
    const { data } = await apiClient.patch<Comment>(`/comments/${id}/`, { text })
    return data
  },

  delete: async (id: number) => {
    await apiClient.delete(`/comments/${id}/`)
  },
}
