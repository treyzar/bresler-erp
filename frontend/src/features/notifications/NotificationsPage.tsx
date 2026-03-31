import { useState } from "react"
import { useNavigate } from "react-router"
import {
  Bell,
  CheckCheck,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  useNotificationList,
  useUnreadCount,
  useMarkRead,
  useMarkAllRead,
} from "@/api/hooks/useNotifications"
import type { Notification } from "@/api/types"
import { formatDistanceToNow } from "@/lib/utils"

const categoryIcons: Record<string, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
}

const categoryColors: Record<string, string> = {
  info: "text-blue-500",
  success: "text-green-500",
  warning: "text-amber-500",
  error: "text-red-500",
}

export function NotificationsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const { data, isLoading } = useNotificationList(page)
  const { data: unreadCount = 0 } = useUnreadCount()
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()

  const notifications = data?.results ?? []
  const totalPages = data ? Math.ceil(data.count / 50) : 1

  const handleClick = (notification: Notification) => {
    if (!notification.is_read) {
      markRead.mutate(notification.id)
    }
    if (notification.link) {
      navigate(notification.link)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="size-6" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Уведомления</h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0
                ? `${unreadCount} непрочитанных`
                : "Все прочитаны"}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
          >
            <CheckCheck className="size-4 mr-2" />
            Прочитать все
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">
            Всего: {data?.count ?? 0}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Загрузка...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Нет уведомлений
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => {
                const Icon = categoryIcons[n.category] || Info
                const color = categoryColors[n.category] || "text-blue-500"

                return (
                  <button
                    key={n.id}
                    className={`w-full text-left px-6 py-4 hover:bg-muted/50 transition-colors flex gap-4 ${
                      !n.is_read ? "bg-muted/30" : ""
                    }`}
                    onClick={() => handleClick(n)}
                  >
                    <Icon className={`size-5 mt-0.5 shrink-0 ${color}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <p
                          className={`text-sm ${!n.is_read ? "font-medium" : ""}`}
                        >
                          {n.title}
                        </p>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(n.created_at)}
                        </span>
                      </div>
                      {n.message && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {n.message}
                        </p>
                      )}
                      {n.target_repr && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {n.target_repr}
                        </p>
                      )}
                    </div>
                    {!n.is_read && (
                      <span className="size-2 rounded-full bg-blue-500 shrink-0 mt-2" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Назад
          </Button>
          <span className="flex items-center text-sm text-muted-foreground px-3">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Вперёд
          </Button>
        </div>
      )}
    </div>
  )
}
