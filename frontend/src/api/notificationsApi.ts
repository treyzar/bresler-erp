import apiClient from "./client"
import type { Notification, PaginatedResponse } from "./types"

export const notificationsApi = {
  list: async (page = 1) => {
    const { data } = await apiClient.get<PaginatedResponse<Notification>>(
      "/notifications/",
      { params: { page } }
    )
    return data
  },

  unreadCount: async () => {
    const { data } = await apiClient.get<{ count: number }>(
      "/notifications/unread-count/"
    )
    return data.count
  },

  markRead: async (id: number) => {
    const { data } = await apiClient.post(`/notifications/${id}/mark-read/`)
    return data
  },

  markAllRead: async () => {
    const { data } = await apiClient.post("/notifications/mark-all-read/")
    return data
  },
}
