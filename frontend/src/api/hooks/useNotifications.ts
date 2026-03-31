import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { notificationsApi } from "../notificationsApi"

const KEY = "notifications"

export function useNotificationList(page = 1) {
  return useQuery({
    queryKey: [KEY, "list", page],
    queryFn: () => notificationsApi.list(page),
  })
}

export function useUnreadCount() {
  return useQuery({
    queryKey: [KEY, "unread-count"],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 30_000, // Poll every 30s as fallback to WebSocket
  })
}

export function useMarkRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
    },
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
    },
  })
}
