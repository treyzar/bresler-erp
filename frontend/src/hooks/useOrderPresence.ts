import { useEffect, useRef, useState } from "react"
import { useAuthStore } from "@/stores/useAuthStore"

interface PresenceJoinLeave {
  type: "user_joined" | "user_left"
  username: string
}

interface PresenceRoster {
  type: "roster"
  usernames: string[]
}

type PresenceEvent = PresenceJoinLeave | PresenceRoster

export function useOrderPresence(orderNumber: string | undefined) {
  const [activeUsers, setActiveUsers] = useState<Set<string>>(new Set())
  const wsRef = useRef<WebSocket | null>(null)
  const token = useAuthStore((s) => s.accessToken)

  useEffect(() => {
    if (!orderNumber || !token) return

    // Avoid duplicate connections
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) {
      return
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const host = window.location.host
    const url = `${protocol}//${host}/ws/orders/${orderNumber}/presence/?token=${encodeURIComponent(token)}`

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const data: PresenceEvent = JSON.parse(event.data)
        setActiveUsers((prev) => {
          if (data.type === "roster") {
            return new Set(data.usernames)
          }
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
      // silently ignore — WebSocket may not be available
    }

    ws.onclose = () => {
      wsRef.current = null
    }

    return () => {
      ws.close()
      wsRef.current = null
      setActiveUsers(new Set())
    }
  }, [orderNumber, token])

  return activeUsers
}
