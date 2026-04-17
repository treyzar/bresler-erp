import { useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "@/stores/useAuthStore"

interface CommentEvent {
  type: "comment"
  event: "created" | "deleted"
  comment_id: number
}

/**
 * Subscribes to ws/comments/{targetModel}/{targetId}/ and invalidates the
 * comments query whenever another client adds/removes a comment on the same
 * target object.
 */
export function useCommentsSocket(targetModel: string, targetId: number | null) {
  const wsRef = useRef<WebSocket | null>(null)
  const token = useAuthStore((s) => s.accessToken)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const qc = useQueryClient()

  useEffect(() => {
    if (!isAuthenticated || !token || !targetId) return

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const host = window.location.host
    const url = `${protocol}//${host}/ws/comments/${targetModel}/${targetId}/?token=${encodeURIComponent(token)}`

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const data: CommentEvent = JSON.parse(event.data)
        if (data.type === "comment") {
          qc.invalidateQueries({ queryKey: ["comments", targetModel, targetId] })
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
  }, [isAuthenticated, token, targetModel, targetId, qc])
}
