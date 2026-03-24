import { useEffect, useRef, useState, useCallback } from "react"
import { useAuthStore } from "@/stores/useAuthStore"

interface PresenceEvent {
  type: "user_joined" | "user_left"
  username: string
}

export function useOrderPresence(orderNumber: string | undefined) {
  const [activeUsers, setActiveUsers] = useState<Set<string>>(new Set())
  const wsRef = useRef<WebSocket | null>(null)
  const token = useAuthStore((s) => s.accessToken)

  const connect = useCallback(() => {
    if (!orderNumber || !token) return

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const host = window.location.host
    const url = `${protocol}//${host}/ws/orders/${orderNumber}/presence/?token=${encodeURIComponent(token)}`

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const data: PresenceEvent = JSON.parse(event.data)
        setActiveUsers((prev) => {
          const next = new Set(prev)
          if (data.type === "user_joined") {
            next.add(data.username)
          } else if (data.type === "user_left") {
            next.delete(data.username)
          }
          return next
        })
      } catch {
        // ignore malformed messages
      }
    }

    ws.onerror = () => {
      // WebSocket not available (e.g. no Channels backend in dev) — silently ignore
      ws.close()
    }

    ws.onclose = () => {
      wsRef.current = null
    }

    return ws
  }, [orderNumber, token])

  useEffect(() => {
    const ws = connect()

    return () => {
      if (ws && ws.readyState <= WebSocket.OPEN) {
        ws.close()
      }
      setActiveUsers(new Set())
    }
  }, [connect])

  return activeUsers
}
