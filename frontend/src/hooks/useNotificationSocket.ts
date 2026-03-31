import { useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "@/stores/useAuthStore"

interface NotificationEvent {
  type: "notification"
  data: {
    id: number
    title: string
    message: string
    category: string
    link: string
    is_read: boolean
    created_at: string
  }
}

/**
 * WebSocket hook for real-time notification updates.
 * Connects to ws/notifications/ and invalidates React Query cache on new notifications.
 */
export function useNotificationSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const token = useAuthStore((s) => s.accessToken)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const qc = useQueryClient()

  useEffect(() => {
    if (!isAuthenticated || !token) return

    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) {
      return
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const host = window.location.host
    const url = `${protocol}//${host}/ws/notifications/?token=${encodeURIComponent(token)}`

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const data: NotificationEvent = JSON.parse(event.data)
        if (data.type === "notification") {
          // Invalidate queries to refresh notification list and count
          qc.invalidateQueries({ queryKey: ["notifications"] })
        }
      } catch {
        // ignore malformed messages
      }
    }

    ws.onerror = () => {
      // silently ignore — WebSocket may not be available
    }

    ws.onclose = () => {
      wsRef.current = null
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [isAuthenticated, token, qc])
}
