import { useEffect, useRef, useState } from "react"
import { useAuthStore } from "@/stores/useAuthStore"

export interface PresenceUser {
  username: string
  full_name: string
  avatar: string | null
}

interface PresenceRoster {
  type: "roster"
  users: PresenceUser[]
}

interface PresenceUserJoined {
  type: "user_joined"
  user: PresenceUser
}

interface PresenceUserLeft {
  type: "user_left"
  username: string
}

type PresenceEvent = PresenceRoster | PresenceUserJoined | PresenceUserLeft

export function useOrderPresence(orderNumber: string | undefined): PresenceUser[] {
  const [byUsername, setByUsername] = useState<Record<string, PresenceUser>>({})
  const wsRef = useRef<WebSocket | null>(null)
  const token = useAuthStore((s) => s.accessToken)

  useEffect(() => {
    if (!orderNumber || !token) return

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
        setByUsername((prev) => {
          if (data.type === "roster") {
            return Object.fromEntries(data.users.map((u) => [u.username, u]))
          }
          if (data.type === "user_joined") {
            return { ...prev, [data.user.username]: data.user }
          }
          if (data.type === "user_left") {
            const next = { ...prev }
            delete next[data.username]
            return next
          }
          return prev
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
      setByUsername({})
    }
  }, [orderNumber, token])

  return Object.values(byUsername)
}
