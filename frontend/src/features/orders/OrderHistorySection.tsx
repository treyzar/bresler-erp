import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useOrderHistory } from "@/api/hooks/useOrders"

const HISTORY_TYPE_LABELS: Record<string, string> = {
  "+": "Создание",
  "~": "Изменение",
  "-": "Удаление",
}

interface OrderHistorySectionProps {
  orderId: number
}

export function OrderHistorySection({ orderId }: OrderHistorySectionProps) {
  const { data: history, isLoading } = useOrderHistory(orderId)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-muted-foreground text-center">Нет записей истории</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {history.map((record) => (
        <Card key={record.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                {HISTORY_TYPE_LABELS[record.type] ?? record.type}
              </CardTitle>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {record.user && <span>{record.user}</span>}
                <span>{new Date(record.date).toLocaleString("ru")}</span>
              </div>
            </div>
          </CardHeader>
          {record.changes.length > 0 && (
            <CardContent className="pt-0">
              <div className="space-y-1">
                {record.changes.map((change, i) => (
                  <div key={i} className="text-sm">
                    <span className="text-muted-foreground">{change.field}:</span>{" "}
                    <span className="line-through text-destructive/70">{change.old || "—"}</span>
                    {" → "}
                    <span className="font-medium">{change.new || "—"}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  )
}
